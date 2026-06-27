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

    // Fetch volumes from DataForSEO
    let volumeMap: Record<string, { volume: number; difficulty: number; cpc: number; intent: string }> = {};
    try {
      const research = await this.dfs.keywordResearch(
        dto.phrases,
        dto.location ?? 'Turkey',
      );
      for (const r of research) {
        volumeMap[(r.keyword ?? '').toLowerCase()] = {
          volume: r.search_volume ?? 0,
          difficulty: r.keyword_difficulty ?? 0,
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
        location: dto.location ?? 'Turkey',
        language: dto.language ?? 'tr',
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

    // Queue initial rank checks
    for (const phrase of dto.phrases) {
      await this.rankQueue.add(
        'check-rank',
        { projectId, phrase, location: dto.location ?? 'Turkey' },
        { delay: 0, attempts: 3 },
      );
    }

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
        const location = batch[0].location ?? 'Turkey';
        const research = await this.dfs.keywordResearch(phrases, location);

        const volumeMap: Record<string, typeof research[0]> = {};
        for (const r of research) {
          volumeMap[(r.keyword ?? '').toLowerCase()] = r;
        }

        for (const kw of batch) {
          const vol = volumeMap[kw.phrase.toLowerCase()];
          if (!vol) continue;
          await this.prisma.keyword.update({
            where: { id: kw.id },
            data: {
              searchVolume: vol.search_volume ?? undefined,
              difficulty: vol.keyword_difficulty ?? undefined,
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
      select: { domain: true, name: true },
    });

    if (!project) throw new Error('Project not found');

    const brandName = project.name ?? project.domain.replace(/^https?:\/\//, '').split('.')[0];
    const seedKeywords = [brandName, `${brandName} nedir`, `${brandName} fiyat`, `${brandName} kullanımı`];

    try {
      const research = await this.dfs.keywordResearch(seedKeywords, 'Turkey');
      const related = await this.dfs.getRelatedKeywords(brandName);

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

  // ─── Keyword research via DataForSEO ─────────────────────────────────────────

  async research(
    seedKeywords: string[],
    location: string,
    language: string,
    organizationId: string,
  ) {
    const research = await this.dfs.keywordResearch(seedKeywords, location);
    const related = await Promise.all(
      seedKeywords.slice(0, 3).map((k) => this.dfs.getRelatedKeywords(k)),
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
      'check-rank',
      { projectId: kw.projectId, phrase: kw.phrase, location: kw.location },
      { attempts: 3, priority: 1 },
    );

    return { message: 'Rank check queued', keywordId: id };
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
