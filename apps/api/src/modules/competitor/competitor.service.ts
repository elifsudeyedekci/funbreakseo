import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DataForSeoService } from '../dataforseo/dataforseo.service';

// Generic / non-competitor domains that pollute SERP-based competitor discovery.
// These appear in almost every Turkish SERP but are never a real sector rival.
const GENERIC_DOMAIN_BLOCKLIST = [
  'youtube.com', 'youtu.be', 'facebook.com', 'instagram.com', 'twitter.com',
  'x.com', 'wikipedia.org', 'linkedin.com', 'pinterest.com', 'tiktok.com',
  'google.com', 'google.com.tr', 'amazon.com', 'amazon.com.tr', 'ebay.com',
  'reddit.com', 'medium.com', 'blogspot.com', 'wordpress.com', 'tumblr.com',
  'apple.com', 'microsoft.com', 'whatsapp.com', 'telegram.org', 'quora.com',
  'sahibinden.com', 'hepsiburada.com', 'trendyol.com', 'gittigidiyor.com',
  'n11.com', 'sozluk.gov.tr', 'eksisozluk.com', 'tdk.gov.tr',
  'yandex.com', 'yandex.com.tr', 'maps.yandex.com', 'bing.com',
  'maps.google.com', 'play.google.com', 'foursquare.com', 'yelp.com',
  'booking.com', 'tripadvisor.com', 'tripadvisor.com.tr', 'dailymotion.com',
  'vimeo.com', 'github.com', 'yahoo.com', 'duckduckgo.com',
  // TR aggregators / directories / news / gov that rank for everything and are
  // never a real sector rival.
  'armut.com', 'sahibinden.com', 'letgo.com', 'dolap.com', 'kariyer.net',
  'indeed.com', 'glassdoor.com', 'yenibiris.com', 'eleman.net',
  'hangikredi.com', 'enuygun.com', 'cimri.com', 'akakce.com', 'epey.com',
  'sikayetvar.com', 'sozcu.com.tr', 'hurriyet.com.tr', 'milliyet.com.tr',
  'haberturk.com', 'mynet.com', 'milliyet.com', 'cnnturk.com', 'ntv.com.tr',
  'wikiwand.com', 'webtekno.com', 'donanimhaber.com', 'nesine.com',
  'gov.tr', 'edu.tr', 'bel.tr', 'barobirlik.org.tr', 'turkiye.gov.tr',
];

@Injectable()
export class CompetitorService {
  private readonly logger = new Logger(CompetitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dfs: DataForSeoService,
  ) {}

  private cleanDomain(url: string): string {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').split('/')[0];
  }

  /** True when a domain is a generic platform (not a real sector competitor). */
  private isGenericDomain(domain: string): boolean {
    const d = domain.toLowerCase().replace(/^www\./, '');
    return GENERIC_DOMAIN_BLOCKLIST.some((b) => d === b || d.endsWith(`.${b}`));
  }

  private async getProject(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  /**
   * Read-only list of stored competitors. Used by the page's main query so that
   * deleting a competitor and refetching does NOT re-trigger DataForSEO discovery
   * (which previously resurrected just-deleted rows — the "delete doesn't work" bug).
   */
  async listCompetitors(projectId: string, organizationId: string) {
    const project = await this.getProject(projectId, organizationId);
    const domain = this.cleanDomain(project.domain);
    const dbCompetitors = await this.prisma.competitor.findMany({
      where: { projectId },
      orderBy: { commonKeywords: 'desc' },
    });
    return dbCompetitors
      .filter((c) => !this.isGenericDomain(c.domain) && this.cleanDomain(c.domain) !== domain)
      .map((c) => ({ ...c, etv: null }));
  }

  async findCompetitors(projectId: string, organizationId: string) {
    const project = await this.getProject(projectId, organizationId);
    const domain = this.cleanDomain(project.domain);
    const locationCode = this.dfs.resolveLocationCode(project.country ?? 'TR');
    const language = project.language ?? 'tr';

    // Get from DataForSEO using the PROJECT's country/language (multi-country SaaS)
    const fromDfs = await this.dfs.getCompetitorDomains(domain, 25, locationCode, language);

    // Filter out generic platforms, the project's own domain, AND domains with
    // zero shared keywords (they are not real competitors — this was the
    // "ortak kelime: 0 / alakasız siteler" complaint). If the API returns
    // intersection counts for nobody, fall back to keeping the non-generic ones
    // so the page isn't empty.
    const nonGeneric = fromDfs.filter(
      (c) =>
        c.domain &&
        !this.isGenericDomain(c.domain) &&
        this.cleanDomain(c.domain) !== domain,
    );
    // Real competitors share MANY keywords. Generic big sites (lawyer/insurance
    // directories etc.) share only 1–2 and pollute the list. Keep those whose
    // shared-keyword count is meaningful relative to the strongest competitor.
    const sortedByOverlap = [...nonGeneric].sort((a, b) => (b.intersections ?? 0) - (a.intersections ?? 0));
    const topOverlap = sortedByOverlap[0]?.intersections ?? 0;
    const minOverlap = Math.max(3, Math.round(topOverlap * 0.15));
    const withOverlap = sortedByOverlap.filter((c) => (c.intersections ?? 0) >= minOverlap);
    // Fallbacks so the list isn't empty for very small/new sites.
    const relevant = (withOverlap.length > 0
      ? withOverlap
      : sortedByOverlap.filter((c) => (c.intersections ?? 0) > 0)
    ).slice(0, 15);
    this.logger.log(
      `Competitor filter ${domain}: ${nonGeneric.length} nonGeneric, topOverlap=${topOverlap}, minOverlap=${minOverlap} → ${relevant.length} kept`,
    );

    this.logger.log(
      `Competitor discovery for ${domain}: ${fromDfs.length} raw → ${relevant.length} relevant (filtered ${fromDfs.length - relevant.length} generic/self)`,
    );

    // Purge previously-stored auto competitors that are now known to be generic/self,
    // so old polluted records (e.g. youtube.com) disappear after a re-scan.
    try {
      const stale = await this.prisma.competitor.findMany({
        where: { projectId, isAuto: true },
        select: { id: true, domain: true },
      });
      const staleIds = stale
        .filter((c) => this.isGenericDomain(c.domain) || this.cleanDomain(c.domain) === domain)
        .map((c) => c.id);
      if (staleIds.length > 0) {
        await this.prisma.competitor.deleteMany({ where: { id: { in: staleIds } } });
        this.logger.log(`Purged ${staleIds.length} stale generic competitor records`);
      }
    } catch (err) {
      this.logger.warn('Failed to purge stale competitors', err);
    }

    // Upsert relevant competitors into DB
    for (const c of relevant) {
      try {
        await this.prisma.competitor.upsert({
          where: { projectId_domain: { projectId, domain: c.domain } },
          update: {
            avgPosition: c.avgPosition ?? undefined,
            commonKeywords: c.intersections ?? 0,
            isAuto: true,
          },
          create: {
            projectId,
            domain: c.domain,
            avgPosition: c.avgPosition ?? undefined,
            commonKeywords: c.intersections ?? 0,
            isAuto: true,
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to upsert competitor ${c.domain}`, err);
      }
    }

    // Return merged list (DB + fresh DFS data), excluding any generic leftovers
    const dbCompetitors = await this.prisma.competitor.findMany({
      where: { projectId },
      orderBy: { commonKeywords: 'desc' },
    });

    const dfsMap = new Map(relevant.map((c) => [c.domain, c]));
    return dbCompetitors
      .filter((c) => !this.isGenericDomain(c.domain) && this.cleanDomain(c.domain) !== domain)
      .map((c) => ({
        ...c,
        etv: dfsMap.get(c.domain)?.etv ?? null,
      }));
  }

  /**
   * Build a map of the project's own keywords → its Google position. Combines
   * the tracked keywords table with the domain's live ranked_keywords, so the
   * "common keywords" comparison works even when few keywords are tracked.
   */
  private async getProjectKeywordMap(
    projectId: string, projectDomain: string, locationCode: number, language: string,
  ): Promise<Map<string, number | null>> {
    const map = new Map<string, number | null>();
    const tracked = await this.prisma.keyword.findMany({
      where: { projectId },
      select: { phrase: true, ranks: { orderBy: { checkedAt: 'desc' }, take: 1, select: { position: true } } },
    });
    for (const k of tracked) {
      if (k.phrase) map.set(k.phrase.toLowerCase().trim(), k.ranks?.[0]?.position ?? null);
    }
    try {
      const ranked = await this.dfs.getRankedKeywordsDetailed(projectDomain, 1000, locationCode, language);
      for (const r of ranked) {
        const key = r.keyword.toLowerCase().trim();
        if (!map.has(key)) map.set(key, r.position);
      }
    } catch { /* domain may not rank yet */ }
    return map;
  }

  async compareWithCompetitor(projectId: string, organizationId: string, competitorDomain: string) {
    const project = await this.getProject(projectId, organizationId);
    const domain = this.cleanDomain(project.domain);
    const cleanCompetitor = this.cleanDomain(competitorDomain);
    const locationCode = this.dfs.resolveLocationCode(project.country ?? 'TR');
    const language = project.language ?? 'tr';

    // Real shared keywords: competitor's ranked keywords ∩ our keywords
    // (tracked + ranked). Works for manual competitors too (domain_intersection
    // needed both domains to rank and often returned 0).
    const projMap = await this.getProjectKeywordMap(projectId, domain, locationCode, language);
    const compRanked = await this.dfs.getRankedKeywordsDetailed(cleanCompetitor, 1000, locationCode, language);
    const shared = compRanked
      .filter((c) => projMap.has(c.keyword.toLowerCase().trim()))
      .map((c) => ({
        keyword: c.keyword,
        searchVolume: c.searchVolume ?? 0,
        domain1Position: projMap.get(c.keyword.toLowerCase().trim()) ?? null,
        domain2Position: c.position,
      }));
    return shared;
  }

  async addCompetitor(projectId: string, organizationId: string, domain: string) {
    const project = await this.getProject(projectId, organizationId);
    const cleanDomain = this.cleanDomain(domain);
    const locationCode = this.dfs.resolveLocationCode(project.country ?? 'TR');
    const language = project.language ?? 'tr';
    // Compute real common-keyword count against our keywords so manual
    // competitors don't show "Ortak kelime: 0".
    let commonKeywords = 0;
    try {
      const projMap = await this.getProjectKeywordMap(projectId, this.cleanDomain(project.domain), locationCode, language);
      const compRanked = await this.dfs.getRankedKeywordsDetailed(cleanDomain, 1000, locationCode, language);
      commonKeywords = compRanked.filter((c) => projMap.has(c.keyword.toLowerCase().trim())).length;
    } catch (err) {
      this.logger.warn(`addCompetitor common-keyword calc failed for ${cleanDomain}`, err);
    }
    return this.prisma.competitor.upsert({
      where: { projectId_domain: { projectId, domain: cleanDomain } },
      update: { commonKeywords },
      create: { projectId, domain: cleanDomain, isAuto: false, commonKeywords },
    });
  }

  /** Keywords the competitor domain currently ranks for (location 2792 + tr). */
  async getCompetitorKeywords(projectId: string, organizationId: string, competitorId: string) {
    const project = await this.getProject(projectId, organizationId);
    const locationCode = this.dfs.resolveLocationCode(project.country ?? 'TR');
    const language = project.language ?? 'tr';
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: competitorId, projectId },
    });
    if (!competitor) throw new NotFoundException('Competitor not found');
    // Detailed ranked keywords include the competitor's live Google position.
    // Fetch a high limit so ALL of the competitor's ranking keywords show, not
    // just a handful. Uses the PROJECT's country/language.
    const ranked = await this.dfs.getRankedKeywordsDetailed(this.cleanDomain(competitor.domain), 1000, locationCode, language);
    const projMap = await this.getProjectKeywordMap(projectId, this.cleanDomain(project.domain), locationCode, language);
    const mapped = ranked
      .filter((k) => k.keyword)
      .map((k) => ({
        keyword: k.keyword,
        position: k.position,
        searchVolume: k.searchVolume ?? 0,
        difficulty: k.difficulty ?? 0,
        cpc: k.cpc ?? 0,
        url: k.url,
        // True when WE also target/rank for this keyword (a shared keyword).
        shared: projMap.has(k.keyword.toLowerCase().trim()),
        myPosition: projMap.get(k.keyword.toLowerCase().trim()) ?? null,
      }));
    // Persist the real common-keyword count so the list reflects it.
    const common = mapped.filter((m) => m.shared).length;
    await this.prisma.competitor.updateMany({ where: { id: competitorId, projectId }, data: { commonKeywords: common } }).catch(() => {});
    // Shared keywords first.
    return mapped.sort((a, b) => Number(b.shared) - Number(a.shared));
  }

  /** Diagnostics: what the APP actually receives from DataForSEO for this domain. */
  async diagnose(projectId: string, organizationId: string) {
    const project = await this.getProject(projectId, organizationId);
    return this.dfs.diagnose(project.domain);
  }

  async removeCompetitor(projectId: string, organizationId: string, competitorId: string) {
    await this.getProject(projectId, organizationId);
    // deleteMany is idempotent — never throws if the row is already gone.
    const res = await this.prisma.competitor.deleteMany({ where: { id: competitorId, projectId } });
    if (res.count === 0) throw new NotFoundException('Competitor not found');
    return { message: 'Competitor removed' };
  }
}
