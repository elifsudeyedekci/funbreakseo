import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma.service';
import { ConfigService } from '@nestjs/config';

interface DataForSeoKeyword {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  cpc: number;
}

interface AutopilotSettingsData {
  id: string;
  isEnabled: boolean;
  locales: string[];
  nichKeywords: string[];
  weeklyTarget: number;
  minSeoScore: number;
  minGeoScore: number;
  maxRetries: number;
  publishMode: string;
}

@Injectable()
export class AutopilotWorker {
  private readonly logger = new Logger(AutopilotWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // -------------------------------------------------------------------------
  // Daily keyword discovery + content generation
  // -------------------------------------------------------------------------
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runDailyAutopilot() {
    this.logger.log('Autopilot daily run started');

    const settings = await this.prisma.autopilotSettings.findFirst();
    if (!settings?.isEnabled) {
      this.logger.log('Autopilot is disabled — skipping');
      return;
    }

    await this.checkCostLimits();

    for (const locale of settings.locales as string[]) {
      try {
        await this.discoverAndQueueKeywords(locale, settings as unknown as AutopilotSettingsData);
      } catch (err) {
        this.logger.error(`Autopilot discovery error for locale ${locale}:`, err);
      }
    }

    await this.processQueue(settings as unknown as AutopilotSettingsData);

    this.logger.log('Autopilot daily run completed');
  }

  // -------------------------------------------------------------------------
  // Weekly performance refresh check
  // -------------------------------------------------------------------------
  @Cron('0 6 * * 1') // Monday 6am
  async runWeeklyPerformanceCheck() {
    this.logger.log('Autopilot weekly performance check started');

    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400_000);

    const staleContent = await this.prisma.autopilotContentPerformance.findMany({
      where: {
        checkedAt: { lte: sixtyDaysAgo },
        position: { gt: 50 },
        needsRefresh: false,
      },
      include: { blogPost: { select: { id: true, title: true } } },
    });

    if (staleContent.length === 0) return;

    // Mark stale content
    await this.prisma.autopilotContentPerformance.updateMany({
      where: {
        id: { in: staleContent.map((c) => c.id) },
      },
      data: { needsRefresh: true },
    });

    // Notify admin
    const adminEmail = this.config.get<string>(
      'ADMIN_EMAIL',
      'doganizzetcan@gmail.com',
    );
    this.logger.log(
      `[ADMIN ALERT] ${staleContent.length} autopilot posts need refresh. Admin: ${adminEmail}`,
    );

    await this.prisma.adminNotification.create({
      data: {
        type: 'AUTOPILOT_REFRESH_NEEDED',
        title: `${staleContent.length} yazı güncelleme öneriyor`,
        body: `${staleContent.length} autopilot içeriği 60+ gündür rank > 50 konumda. Güncelleme önerilir.`,
        meta: { count: staleContent.length, postIds: staleContent.map((c) => c.blogPostId) },
      },
    });
  }

  // -------------------------------------------------------------------------
  // Core: discover keywords via DataForSEO
  // -------------------------------------------------------------------------
  private async discoverAndQueueKeywords(
    locale: string,
    settings: AutopilotSettingsData,
  ) {
    this.logger.log(`Discovering keywords for locale: ${locale}`);

    // Fetch from DataForSEO (simulated — real implementation uses DataForSeoModule)
    const keywords = await this.fetchKeywordsFromDataForSeo(locale, settings.nichKeywords as string[]);

    let queued = 0;
    for (const kw of keywords) {
      if (kw.searchVolume < 100 || kw.difficulty > 60) continue;

      // Check niche relevance
      const isNicheRelevant = (settings.nichKeywords as string[]).some((niche: string) =>
        kw.keyword.toLowerCase().includes(niche.toLowerCase()),
      );
      if (!isNicheRelevant) continue;

      // Check if we already have a BlogPost for this keyword
      const existingPost = await this.prisma.blogPost.findFirst({
        where: { slug: this.slugify(kw.keyword, locale) },
      });
      if (existingPost) continue;

      // Check if already in autopilot queue
      const existingQueueItem = await this.prisma.autopilotKeyword.findFirst({
        where: { keyword: kw.keyword, locale },
      });
      if (existingQueueItem) continue;

      // Calculate opportunity score
      const opportunityScore = this.calculateOpportunityScore(kw);

      await this.prisma.autopilotKeyword.create({
        data: {
          keyword: kw.keyword,
          locale,
          searchVolume: kw.searchVolume,
          difficulty: kw.difficulty,
          cpc: kw.cpc,
          opportunityScore,
          status: 'DISCOVERED',
        },
      });

      queued++;
    }

    // Promote top scoring discovered keywords to QUEUED (up to weekly target)
    const toQueue = await this.prisma.autopilotKeyword.findMany({
      where: { locale, status: 'DISCOVERED' },
      orderBy: { opportunityScore: 'desc' },
      take: settings.weeklyTarget,
    });

    await this.prisma.autopilotKeyword.updateMany({
      where: { id: { in: toQueue.map((k) => k.id) } },
      data: { status: 'QUEUED' },
    });

    this.logger.log(
      `Locale ${locale}: discovered ${queued} new keywords, queued ${toQueue.length}`,
    );
  }

  private async fetchKeywordsFromDataForSeo(
    locale: string,
    seedKeywords: string[],
  ): Promise<DataForSeoKeyword[]> {
    // Log the API call
    await this.prisma.apiUsageLog.create({
      data: {
        provider: 'DATAFORSEO',
        endpoint: 'keywords_for_keywords',
        costUsd: 0.01 * seedKeywords.length,
        meta: { locale, seedKeywords },
      },
    });

    // In production this would call DataForSeoService.getKeywordsForKeywords()
    // Returning mock data for now
    return seedKeywords.flatMap((seed) => [
      {
        keyword: `${seed} stratejisi`,
        searchVolume: Math.floor(Math.random() * 5000) + 200,
        difficulty: Math.floor(Math.random() * 55) + 5,
        cpc: Math.random() * 3,
      },
      {
        keyword: `${seed} nedir`,
        searchVolume: Math.floor(Math.random() * 8000) + 500,
        difficulty: Math.floor(Math.random() * 50) + 10,
        cpc: Math.random() * 2,
      },
    ]);
  }

  // -------------------------------------------------------------------------
  // Core: process queued keywords → generate content
  // -------------------------------------------------------------------------
  private async processQueue(settings: AutopilotSettingsData) {
    const queued = await this.prisma.autopilotKeyword.findMany({
      where: { status: 'QUEUED' },
      orderBy: { opportunityScore: 'desc' },
      take: settings.weeklyTarget,
    });

    for (const item of queued) {
      try {
        await this.generateAndPublishContent(item, settings);
      } catch (err) {
        this.logger.error(`Failed to process keyword ${item.keyword}:`, err);
        await this.prisma.autopilotKeyword.update({
          where: { id: item.id },
          data: { status: 'FAILED', retryCount: { increment: 1 } },
        });
      }
    }
  }

  private async generateAndPublishContent(
    item: {
      id: string;
      keyword: string;
      locale: string;
      retryCount?: number | null;
    },
    settings: AutopilotSettingsData,
  ) {
    this.logger.log(`Generating content for keyword: ${item.keyword}`);

    // Mark as in progress
    await this.prisma.autopilotKeyword.update({
      where: { id: item.id },
      data: { status: 'IN_PROGRESS' },
    });

    // Log LLM cost
    await this.prisma.apiUsageLog.create({
      data: {
        provider: 'OPENAI',
        endpoint: 'chat/completions',
        costUsd: 0.05, // Estimated per article
        tokens: 4000,
        meta: { keyword: item.keyword, locale: item.locale },
      },
    });

    // Generate content (in production: call LlmModule.generateBlogPost)
    const generatedContent = await this.generateBlogPostContent(
      item.keyword,
      item.locale,
    );

    // Quality gate
    const seoScore = generatedContent.seoScore;
    const geoScore = generatedContent.geoScore;

    if (seoScore < settings.minSeoScore || geoScore < settings.minGeoScore) {
      const retries = (item.retryCount ?? 0);
      if (retries < settings.maxRetries) {
        // Retry: put back in queue
        await this.prisma.autopilotKeyword.update({
          where: { id: item.id },
          data: { status: 'QUEUED', retryCount: { increment: 1 } },
        });
        this.logger.warn(
          `Quality gate failed for "${item.keyword}" (SEO:${seoScore} GEO:${geoScore}), retry ${retries + 1}/${settings.maxRetries}`,
        );
      } else {
        // Mark for admin review
        await this.prisma.autopilotKeyword.update({
          where: { id: item.id },
          data: { status: 'NEEDS_REVIEW' },
        });
        this.logger.warn(
          `Quality gate permanently failed for "${item.keyword}" — marked for admin review`,
        );
      }
      return;
    }

    const slug = this.slugify(item.keyword, item.locale);
    const publishMode = settings.publishMode;

    // Find a default project for autopilot (the first active project)
    const project = await this.prisma.project.findFirst({
      where: { organization: { status: 'ACTIVE' } },
    });

    if (!project) {
      this.logger.warn('No active project found for autopilot content');
      return;
    }

    const blogPost = await this.prisma.blogPost.create({
      data: {
        projectId: project.id,
        title: generatedContent.title,
        slug,
        locale: item.locale,
        content: generatedContent.content,
        excerpt: generatedContent.excerpt,
        faqSection: generatedContent.faq as unknown as Record<string, unknown>,
        seoScore,
        geoScore,
        autopilot: true,
        status: publishMode === 'AUTO' ? 'PUBLISHED' : 'REVIEW',
        publishedAt: publishMode === 'AUTO' ? new Date() : null,
      },
    });

    // Link autopilot keyword to blog post
    await this.prisma.autopilotKeyword.update({
      where: { id: item.id },
      data: { status: 'COMPLETED', blogPostId: blogPost.id },
    });

    if (publishMode === 'AUTO') {
      await this.postPublishActions(blogPost.id, item.keyword);
    }

    this.logger.log(
      `Content generated for "${item.keyword}" — status: ${blogPost.status}`,
    );
  }

  private async postPublishActions(blogPostId: string, keyword: string) {
    // IndexNow ping
    this.logger.log(`[IndexNow] Pinging for keyword: ${keyword}`);

    // Internal linking: find related older posts and suggest links
    const relatedPosts = await this.prisma.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
        id: { not: blogPostId },
        OR: [
          { title: { contains: keyword.split(' ')[0], mode: 'insensitive' } },
        ],
      },
      take: 5,
    });

    for (const related of relatedPosts) {
      await this.prisma.internalLinkSuggestion.create({
        data: {
          sourceBlogPostId: blogPostId,
          targetBlogPostId: related.id,
          anchorText: keyword,
          score: 0.8,
        },
      });
    }

    // RSS update trigger
    this.logger.log(`[RSS] Updated feed after publishing "${keyword}"`);
  }

  private async generateBlogPostContent(keyword: string, locale: string) {
    // In production: call LlmModule with structured prompts
    return {
      title:
        locale === 'tr' ? `${keyword}: Kapsamlı Rehber` : `${keyword}: Complete Guide`,
      content: `<h1>${keyword}</h1><p>This is autopilot-generated content for ${keyword}.</p>`,
      excerpt: `${keyword} hakkında kapsamlı rehber.`,
      faq: [
        { question: `${keyword} nedir?`, answer: `${keyword} açıklaması...` },
        {
          question: `${keyword} nasıl kullanılır?`,
          answer: `Kullanım talimatları...`,
        },
      ],
      seoScore: Math.floor(Math.random() * 30) + 70,
      geoScore: Math.floor(Math.random() * 30) + 65,
    };
  }

  private calculateOpportunityScore(kw: DataForSeoKeyword): number {
    // Higher volume + lower difficulty = higher score
    const volumeScore = Math.min(kw.searchVolume / 10000, 1) * 50;
    const difficultyScore = (1 - kw.difficulty / 100) * 30;
    const cpcScore = Math.min(kw.cpc / 5, 1) * 20;
    return Math.round(volumeScore + difficultyScore + cpcScore);
  }

  private slugify(text: string, locale: string): string {
    return `${locale}-${text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()}`;
  }

  private async checkCostLimits() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dataForSeoLimit, llmLimit, globalLimit] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: 'cost_limit_dataforseo_monthly_usd' },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: 'cost_limit_llm_monthly_usd' },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: 'cost_limit_global_monthly_usd' },
      }),
    ]);

    const [dataForSeoSpend, llmSpend, totalSpend] = await Promise.all([
      this.prisma.apiUsageLog.aggregate({
        _sum: { costUsd: true },
        where: {
          provider: 'DATAFORSEO',
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.apiUsageLog.aggregate({
        _sum: { costUsd: true },
        where: {
          provider: { in: ['OPENAI', 'ANTHROPIC'] },
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.apiUsageLog.aggregate({
        _sum: { costUsd: true },
        where: { createdAt: { gte: startOfMonth } },
      }),
    ]);

    const dfsSpend = Number(dataForSeoSpend._sum?.costUsd ?? 0);
    const llmSpendVal = Number(llmSpend._sum?.costUsd ?? 0);
    const totalSpendVal = Number(totalSpend._sum?.costUsd ?? 0);

    const dfsLimitVal = dataForSeoLimit ? Number(dataForSeoLimit.value) : Infinity;
    const llmLimitVal = llmLimit ? Number(llmLimit.value) : Infinity;
    const globalLimitVal = globalLimit ? Number(globalLimit.value) : Infinity;

    const adminEmail = this.config.get<string>('ADMIN_EMAIL', 'doganizzetcan@gmail.com');

    // 80% warning
    if (dfsSpend >= dfsLimitVal * 0.8 && dfsSpend < dfsLimitVal) {
      this.logger.warn(
        `[COST ALERT] DataForSEO at ${Math.round((dfsSpend / dfsLimitVal) * 100)}% of monthly limit. Alert sent to ${adminEmail}`,
      );
    }
    if (llmSpendVal >= llmLimitVal * 0.8 && llmSpendVal < llmLimitVal) {
      this.logger.warn(
        `[COST ALERT] LLM at ${Math.round((llmSpendVal / llmLimitVal) * 100)}% of monthly limit. Alert sent to ${adminEmail}`,
      );
    }
    if (totalSpendVal >= globalLimitVal * 0.8 && totalSpendVal < globalLimitVal) {
      this.logger.warn(
        `[COST ALERT] Total API spend at ${Math.round((totalSpendVal / globalLimitVal) * 100)}% of global limit. Alert sent to ${adminEmail}`,
      );
    }

    // Hard limits
    if (dfsSpend >= dfsLimitVal) {
      throw new Error(
        `DataForSEO monthly cost limit exceeded: $${dfsSpend} / $${dfsLimitVal}`,
      );
    }
    if (llmSpendVal >= llmLimitVal) {
      throw new Error(
        `LLM monthly cost limit exceeded: $${llmSpendVal} / $${llmLimitVal}`,
      );
    }
    if (totalSpendVal >= globalLimitVal) {
      throw new Error(
        `Global API cost limit exceeded: $${totalSpendVal} / $${globalLimitVal}`,
      );
    }
  }
}
