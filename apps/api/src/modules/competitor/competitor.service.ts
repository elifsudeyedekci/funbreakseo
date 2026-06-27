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
    const withOverlap = nonGeneric.filter((c) => (c.intersections ?? 0) > 0);
    const relevant = withOverlap.length > 0 ? withOverlap : nonGeneric;

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

  async compareWithCompetitor(projectId: string, organizationId: string, competitorDomain: string) {
    const project = await this.getProject(projectId, organizationId);
    const domain = this.cleanDomain(project.domain);
    const cleanCompetitor = this.cleanDomain(competitorDomain);
    const locationCode = this.dfs.resolveLocationCode(project.country ?? 'TR');
    const language = project.language ?? 'tr';

    return this.dfs.getDomainIntersection(domain, cleanCompetitor, 50, locationCode, language);
  }

  async addCompetitor(projectId: string, organizationId: string, domain: string) {
    await this.getProject(projectId, organizationId);
    const cleanDomain = this.cleanDomain(domain);
    return this.prisma.competitor.upsert({
      where: { projectId_domain: { projectId, domain: cleanDomain } },
      update: {},
      create: { projectId, domain: cleanDomain, isAuto: false },
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
    const ranked = await this.dfs.getRankedKeywordsDetailed(this.cleanDomain(competitor.domain), 300, locationCode, language);
    return ranked
      .filter((k) => k.keyword)
      .map((k) => ({
        keyword: k.keyword,
        position: k.position,
        searchVolume: k.searchVolume ?? 0,
        difficulty: k.difficulty ?? 0,
        cpc: k.cpc ?? 0,
        url: k.url,
      }));
  }

  /** Diagnostics: what the APP actually receives from DataForSEO for this domain. */
  async diagnose(projectId: string, organizationId: string) {
    const project = await this.getProject(projectId, organizationId);
    return this.dfs.diagnose(project.domain);
  }

  async removeCompetitor(projectId: string, organizationId: string, competitorId: string) {
    await this.getProject(projectId, organizationId);
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: competitorId, projectId },
    });
    if (!competitor) throw new NotFoundException('Competitor not found');
    await this.prisma.competitor.delete({ where: { id: competitorId } });
    return { message: 'Competitor removed' };
  }
}
