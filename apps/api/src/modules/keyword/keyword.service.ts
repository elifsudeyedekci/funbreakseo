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

export interface AddKeywordsDto {
  phrases: string[];
  location?: string;
  language?: string;
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

    const limits = org.subscription?.plan?.limits as Record<string, number> | null;
    const keywordLimit = limits?.['keywords_tracked'] ?? 50;

    const existingCount = await this.prisma.keyword.count({ where: { projectId } });
    const toAdd = dto.phrases.length;

    if (existingCount + toAdd > keywordLimit) {
      throw new BadRequestException(
        `Adding ${toAdd} keywords would exceed your plan limit of ${keywordLimit}. Currently tracking ${existingCount}.`,
      );
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
    const kw = await this.prisma.keyword.findFirst({ where: { id, projectId } });
    if (!kw) throw new NotFoundException('Keyword not found');
    await this.prisma.keyword.delete({ where: { id } });
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

  // ─── Refresh metrics for all keywords in a project ──────────────────────────

  async refreshAllKeywordMetrics(projectId: string, organizationId: string) {
    await this.assertProjectAccess(projectId, organizationId);

    // Clean up any encoding-corrupted rows before refreshing metrics
    await this.cleanCorruptedKeywords(projectId);

    // Project locale drives DataForSEO location/language (multi-country SaaS).
    const proj = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { country: true, language: true },
    });
    const country = proj?.country ?? 'TR';
    const language = proj?.language ?? 'tr';
    const locationCode = this.dfs.resolveLocationCode(country);

    const keywords = await this.prisma.keyword.findMany({
      where: { projectId },
      select: { id: true, phrase: true, location: true },
    });

    if (keywords.length === 0) return { updated: 0 };

    const batches: typeof keywords[] = [];
    for (let i = 0; i < keywords.length; i += 50) {
      batches.push(keywords.slice(i, i + 50));
    }

    let updated = 0;
    for (const batch of batches) {
      try {
        const phrases = batch.map((k) => k.phrase);
        const [research, difficultyMap] = await Promise.all([
          this.dfs.keywordResearch(phrases, country, language),
          this.dfs.getBulkKeywordDifficulty(phrases, locationCode, language),
        ]);

        const volumeMap: Record<string, typeof research[0]> = {};
        for (const r of research) {
          volumeMap[(r.keyword ?? '').toLowerCase()] = r;
        }

        for (const kw of batch) {
          const key = kw.phrase.toLowerCase();
          const vol = volumeMap[key];
          if (!vol) continue;
          await this.prisma.keyword.update({
            where: { id: kw.id },
            data: {
              searchVolume: vol.search_volume ?? undefined,
              difficulty: difficultyMap.get(key) ?? vol.keyword_difficulty ?? undefined,
              cpc: vol.cpc ?? undefined,
              intent: this.mapIntent(vol.intent ?? undefined),
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
  async getRankedKeywordsForProject(projectId: string, organizationId: string) {
    await this.assertProjectAccess(projectId, organizationId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { domain: true, country: true, language: true },
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
    const ranked = await this.dfs.getRankedKeywordsDetailed(cleanDomain, 300, locationCode, language);
    // Only keywords the domain ACTUALLY ranks for (a known Google position).
    // ranked_keywords always carries a position for genuine rankings; dropping
    // null-position rows prevents "kelimeler we don't rank for" from appearing.
    return ranked
      .filter((k) => k.position != null)
      .filter((k) => this.isRelevantKeyword(k.keyword.toLowerCase(), language));
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
    const tag = await this.prisma.keywordTag.findFirst({
      where: { id: tagId, projectId },
    });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.prisma.keywordTag.delete({ where: { id: tagId } });
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
