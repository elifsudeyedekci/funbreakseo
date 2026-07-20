import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DataForSeoService } from '../dataforseo/dataforseo.service';
import {
  KeywordIntent,
  TrackingDepth,
  Prisma,
} from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DEFAULT_PLAN_LIMITS } from '@funbreakseo/shared';
import axios from 'axios';

export interface GscKeywordData {
  phrase: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
  url?: string;
}

export interface AddKeywordsDto {
  phrases: string[];
  location?: string;
  language?: string;
  skipLimit?: boolean;
  gscData?: GscKeywordData[];
  trackingDepth?: TrackingDepth;
  tagId?: string;
}

export interface CreateTagDto {
  name: string;
  color?: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
}

@Injectable()
export class KeywordService {
  private readonly logger = new Logger(KeywordService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dfs: DataForSeoService,
    @InjectQueue('rank-tracking') private readonly rankQueue: Queue,
  ) {}

  // ─── List keywords for project ───────────────────────────────────────────────

  async findAll(projectId: string, organizationId: string) {
    await this.assertProjectAccess(projectId, organizationId);

    return this.prisma.keyword.findMany({
      where: { projectId },
      include: {
        tag: true,
        ranks: {
          take: 1,
          orderBy: { checkedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Bulk add keywords ───────────────────────────────────────────────────────

  async addKeywords(
    projectId: string,
    organizationId: string,
    dto: AddKeywordsDto,
  ) {
    await this.assertProjectAccess(projectId, organizationId);

    // Normalize to NFC and drop encoding-corrupted phrases (U+FFFD / empty)
    dto.phrases = Array.from(
      new Set(
        dto.phrases
          .map((p) => (p ?? '').normalize('NFC').trim())
          .filter((p) => p.length > 0 && !this.isCorrupted(p)),
      ),
    );
    if (dto.phrases.length === 0) {
      throw new BadRequestException('No valid keywords to add');
    }

    // Check plan keyword limit
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { subscription: { include: { plan: true } } },
    });

    if (!dto.skipLimit) {
      const planSlug = (org.subscription?.plan?.slug ?? 'starter') as keyof typeof DEFAULT_PLAN_LIMITS;
      const planLimits = DEFAULT_PLAN_LIMITS[planSlug] ?? DEFAULT_PLAN_LIMITS.starter;
      const keywordLimit = planLimits.keywords;
      const existingCount = await this.prisma.keyword.count({ where: { projectId } });
      if (existingCount + dto.phrases.length > keywordLimit) {
        throw new BadRequestException(
          `Adding ${dto.phrases.length} keywords would exceed your plan limit of ${keywordLimit}. Currently tracking ${existingCount}.`,
        );
      }
    }

    // Resolve the project's country/language so DataForSEO runs in the right
    // locale (multi-country SaaS — never hardcode 2792/tr).
    const proj = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { country: true, language: true },
    });
    const country = dto.location ?? proj?.country ?? 'TR';
    const language = dto.language ?? proj?.language ?? 'tr';
    const locationCode = this.dfs.resolveLocationCode(country);

    // Fetch volumes from DataForSEO
    let volumeMap: Record<string, { volume: number; difficulty: number; cpc: number; intent: string }> = {};
    try {
      const [research, difficultyMap] = await Promise.all([
        this.dfs.keywordResearch(dto.phrases, country, language),
        this.dfs.getBulkKeywordDifficulty(dto.phrases, locationCode, language),
      ]);
      for (const r of research) {
        const key = (r.keyword ?? '').toLowerCase();
        volumeMap[key] = {
          volume: r.search_volume ?? 0,
          difficulty: difficultyMap.get(key) ?? r.keyword_difficulty ?? 0,
          cpc: r.cpc ?? 0,
          intent: r.intent ?? 'INFORMATIONAL',
        };
      }
    } catch (err) {
      this.logger.warn('DataForSEO volume fetch failed during keyword add', err);
    }

    const created: Prisma.KeywordCreateManyInput[] = dto.phrases.map((phrase) => {
      const vol = volumeMap[phrase.toLowerCase()];
      return {
        projectId,
        phrase,
        location: country,
        language,
        searchVolume: vol?.volume,
        difficulty: vol?.difficulty,
        cpc: vol?.cpc,
        intent: this.mapIntent(vol?.intent),
        trackingDepth: dto.trackingDepth ?? 'FIRST_PAGE',
        tagId: dto.tagId,
      };
    });

    const result = await this.prisma.keyword.createMany({
      data: created,
      skipDuplicates: true,
    });

    // If GSC data was supplied, write rank records so positions show immediately
    // without waiting for the rank-tracking worker.
    if (dto.gscData && dto.gscData.length > 0) {
      const phraseSet = new Set(dto.gscData.map((g) => g.phrase.normalize('NFC').trim().toLowerCase()));
      const existingKws = await this.prisma.keyword.findMany({
        where: { projectId, phrase: { in: Array.from(phraseSet) } },
        select: { id: true, phrase: true },
      });
      const phraseToId = new Map(existingKws.map((k) => [k.phrase.toLowerCase(), k.id]));
      const gscMap = new Map(dto.gscData.map((g) => [g.phrase.normalize('NFC').trim().toLowerCase(), g]));
      const rankRecords = [];
      for (const [lc, kwId] of phraseToId) {
        const g = gscMap.get(lc);
        if (!g || !g.position) continue;
        rankRecords.push({
          keywordId: kwId,
          position: Math.round(g.position),
          url: g.url ?? null,
          serpFeatures: { source: 'gsc', clicks: g.clicks, impressions: g.impressions, ctr: g.ctr },
          checkedAt: new Date(),
        });
      }
      if (rankRecords.length > 0) {
        await this.prisma.keywordRank.createMany({ data: rankRecords, skipDuplicates: false });
      }
    }

    // Queue an initial rank check for the whole project. The rank-tracking
    // worker only understands 'check-all' (projectId) / 'check-single'
    // (keywordId) — the previous 'check-rank' job name was silently dropped,
    // which is why positions never populated.
    await this.rankQueue.add(
      'check-all',
      { projectId },
      { attempts: 3 },
    );

    return { created: result.count };
  }

  // ─── Delete keyword ──────────────────────────────────────────────────────────

  async remove(id: string, projectId: string, organizationId: string) {
    await this.assertProjectAccess(projectId, organizationId);
    // Idempotent delete — never throws if the keyword is already gone.
    const res = await this.prisma.keyword.deleteMany({ where: { id, projectId } });
    if (res.count === 0) throw new NotFoundException('Keyword not found');
    return { message: 'Keyword deleted' };
  }

  // ─── Keyword rank history ────────────────────────────────────────────────────

  async getHistory(id: string, organizationId: string) {
    const kw = await this.prisma.keyword.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!kw) throw new NotFoundException('Keyword not found');
    if (kw.project.organizationId !== organizationId) {
      throw new NotFoundException('Keyword not found');
    }

    return this.prisma.keywordRank.findMany({
      where: { keywordId: id },
      orderBy: { checkedAt: 'desc' },
      take: 90,
    });
  }

  // ─── Keyword cannibalization detection ───────────────────────────────────────

  /**
   * Lightweight proxy for cannibalization using data already collected (no new
   * DataForSEO calls): if a keyword's last 20 rank checks show 2+ DISTINCT
   * non-null ranking URLs, Google is alternating which of our own pages it
   * shows for that query — a real cannibalization signal.
   */
  async detectCannibalization(projectId: string, organizationId: string) {
    await this.assertProjectAccess(projectId, organizationId);

    const keywords = await this.prisma.keyword.findMany({
      where: { projectId },
      select: { id: true, phrase: true },
    });
    if (keywords.length === 0) return [];

    // Single query for all rank history (ordered desc), then group in JS —
    // avoids N+1 findMany calls (one per keyword) for projects with many keywords.
    const allRanks = await this.prisma.keywordRank.findMany({
      where: { keywordId: { in: keywords.map((k) => k.id) } },
      select: { keywordId: true, url: true, position: true, checkedAt: true },
      orderBy: { checkedAt: 'desc' },
    });
    const byKeyword = new Map<string, typeof allRanks>();
    for (const r of allRanks) {
      const arr = byKeyword.get(r.keywordId);
      if (arr) {
        if (arr.length < 20) arr.push(r); // keep only the 20 most recent per keyword
      } else {
        byKeyword.set(r.keywordId, [r]);
      }
    }

    const flagged: Array<{
      keyword: string; urls: string[]; mostRecentUrl: string | null;
      mostRecentPosition: number | null; recommendation: string;
    }> = [];

    for (const kw of keywords) {
      const ranks = byKeyword.get(kw.id) ?? [];
      const distinctUrls = Array.from(new Set(ranks.map((r) => r.url).filter((u): u is string => !!u)));
      if (distinctUrls.length < 2) continue;
      flagged.push({
        keyword: kw.phrase,
        urls: distinctUrls,
        mostRecentUrl: ranks[0]?.url ?? null,
        mostRecentPosition: ranks[0]?.position ?? null,
        recommendation:
          `Bu kelimede birden fazla sayfanız Google'da görünmüş: ${distinctUrls.join(', ')}. ` +
          `En güçlü sayfayı seçip diğerlerini bu sayfaya yönlendirin veya farklı bir alt-konuya odaklayın.`,
      });
    }

    return flagged;
  }

  // ─── Internal link opportunities ─────────────────────────────────────────────

  /**
   * Finds pages worth adding internal links to, using only signals the crawler
   * already collected (SiteAuditReport.crawlListJson.orphanPages — a boolean
   * "zero inbound internal links" flag, no per-page link COUNT is stored
   * anywhere). A page is HIGH priority if it's both orphaned AND currently the
   * ranking URL for one of our tracked keywords (a real page losing out on
   * link equity it deserves); plain orphan pages are MEDIUM. Never fabricates
   * a specific missing-link count we don't actually have.
   */
  async getInternalLinkOpportunities(
    projectId: string,
    organizationId: string,
  ): Promise<Array<{ url: string; reason: string; relatedKeyword?: string; priority: 'HIGH' | 'MEDIUM' }>> {
    await this.assertProjectAccess(projectId, organizationId);

    const latestCrawl = await this.prisma.crawlJob.findFirst({
      where: { projectId, status: 'DONE' },
      orderBy: { createdAt: 'desc' },
    });
    if (!latestCrawl) return [];

    const report = await this.prisma.siteAuditReport.findUnique({
      where: { crawlJobId: latestCrawl.id },
      select: { crawlListJson: true },
    });
    const crawlList = (report?.crawlListJson as { orphanPages?: string[] } | null) ?? null;
    const orphanPages = crawlList?.orphanPages ?? [];
    if (orphanPages.length === 0) return [];

    const keywords = await this.prisma.keyword.findMany({
      where: { projectId },
      select: {
        phrase: true,
        searchVolume: true,
        ranks: { take: 1, orderBy: { checkedAt: 'desc' }, select: { url: true } },
      },
    });

    // Map normalized ranking URL → the highest-volume keyword ranking there
    const normalize = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    const rankingUrlMap = new Map<string, { phrase: string; searchVolume: number }>();
    for (const kw of keywords) {
      const url = kw.ranks[0]?.url;
      if (!url) continue;
      const norm = normalize(url);
      const existing = rankingUrlMap.get(norm);
      const volume = kw.searchVolume ?? 0;
      if (!existing || volume > existing.searchVolume) {
        rankingUrlMap.set(norm, { phrase: kw.phrase, searchVolume: volume });
      }
    }

    const opportunities: Array<{ url: string; reason: string; relatedKeyword?: string; priority: 'HIGH' | 'MEDIUM' }> = [];
    for (const url of orphanPages) {
      const match = rankingUrlMap.get(normalize(url));
      if (match) {
        opportunities.push({
          url,
          reason: `Bu sayfa "${match.phrase}" anahtar kelimesi için Google'da sıralanıyor ancak hiçbir sayfadan iç bağlantı almıyor — ekleyin.`,
          relatedKeyword: match.phrase,
          priority: 'HIGH',
        });
      } else {
        opportunities.push({
          url,
          reason: 'Bu sayfaya hiçbir sayfadan iç bağlantı verilmiyor, ekleyin.',
          priority: 'MEDIUM',
        });
      }
    }

    // HIGH first, stable order within each group
    return opportunities.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'HIGH' ? -1 : 1));
  }

  // ─── Refresh metrics for all keywords in a project ──────────────────────────

  async refreshAllKeywordMetrics(projectId: string, organizationId: string) {
    await this.assertProjectAccess(projectId, organizationId);

    await this.cleanCorruptedKeywords(projectId);

    const proj = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { country: true, language: true },
    });
    const country = proj?.country ?? 'TR';
    const language = proj?.language ?? 'tr';
    const locationCode = this.dfs.resolveLocationCode(country);

    // Only refresh keywords that have no search volume yet
    const keywords = await this.prisma.keyword.findMany({
      where: { projectId, searchVolume: null },
      select: { id: true, phrase: true },
    });

    if (keywords.length === 0) return { updated: 0 };

    const BATCH = 1000;
    const batches: typeof keywords[] = [];
    for (let i = 0; i < keywords.length; i += BATCH) {
      batches.push(keywords.slice(i, i + BATCH));
    }

    let updated = 0;
    for (const batch of batches) {
      try {
        const phrases = batch.map((k) => k.phrase);
        const [volumeMap, difficultyMap] = await Promise.all([
          this.dfs.getSearchVolumes(phrases, locationCode, language),
          this.dfs.getBulkKeywordDifficulty(phrases, locationCode, language),
        ]);

        for (const kw of batch) {
          const key = kw.phrase.toLowerCase();
          const vol = volumeMap.get(key);
          const difficulty = difficultyMap.get(key);
          if (!vol && difficulty === undefined) continue;
          await this.prisma.keyword.update({
            where: { id: kw.id },
            data: {
              ...(vol?.searchVolume != null && { searchVolume: vol.searchVolume }),
              ...(vol?.cpc != null && { cpc: vol.cpc }),
              ...(difficulty !== undefined && { difficulty }),
            },
          });
          updated++;
        }
      } catch (err) {
        this.logger.warn('Batch metric refresh failed', err);
      }
    }

    return { updated };
  }

  // ─── Suggest keywords for domain ─────────────────────────────────────────────

  async suggestKeywordsForDomain(projectId: string, organizationId: string) {
    await this.assertProjectAccess(projectId, organizationId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { domain: true, name: true, country: true, language: true },
    });

    if (!project) throw new Error('Project not found');

    const country = project.country ?? 'TR';
    const language = project.language ?? 'tr';
    const locationCode = this.dfs.resolveLocationCode(country);
    const brandName = project.name ?? project.domain.replace(/^https?:\/\//, '').split('.')[0];
    const seedKeywords = [brandName, `${brandName} nedir`, `${brandName} fiyat`, `${brandName} kullanımı`];

    try {
      const research = await this.dfs.keywordResearch(seedKeywords, country, language);
      const related = await this.dfs.getRelatedKeywords(brandName, locationCode, language);

      const combined = [
        ...research.map((r) => ({
          keyword: r.keyword,
          search_volume: r.search_volume,
          keyword_difficulty: r.keyword_difficulty,
          cpc: r.cpc,
          intent: r.intent,
        })),
        ...related.map((r) => ({
          keyword: r.keyword,
          search_volume: r.search_volume,
          keyword_difficulty: r.keyword_difficulty,
          cpc: r.cpc,
          intent: null,
        })),
      ];

      const unique = Array.from(
        new Map(combined.map((k) => [k.keyword, k])).values(),
      ).slice(0, 50);

      return unique;
    } catch (err) {
      this.logger.warn('Keyword suggestion fetch failed', err);
      return [];
    }
  }

  // ─── Discover keywords from domain (no seed needed) ─────────────────────────

  async discoverKeywordsForDomain(projectId: string, organizationId: string) {
    await this.assertProjectAccess(projectId, organizationId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { domain: true, name: true, country: true, language: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const country = project.country ?? 'TR';
    const language = project.language ?? 'tr';
    const locationCode = this.dfs.resolveLocationCode(country);

    const cleanDomain = project.domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .split('/')[0];

    const [siteKeywords, rankedKeywords] = await Promise.all([
      this.dfs.getKeywordsForSite(cleanDomain, 50, locationCode, language),
      this.dfs.getRankedKeywords(cleanDomain, 50, locationCode, language),
    ]);

    const combined = [...siteKeywords, ...rankedKeywords];
    const seen = new Set<string>();
    return combined
      .filter((k) => {
        if (!k.keyword) return false;
        const kw = k.keyword.toLowerCase().trim();
        if (seen.has(kw)) return false;
        if (!this.isRelevantKeyword(kw, language)) return false;
        // Drop purely informational / non-commercial queries — Keşfet should
        // surface keywords that bring customers, not "X nedir / cezası" lookups.
        if (this.isInformationalKeyword(kw)) return false;
        seen.add(kw);
        return true;
      })
      // Commercial-intent keywords first, then by search volume.
      .sort((a, b) => {
        const ca = this.isCommercialKeyword(a.keyword!.toLowerCase()) ? 1 : 0;
        const cb = this.isCommercialKeyword(b.keyword!.toLowerCase()) ? 1 : 0;
        if (ca !== cb) return cb - ca;
        return (b.search_volume ?? 0) - (a.search_volume ?? 0);
      })
      .slice(0, 60);
  }

  /** Ranked keywords the project domain currently appears for on Google (with positions). */
  async getRankedKeywordsForProject(
    projectId: string,
    organizationId: string,
    filters: { maxPosition?: number } = {},
  ) {
    await this.assertProjectAccess(projectId, organizationId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { domain: true, country: true, language: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const { maxPosition } = filters;

    process.stdout.write(`[GSC] getRankedKeywordsForProject — org=${organizationId} project=${projectId}\n`);

    // $queryRaw bypasses Prisma generated-client schema — works even without prisma generate
    let orgGsc: { id: string; gscAccessToken: string | null; gscRefreshToken: string | null; gscTokenExpiry: Date | null } | null = null;
    try {
      const rows = await this.prisma.$queryRaw<Array<{
        id: string; gscAccessToken: string | null; gscRefreshToken: string | null; gscTokenExpiry: Date | null;
      }>>`
        SELECT id, "gscAccessToken", "gscRefreshToken", "gscTokenExpiry"
        FROM organizations WHERE id = ${organizationId} LIMIT 1
      `;
      orgGsc = rows[0] ?? null;
      process.stdout.write(
        `[GSC] token lookup — rows=${rows.length} gscAccessToken=${orgGsc?.gscAccessToken ? 'PRESENT(len=' + orgGsc.gscAccessToken.length + ')' : 'NULL'} gscRefreshToken=${orgGsc?.gscRefreshToken ? 'PRESENT' : 'NULL'}\n`,
      );
    } catch (err) {
      process.stderr.write(`[GSC] $queryRaw failed: ${(err as Error).message}\n`);
    }

    if (orgGsc?.gscAccessToken) {
      process.stdout.write(`[GSC] attempting GSC fetch for org=${organizationId} domain=${project.domain}\n`);
      try {
        // fetchFromGsc already strips position<=0 and impressions<=0
        const gscKeywords = await this.fetchFromGsc(project.domain, orgGsc);
        // maxPosition=0 means no filter; maxPosition>0 means position <= N (position<1 already stripped)
        const filtered = (maxPosition !== undefined && maxPosition > 0)
          ? gscKeywords.filter((k) => k.position <= maxPosition)
          : gscKeywords;
        process.stdout.write(
          `[GSC ranked] valid=${gscKeywords.length} after_filter=${filtered.length} maxPos=${maxPosition ?? '-'}\n`,
        );
        // Return even if 0 — do NOT fall through to DataForSEO when GSC is connected
        return filtered;
      } catch (err) {
        process.stderr.write(`[GSC] fetchFromGsc threw: ${(err as Error).message}\n`);
        this.logger.warn('GSC fetch failed, falling back to DataForSEO', err);
      }
    } else {
      process.stdout.write(`[GSC] no token found — skipping GSC, using DataForSEO fallback\n`);
    }

    // Fallback: DataForSEO ranked_keywords/live
    const country = project.country ?? 'TR';
    const language = project.language ?? 'tr';
    const locationCode = this.dfs.resolveLocationCode(country);
    const cleanDomain = project.domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .split('/')[0];
    const ranked = await this.dfs.getRankedKeywordsDetailed(cleanDomain, 1000, locationCode, language);
    return ranked
      .filter((k) => {
        if (!k.position || !k.keyword || this.isCorrupted(k.keyword)) return false;
        if (maxPosition !== undefined && k.position > maxPosition) return false;
        return true;
      })
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
  }

  private async refreshGscToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    });
    return data as { access_token: string; expires_in: number };
  }

  private async fetchFromGsc(
    domain: string,
    org: { id: string; gscAccessToken: string | null; gscRefreshToken: string | null; gscTokenExpiry: Date | null },
  ): Promise<Array<{ keyword: string; position: number; searchVolume: number; difficulty: number; cpc: number; url: null; clicks: number; impressions: number; ctr: number }>> {
    let token = org.gscAccessToken;
    const expiryMs = org.gscTokenExpiry ? org.gscTokenExpiry.getTime() : 0;

    // Refresh if missing or expiring within 5 minutes
    if (!token || expiryMs < Date.now() + 5 * 60 * 1000) {
      if (!org.gscRefreshToken) return [];
      const refreshed = await this.refreshGscToken(org.gscRefreshToken);
      token = refreshed.access_token;
      const newExpiry = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000);
      await this.prisma.$executeRaw`
        UPDATE organizations
        SET "gscAccessToken" = ${token}, "gscTokenExpiry" = ${newExpiry}, "updatedAt" = NOW()
        WHERE id = ${org.id}
      `;
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    const siteUrl = `sc-domain:${cleanDomain}`;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data } = await axios.post(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      { startDate, endDate, dimensions: ['query'], rowLimit: 1000 },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const rawRows = (data as { rows?: unknown[] }).rows ?? [];
    process.stdout.write(`[GSC fetchFromGsc] domain=${cleanDomain} total_rows=${rawRows.length}\n`);

    const results: Array<{ keyword: string; position: number; searchVolume: number; difficulty: number; cpc: number; url: null; clicks: number; impressions: number; ctr: number }> = [];
    let skippedZeroPos = 0;
    let skippedZeroImp = 0;

    for (const row of rawRows) {
      const r = row as { keys: string[]; position: number; clicks: number; impressions: number; ctr: number };
      const position = r.position;       // keep as float for comparison
      const impressions = r.impressions; // keep as float for comparison
      if (position <= 0) { skippedZeroPos++; continue; }
      if (impressions <= 0) { skippedZeroImp++; continue; }
      results.push({
        keyword: r.keys[0],
        position: Math.round(position),
        searchVolume: 0,
        difficulty: 0,
        cpc: 0,
        url: null,
        clicks: Math.round(r.clicks),
        impressions: Math.round(impressions),
        ctr: parseFloat((r.ctr * 100).toFixed(2)),
      });
    }

    process.stdout.write(
      `[GSC fetchFromGsc] after base filter: kept=${results.length} skipped_pos0=${skippedZeroPos} skipped_imp0=${skippedZeroImp}\n`,
    );
    return results;
  }

  /** Informational/non-commercial query patterns (Turkish) to exclude from Keşfet. */
  private isInformationalKeyword(kw: string): boolean {
    return /\b(nedir|ne demek|ne demektir|nasıl|neden|niçin|kaç promil|kaç para|cezası|ceza|sınırı|sınır|yasak|kanunu?|maddesi|hakkında|anlamı|belirtileri|nedenleri|tarihi|kimdir|örnekleri|hesaplama)\b/.test(kw);
  }

  /** Commercial/transactional intent signals (Turkish) to prioritise in Keşfet. */
  private isCommercialKeyword(kw: string): boolean {
    return /\b(hizmeti?|fiyat|fiyatı|fiyatları|ücret|ucuz|kirala|kiralama|kiralık|şoför|servis|fir ?ma|firması|şirketi?|en iyi|önerilen|sipariş|satın al|rezervasyon|randevu|7\/24|istanbul|ankara|izmir|bursa|antalya)\b/.test(kw);
  }

  /**
   * Heuristic relevance/language filter for domain keyword discovery.
   * Drops foreign-script junk (Cyrillic/Arabic/CJK), bare numbers/URLs and
   * single-character noise so the Keşfet list stays meaningful for TR/Latin sites.
   */
  private isRelevantKeyword(kw: string, language = 'tr'): boolean {
    if (kw.length < 3 || kw.length > 80) return false;
    // Reject encoding-corrupted / mojibake keywords
    if (this.isCorrupted(kw)) return false;
    // Reject raw URLs / domains accidentally returned as keywords
    if (/^https?:\/\//.test(kw) || /\.(com|net|org|io)\b/.test(kw)) return false;

    // Script handling is language-aware (multi-country SaaS). For non-Latin
    // project languages we REQUIRE the native script; for Latin languages we
    // reject non-Latin scripts as junk.
    const lang = (language || 'tr').toLowerCase();
    const scripts: Record<string, RegExp> = {
      ar: /[؀-ۿ]/,           // Arabic
      ru: /[Ѐ-ӿ]/,           // Cyrillic
      hi: /[ऀ-ॿ]/,           // Devanagari
      zh: /[一-鿿]/,          // CJK
      ja: /[぀-ヿ一-鿿]/,
      ko: /[가-힯]/,
    };
    if (scripts[lang]) {
      return scripts[lang].test(kw);
    }
    // Latin-based languages (tr/en/de/fr/es/…): reject obvious foreign scripts
    if (/[Ѐ-ӿ؀-ۿ一-鿿぀-ヿ가-힯]/.test(kw)) return false;
    // Must contain at least one Latin/diacritic letter, not just digits/symbols
    if (!/[a-zàâäçéèêëîïôöùûüğışöüñãõ]/i.test(kw)) return false;
    return true;
  }

  // ─── Keyword research via DataForSEO ─────────────────────────────────────────

  async research(
    seedKeywords: string[],
    location: string,
    language: string,
    organizationId: string,
  ) {
    const locationCode = this.dfs.resolveLocationCode(location);
    const research = await this.dfs.keywordResearch(seedKeywords, location, language);
    const related = await Promise.all(
      seedKeywords.slice(0, 3).map((k) => this.dfs.getRelatedKeywords(k, locationCode, language)),
    );

    return {
      keywordData: research,
      relatedKeywords: related.flat().slice(0, 50),
    };
  }

  // ─── Project keyword summary ─────────────────────────────────────────────────

  async getSummary(projectId: string, organizationId: string) {
    await this.assertProjectAccess(projectId, organizationId);

    const keywords = await this.prisma.keyword.findMany({
      where: { projectId },
      include: {
        ranks: { take: 1, orderBy: { checkedAt: 'desc' } },
      },
    });

    const distribution = {
      top3: 0,
      top10: 0,
      top20: 0,
      top50: 0,
      top100: 0,
      notRanked: 0,
    };

    let totalPosition = 0;
    let rankedCount = 0;

    for (const kw of keywords) {
      const pos = kw.ranks[0]?.position;
      if (!pos) {
        distribution.notRanked++;
        continue;
      }
      totalPosition += pos;
      rankedCount++;
      if (pos <= 3) distribution.top3++;
      else if (pos <= 10) distribution.top10++;
      else if (pos <= 20) distribution.top20++;
      else if (pos <= 50) distribution.top50++;
      else distribution.top100++;
    }

    const avgPosition =
      rankedCount > 0 ? +(totalPosition / rankedCount).toFixed(1) : null;

    // Visibility score: weighted sum
    const visibilityScore = Math.min(
      100,
      Math.round(
        ((distribution.top3 * 10 +
          distribution.top10 * 5 +
          distribution.top20 * 2 +
          distribution.top50 * 1) /
          Math.max(keywords.length, 1)) *
          10,
      ),
    );

    return {
      total: keywords.length,
      ranked: rankedCount,
      avgPosition,
      visibilityScore,
      distribution,
    };
  }

  // ─── Refresh rank (queue immediate check) ────────────────────────────────────

  async refreshRank(id: string, organizationId: string) {
    const kw = await this.prisma.keyword.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!kw || kw.project.organizationId !== organizationId) {
      throw new NotFoundException('Keyword not found');
    }

    await this.rankQueue.add(
      'check-single',
      { keywordId: id },
      { attempts: 3, priority: 1 },
    );

    return { message: 'Rank check queued', keywordId: id };
  }

  // ─── Refresh ranks for all keywords in a project (bulk SERP positions) ───────

  async refreshAllRanks(projectId: string, organizationId: string) {
    await this.assertProjectAccess(projectId, organizationId);
    await this.rankQueue.add('check-all', { projectId }, { attempts: 3, priority: 1 });
    return { message: 'Bulk rank check queued', projectId };
  }

  // ─── Keyword Tags ─────────────────────────────────────────────────────────────

  async getTags(projectId: string, organizationId: string) {
    await this.assertProjectAccess(projectId, organizationId);
    return this.prisma.keywordTag.findMany({
      where: { projectId },
      include: { _count: { select: { keywords: true } } },
    });
  }

  async createTag(projectId: string, organizationId: string, dto: CreateTagDto) {
    await this.assertProjectAccess(projectId, organizationId);
    return this.prisma.keywordTag.create({
      data: { projectId, name: dto.name, color: dto.color ?? '#5B8DEF' },
    });
  }

  async updateTag(
    tagId: string,
    projectId: string,
    organizationId: string,
    dto: UpdateTagDto,
  ) {
    await this.assertProjectAccess(projectId, organizationId);
    const tag = await this.prisma.keywordTag.findFirst({
      where: { id: tagId, projectId },
    });
    if (!tag) throw new NotFoundException('Tag not found');
    return this.prisma.keywordTag.update({ where: { id: tagId }, data: dto });
  }

  async deleteTag(tagId: string, projectId: string, organizationId: string) {
    await this.assertProjectAccess(projectId, organizationId);
    const res = await this.prisma.keywordTag.deleteMany({ where: { id: tagId, projectId } });
    if (res.count === 0) throw new NotFoundException('Tag not found');
    return { message: 'Tag deleted' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async assertProjectAccess(
    projectId: string,
    organizationId: string,
  ): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
  }

  /**
   * Detects encoding-corrupted keyword strings: Unicode replacement char or
   * common UTF-8/Latin-1 mojibake sequences (e.g. "Ã§", "Ä±", "Å").
   */
  private isCorrupted(phrase: string): boolean {
    if (phrase.includes('�')) return true;
    if (/Ã.|Ä.|Å.| Â/.test(phrase)) return true;
    return false;
  }

  /** Removes encoding-corrupted keyword rows from a project (one-shot cleanup). */
  async cleanCorruptedKeywords(projectId: string) {
    const all = await this.prisma.keyword.findMany({
      where: { projectId },
      select: { id: true, phrase: true },
    });
    const badIds = all.filter((k) => this.isCorrupted(k.phrase)).map((k) => k.id);
    if (badIds.length > 0) {
      await this.prisma.keyword.deleteMany({ where: { id: { in: badIds } } });
      this.logger.log(`Removed ${badIds.length} corrupted keyword(s) from project ${projectId}`);
    }
    return badIds.length;
  }

  private mapIntent(intent?: string): KeywordIntent {
    const map: Record<string, KeywordIntent> = {
      informational: 'INFORMATIONAL',
      navigational: 'NAVIGATIONAL',
      transactional: 'TRANSACTIONAL',
      commercial: 'COMMERCIAL',
    };
    return map[intent?.toLowerCase() ?? ''] ?? 'INFORMATIONAL';
  }
}
