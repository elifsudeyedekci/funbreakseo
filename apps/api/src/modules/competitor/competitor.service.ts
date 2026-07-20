import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DataForSeoService } from '../dataforseo/dataforseo.service';
import { PerformanceService } from '../performance/performance.service';
import { SiteIntelService } from '../site-intel/site-intel.service';
import { GeoAuditService } from '../geo/geo-audit.service';
import { PlanLimitService } from '../plan-limit/plan-limit.service';
import { scoreToLetterGrade } from '@funbreakseo/shared';

// Generic / non-competitor domains that pollute SERP-based competitor discovery.
// These appear in almost every Turkish SERP but are never a real sector rival.
const GENERIC_DOMAIN_BLOCKLIST = [
  // Social media
  'youtube.com', 'youtu.be', 'facebook.com', 'instagram.com', 'twitter.com',
  'x.com', 'linkedin.com', 'pinterest.com', 'tiktok.com', 'snapchat.com',
  'reddit.com', 'tumblr.com', 'twitch.tv', 'discord.com', 'threads.net',

  // Search / maps / browsers
  'google.com', 'google.com.tr', 'bing.com', 'yahoo.com', 'duckduckgo.com',
  'yandex.com', 'yandex.com.tr', 'maps.yandex.com', 'maps.google.com',
  'foursquare.com', 'yelp.com',

  // Music & streaming
  'spotify.com', 'open.spotify.com', 'soundcloud.com', 'music.apple.com',
  'deezer.com', 'tidal.com', 'bandcamp.com', 'last.fm', 'musixmatch.com',
  'shazam.com', 'youtube.com', 'vimeo.com', 'dailymotion.com',
  'podcast.com', 'anchor.fm', 'spreaker.com',

  // E-commerce & marketplaces
  'amazon.com', 'amazon.com.tr', 'ebay.com', 'etsy.com',
  'hepsiburada.com', 'trendyol.com', 'gittigidiyor.com', 'n11.com',
  'ciceksepeti.com', 'morhipo.com', 'boyner.com.tr', 'mavi.com',

  // Food delivery / restaurant
  'yemeksepeti.com', 'getir.com', 'migros.com.tr', 'a101.com.tr',
  'bim.com.tr', 'şok.com.tr', 'carrefoursa.com.tr', 'toserve.com',
  'restoran.com.tr', 'tripadvisor.com', 'tripadvisor.com.tr',

  // Travel / transport / airport
  'booking.com', 'airbnb.com', 'hotels.com', 'expedia.com',
  'enuygun.com', 'obilet.com', 'biletall.com', 'jolly.com.tr',
  'sabihagokcen.aero', 'istairport.com', 'dhmi.gov.tr', 'thy.com',
  'turkishairlines.com', 'sunexpress.com', 'pegasusairlines.com',

  // Software / SaaS / dev tools (generic, not sector rivals)
  'github.com', 'gitlab.com', 'stackoverflow.com', 'medium.com',
  'blogspot.com', 'wordpress.com', 'wix.com', 'squarespace.com',
  'shopify.com', 'webflow.com', 'framer.com', 'notion.so',
  'akinsoft.com', 'akinsoft.com.tr', 'qrmenu.akinsoft.com.tr',
  'logo.com.tr', 'mikro.com.tr', 'netsis.com.tr', 'paraşüt.com',
  'ikas.com', 'tsoft.com.tr', 'softtech.com.tr',

  // Messaging / communication
  'whatsapp.com', 'telegram.org', 'zoom.us', 'teams.microsoft.com',
  'slack.com', 'skype.com',

  // Tech / hardware
  'apple.com', 'microsoft.com', 'samsung.com', 'sony.com',

  // Knowledge / reference
  'wikipedia.org', 'wikiwand.com', 'quora.com', 'sozluk.gov.tr',
  'eksisozluk.com', 'tdk.gov.tr', 'play.google.com',

  // News / media (TR)
  'sozcu.com.tr', 'hurriyet.com.tr', 'milliyet.com.tr', 'milliyet.com',
  'haberturk.com', 'mynet.com', 'cnnturk.com', 'ntv.com.tr',
  'sabah.com.tr', 'cumhuriyet.com.tr', 'posta.com.tr', 'habertürk.com',
  'webtekno.com', 'donanimhaber.com', 'shiftdelete.net', 'chip.com.tr',

  // Job boards / HR
  'kariyer.net', 'indeed.com', 'glassdoor.com', 'yenibiris.com', 'eleman.net',
  'linkedin.com',

  // Finance / comparison
  'hangikredi.com', 'cimri.com', 'akakce.com', 'epey.com',

  // Classifieds / local
  'sahibinden.com', 'letgo.com', 'dolap.com', 'armut.com',

  // Misc TR
  'nesine.com', 'bilyoner.com', 'misli.com', 'sikayetvar.com',

  // Gov / edu / org
  'gov.tr', 'edu.tr', 'bel.tr', 'turkiye.gov.tr', 'barobirlik.org.tr',
];

@Injectable()
export class CompetitorService {
  private readonly logger = new Logger(CompetitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dfs: DataForSeoService,
    private readonly performance: PerformanceService,
    private readonly siteIntel: SiteIntelService,
    private readonly geoAudit: GeoAuditService,
    private readonly planLimit: PlanLimitService,
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
    const results = dbCompetitors
      .filter((c) => !this.isGenericDomain(c.domain) && this.cleanDomain(c.domain) !== domain)
      .map((c) => ({ ...c, etv: null }));
    // Same relaxation as findCompetitors()'s final return: a hard
    // commonKeywords>=2 filter with no fallback could hide EVERY discovered
    // competitor when the SERP-overlap discovery had to fall back to a
    // frequency-1 threshold (common for smaller sites) — that mismatch was
    // the "full scan found 23, competitors page shows 0" bug. Keep both
    // methods reporting the same set.
    const strict = results.filter((c) => !c.isAuto || c.commonKeywords >= 2);
    return strict.length >= 10 ? strict : results;
  }

  async findCompetitors(projectId: string, organizationId: string) {
    const project = await this.getProject(projectId, organizationId);
    const domain = this.cleanDomain(project.domain);
    const country = project.country ?? 'TR';
    const locationCode = this.dfs.resolveLocationCode(country);
    const language = project.language ?? 'tr';

    // 1. Seed keywords = the project's OWN well-ranking keywords (pos 1-20),
    //    falling back to the tracked keywords table.
    let projectRanked: Array<{ keyword: string; position: number | null }> = [];
    try {
      projectRanked = await this.dfs.getRankedKeywordsDetailed(domain, 200, locationCode, language);
    } catch (err) { this.logger.warn('findCompetitors: project ranked fetch failed', err); }

    let seeds = projectRanked
      .filter((r) => r.position != null && r.position <= 20)
      .map((r) => r.keyword);
    if (seeds.length === 0) {
      const tracked = await this.prisma.keyword.findMany({ where: { projectId }, select: { phrase: true } });
      seeds = tracked.map((t) => t.phrase).filter(Boolean);
    }
    seeds = Array.from(new Set(seeds.map((s) => s.toLowerCase().trim()))).slice(0, 20);

    // 2. For each seed keyword, read the SERP and collect the OTHER domains that
    //    rank for it. Frequency across seeds = number of shared keywords. This is
    //    how real sector rivals surface (vs competitors_domain returning random
    //    high-authority sites).
    const domainCount = new Map<string, number>();
    let serpOk = 0;
    let serpFail = 0;
    for (const kw of seeds) {
      try {
        const serp = await this.dfs.searchSerp(kw, country, language, 20);
        serpOk++;
        const seenInThis = new Set<string>();
        for (const item of serp) {
          if (item.type !== 'organic' || !item.domain) continue;
          const d = this.cleanDomain(item.domain);
          if (!d || d === domain || this.isGenericDomain(d) || seenInThis.has(d)) continue;
          seenInThis.add(d);
          domainCount.set(d, (domainCount.get(d) ?? 0) + 1);
        }
      } catch (err) {
        serpFail++;
        this.logger.warn(`findCompetitors SERP failed for "${kw}"`, err);
      }
    }

    process.stdout.write(
      `[Competitors] ${domain}: seeds=${seeds.length} serp_ok=${serpOk} serp_fail=${serpFail} unique_domains=${domainCount.size}\n`,
    );

    // Adaptive threshold: lower to 1 if strict filter yields < 10 results
    const strictList = [...domainCount.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]);
    const discovered = (strictList.length >= 10 ? strictList : [...domainCount.entries()].sort((a, b) => b[1] - a[1]))
      .slice(0, 25);

    process.stdout.write(
      `[Competitors] discovered=${discovered.length} (threshold=${strictList.length >= 10 ? 2 : 1}) top=${discovered.slice(0, 5).map(([d, c]) => `${d}:${c}`).join(', ')}\n`,
    );

    // 3. Replace old AUTO competitors with the fresh SERP-based set.
    try { await this.prisma.competitor.deleteMany({ where: { projectId, isAuto: true } }); }
    catch (err) { this.logger.warn('purge auto competitors failed', err); }

    for (const [d, count] of discovered) {
      try {
        await this.prisma.competitor.upsert({
          where: { projectId_domain: { projectId, domain: d } },
          update: { commonKeywords: count, isAuto: true },
          create: { projectId, domain: d, commonKeywords: count, isAuto: true },
        });
      } catch (err) { this.logger.warn(`upsert competitor ${d} failed`, err); }
    }

    // 4. Recompute MANUAL competitors' common-keyword counts too (so they don't
    //    show 0). Prefer the SERP frequency; else compare their ranked keywords.
    const projectMap = new Map<string, number | null>();
    for (const k of (await this.prisma.keyword.findMany({ where: { projectId }, select: { phrase: true } }))) {
      if (k.phrase) projectMap.set(k.phrase.toLowerCase().trim(), null);
    }
    for (const r of projectRanked) projectMap.set(r.keyword.toLowerCase().trim(), r.position);
    const manual = await this.prisma.competitor.findMany({ where: { projectId, isAuto: false } });
    for (const m of manual) {
      const md = this.cleanDomain(m.domain);
      let count = domainCount.get(md) ?? 0;
      if (count === 0) {
        try {
          const compRanked = await this.dfs.getRankedKeywordsDetailed(md, 1000, locationCode, language);
          count = compRanked.filter((c) => projectMap.has(c.keyword.toLowerCase().trim())).length;
        } catch (err) { this.logger.warn(`manual competitor ${md} recompute failed`, err); }
      }
      await this.prisma.competitor.updateMany({ where: { id: m.id }, data: { commonKeywords: count } }).catch(() => {});
    }

    const dbCompetitors = await this.prisma.competitor.findMany({
      where: { projectId },
      orderBy: { commonKeywords: 'desc' },
    });
    const results = dbCompetitors
      .filter((c) => !this.isGenericDomain(c.domain) && this.cleanDomain(c.domain) !== domain)
      .map((c) => ({ ...c, etv: null }));
    // If fewer than 10 after strict filter, relax commonKeywords requirement
    const strict = results.filter((c) => !c.isAuto || c.commonKeywords >= 2);
    return strict.length >= 10 ? strict : results;
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

  // ─── Full-audit comparison (radar chart, "you vs competitor") ──────────────

  private toScore(raw: number) {
    const score = Math.max(0, Math.min(100, Math.round(raw)));
    return { score, grade: scoreToLetterGrade(score) };
  }

  private penaltyScore(recs: { priority: 'CRITICAL' | 'MEDIUM' | 'LOW' }[]): number {
    let score = 100;
    for (const r of recs) {
      if (r.priority === 'CRITICAL') score -= 8;
      else if (r.priority === 'MEDIUM') score -= 4;
      else score -= 1;
    }
    return Math.max(0, score);
  }

  /**
   * Runs the same performance/site-intel/GEO analyzers used for the project's
   * own audit against an arbitrary competitor domain — pure, no DB writes for
   * the competitor side — and returns a "you vs competitor" comparison payload
   * ready for the radar chart + side-by-side table.
   */
  async compareFullAudit(projectId: string, organizationId: string, competitorDomain: string) {
    const project = await this.getProject(projectId, organizationId);
    await this.planLimit.assertFeatureWithinLimit(organizationId, 'COMPETITOR_COMPARE');

    const latestCrawl = await this.prisma.crawlJob.findFirst({
      where: { projectId, status: 'DONE' },
      orderBy: { finishedAt: 'desc' },
      include: { siteAuditReport: true },
    });
    if (!latestCrawl?.siteAuditReport?.overallScore) {
      throw new NotFoundException(
        'SCAN_REQUIRED: Karşılaştırma için önce bu proje üzerinde bir site denetimi (audit) çalıştırmalısınız.',
      );
    }
    const own = latestCrawl.siteAuditReport;

    const competitorHost = this.cleanDomain(competitorDomain);
    const competitorUrl = `https://${competitorHost}`;

    const [perf, intel, geo, backlinks] = await Promise.allSettled([
      this.performance.analyze(competitorUrl),
      this.siteIntel.analyze(competitorUrl),
      this.geoAudit.analyzeGeoAudit(competitorUrl),
      this.dfs.getBacklinks(competitorHost),
    ]);

    const perfReport = perf.status === 'fulfilled' ? perf.value : null;
    const intelReport = intel.status === 'fulfilled' ? intel.value : null;
    const geoReport = geo.status === 'fulfilled' ? geo.value : null;
    const backlinkProfile = backlinks.status === 'fulfilled' ? backlinks.value : null;

    const psiMobile = perfReport?.psi?.mobile?.score;
    const psiDesktop = perfReport?.psi?.desktop?.score;
    const compPerfScore =
      typeof psiMobile === 'number' && typeof psiDesktop === 'number'
        ? psiMobile * 0.6 + psiDesktop * 0.4
        : (psiMobile ?? psiDesktop ?? (perfReport ? this.penaltyScore(perfReport.recommendations) : 50));

    const compUsabilityScore = intelReport
      ? this.penaltyScore([
          ...intelReport.usability.recommendations,
          ...intelReport.social.recommendations,
          ...intelReport.technology.recommendations,
          ...intelReport.localSeo.recommendations,
        ])
      : 50;

    const compBacklinkScore = backlinkProfile ? Math.min(100, Math.round((backlinkProfile.domain_rank ?? 0) / 10)) : 0;
    const compGeoScore = geoReport?.eeat?.score ?? 0;

    const competitorCategoryScores = {
      onPage: this.toScore(50), // no full crawl run for competitor — on-page needs a multi-page crawl we don't run here
      geo: this.toScore(compGeoScore),
      backlink: this.toScore(compBacklinkScore),
      usability: this.toScore(compUsabilityScore),
      performance: this.toScore(compPerfScore),
    };
    const competitorOverall = Math.round(
      competitorCategoryScores.onPage.score * 0.25 +
        competitorCategoryScores.geo.score * 0.15 +
        competitorCategoryScores.backlink.score * 0.2 +
        competitorCategoryScores.usability.score * 0.2 +
        competitorCategoryScores.performance.score * 0.2,
    );

    await this.planLimit.recordFeatureUsage(organizationId, 'COMPETITOR_COMPARE', projectId);

    return {
      you: {
        domain: project.domain,
        overallScore: own.overallScore,
        overallGrade: own.overallGrade,
        categoryScores: own.categoryScores,
      },
      competitor: {
        domain: competitorHost,
        overallScore: competitorOverall,
        overallGrade: scoreToLetterGrade(competitorOverall),
        categoryScores: competitorCategoryScores,
        note: 'onPage skoru rakip için tahmini — tam sayfa taraması yalnızca kendi projeniz için çalıştırılır.',
      },
    };
  }
}
