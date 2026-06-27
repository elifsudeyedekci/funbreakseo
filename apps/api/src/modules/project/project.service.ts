import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ConfigService } from '@nestjs/config';
import { ProjectStatus, CrawlJobStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import { CompetitorService } from '../competitor/competitor.service';
import { GeoService } from '../geo/geo.service';
import { OutreachService } from '../outreach/outreach.service';
import { KeywordService } from '../keyword/keyword.service';

export interface CreateProjectDto {
  name: string;
  domain: string;
  country?: string;
  language?: string;
  searchEngine?: string;
}

export interface FullScanProgress {
  projectId: string;
  status: 'running' | 'completed' | 'error';
  percent: number;
  currentStep: string;
  startedAt: string;
  completedAt: string | null;
  steps: Record<string, Record<string, unknown>>;
  summary: Record<string, number>;
}

export interface UpdateProjectDto {
  name?: string;
  country?: string;
  language?: string;
  searchEngine?: string;
  status?: ProjectStatus;
}

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);
  private readonly mailer: nodemailer.Transporter;

  /** In-memory full-scan progress keyed by projectId (polled by the dashboard). */
  private readonly fullScanProgress = new Map<string, FullScanProgress>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('crawler') private readonly crawlerQueue: Queue,
    private readonly competitorService: CompetitorService,
    private readonly geoService: GeoService,
    private readonly outreachService: OutreachService,
    private readonly keywordService: KeywordService,
  ) {
    this.mailer = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
  }

  // ─── List ─────────────────────────────────────────────────────────────────────

  async findAll(organizationId: string) {
    return this.prisma.project.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        _count: { select: { keywords: true, crawlJobs: true, contentItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Create ───────────────────────────────────────────────────────────────────

  async create(organizationId: string, userId: string, dto: CreateProjectDto) {
    // Check plan limit
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { subscription: { include: { plan: true } } },
    });

    const limits = org.subscription?.plan?.limits as Record<string, number> | null;
    const projectLimit = limits?.['projects'] ?? 1;

    const projectCount = await this.prisma.project.count({
      where: { organizationId, deletedAt: null },
    });

    if (projectCount >= projectLimit) {
      // Create PendingProject and notify admin
      const pending = await this.prisma.pendingProject.create({
        data: {
          organizationId,
          domain: dto.domain,
          attemptedByUserId: userId,
          watchUntil: new Date(Date.now() + 3 * 86_400_000),
          status: 'WATCHING',
          adminNotified: true,
        },
      });

      this.mailer.sendMail({
        from: `"FunBreak SEO" <${this.config.get('SMTP_FROM', 'noreply@funbreakseo.com')}>`,
        to: this.config.get<string>('ADMIN_EMAIL', 'admin@funbreakseo.com'),
        subject: `Plan Limiti Aşıldı: ${org.name}`,
        html: `<p>${org.name} organizasyonu proje limitini aşmaya çalıştı.<br>Domain: ${dto.domain}<br>PendingProject ID: ${pending.id}</p>`,
      }).catch((err: Error) => this.logger.warn(`Admin email failed: ${err.message}`));

      throw new ForbiddenException(`PLAN_LIMIT_REACHED:${projectLimit}`);
    }

    return this.prisma.project.create({
      data: {
        organizationId,
        createdByUserId: userId,
        name: dto.name,
        domain: dto.domain,
        country: dto.country ?? 'TR',
        language: dto.language ?? 'tr',
        searchEngine: dto.searchEngine ?? 'google.com.tr',
      },
    });
  }

  // ─── Find One (with org isolation) ───────────────────────────────────────────

  async findOne(id: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        keywords: { take: 5, orderBy: { createdAt: 'desc' } },
        crawlJobs: { take: 1, orderBy: { createdAt: 'desc' } },
        contentItems: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  // ─── Update ───────────────────────────────────────────────────────────────────

  async update(id: string, organizationId: string, dto: UpdateProjectDto) {
    await this.findOne(id, organizationId);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  // ─── Delete (soft) ────────────────────────────────────────────────────────────

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  // ─── Overview Dashboard ───────────────────────────────────────────────────────

  async getOverview(id: string, organizationId: string) {
    const project = await this.findOne(id, organizationId);

    const [
      keywordCount,
      allKeywords,
      topKeywords,
      lastDoneCrawl,
      latestCrawl,
      contentCount,
      geoQueryCount,
      backlinkCount,
    ] = await Promise.all([
      this.prisma.keyword.count({ where: { projectId: id } }),
      // All keywords with their latest rank — needed for an accurate first-page count.
      this.prisma.keyword.findMany({
        where: { projectId: id },
        select: {
          id: true,
          phrase: true,
          ranks: { take: 1, orderBy: { checkedAt: 'desc' }, select: { position: true } },
        },
      }),
      this.prisma.keyword.findMany({
        where: { projectId: id },
        include: { ranks: { take: 2, orderBy: { checkedAt: 'desc' } } },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      // Prefer the last crawl that produced data for the dashboard cards…
      this.prisma.crawlJob.findFirst({
        where: { projectId: id, status: CrawlJobStatus.DONE, pagesScanned: { gt: 0 } },
        orderBy: { finishedAt: 'desc' },
      }),
      // …but also expose the most recent job so the UI can show "running/queued" state.
      this.prisma.crawlJob.findFirst({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contentItem.count({ where: { projectId: id } }),
      this.prisma.geoQuery.count({ where: { projectId: id } }),
      this.prisma.backlink.count({ where: { projectId: id } }),
    ]);

    // Position stats across ALL tracked keywords (latest rank each).
    const allPositions = allKeywords
      .map((k) => k.ranks[0]?.position)
      .filter((p): p is number => p !== null && p !== undefined);

    const avgPosition =
      allPositions.length > 0
        ? +(allPositions.reduce((a, b) => a + b, 0) / allPositions.length).toFixed(1)
        : null;

    // Correct "first page" = keywords ranking in positions 1..10.
    const firstPageCount = allPositions.filter((p) => p >= 1 && p <= 10).length;
    const top3Count = allPositions.filter((p) => p >= 1 && p <= 3).length;
    const rankedCount = allPositions.length;

    const lastCrawl = lastDoneCrawl ?? latestCrawl;

    const [rankTrend, geoTrend, latestGeoSnapshot, activities, todos] = await Promise.all([
      this.buildRankTrend(id),
      this.buildGeoTrend(id),
      this.prisma.geoVisibilitySnapshot.findFirst({
        where: { projectId: id },
        orderBy: { date: 'desc' },
      }),
      this.buildActivities(id),
      this.buildTodos(id, allKeywords),
    ]);

    return {
      project,
      keywordCount,
      rankedCount,
      avgPosition,
      firstPageCount,
      top3Count,
      lastCrawl,
      latestCrawl,
      contentCount,
      geoQueryCount,
      backlinkCount,
      pagesScanned: lastCrawl?.pagesScanned ?? 0,
      issuesFound: lastCrawl?.issuesFound ?? 0,
      healthScore: lastCrawl?.healthScore ?? project.healthScore,
      geoVisibilityScore:
        latestGeoSnapshot?.mentionCount != null
          ? Math.min(
              100,
              Math.round(
                ((latestGeoSnapshot.mentionCount ?? 0) +
                  (latestGeoSnapshot.citationCount ?? 0) * 2) *
                  5,
              ),
            )
          : project.geoVisibilityScore,
      latestGeoSnapshot,
      rankTrend,
      geoTrend,
      activities,
      todos,
      topKeywords: topKeywords.map((k) => ({
        id: k.id,
        phrase: k.phrase,
        position: k.ranks[0]?.position ?? null,
        previousPosition: k.ranks[1]?.position ?? null,
      })),
    };
  }

  /** Average daily SERP position over the last 30 days (rank trend chart). */
  private async buildRankTrend(projectId: string) {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const ranks = await this.prisma.keywordRank.findMany({
      where: { keyword: { projectId }, checkedAt: { gte: since }, position: { not: null } },
      select: { position: true, checkedAt: true },
      orderBy: { checkedAt: 'asc' },
    });

    const byDay = new Map<string, { sum: number; n: number }>();
    for (const r of ranks) {
      if (r.position == null) continue;
      const day = r.checkedAt.toISOString().slice(0, 10);
      const bucket = byDay.get(day) ?? { sum: 0, n: 0 };
      bucket.sum += r.position;
      bucket.n += 1;
      byDay.set(day, bucket);
    }

    return Array.from(byDay.entries()).map(([date, { sum, n }]) => ({
      date,
      avgPosition: +(sum / n).toFixed(1),
    }));
  }

  /** GEO mention/citation snapshots over the last 30 days (GEO trend chart). */
  private async buildGeoTrend(projectId: string) {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const snapshots = await this.prisma.geoVisibilitySnapshot.findMany({
      where: { projectId, date: { gte: since } },
      orderBy: { date: 'asc' },
      select: { date: true, mentionCount: true, citationCount: true },
    });
    return snapshots.map((s) => ({
      date: s.date.toISOString().slice(0, 10),
      mentions: s.mentionCount,
      citations: s.citationCount,
    }));
  }

  /** Recent activity feed built from real records (crawl, keywords, backlinks, GEO). */
  private async buildActivities(projectId: string) {
    const [lastCrawl, lastKeyword, keywordsLast7, lastBacklink, lastGeo, lastContent] =
      await Promise.all([
        this.prisma.crawlJob.findFirst({
          where: { projectId, status: CrawlJobStatus.DONE },
          orderBy: { finishedAt: 'desc' },
        }),
        this.prisma.keyword.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } }),
        this.prisma.keyword.count({
          where: { projectId, createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
        }),
        this.prisma.backlink.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } }),
        this.prisma.geoVisibilitySnapshot.findFirst({
          where: { projectId },
          orderBy: { date: 'desc' },
        }),
        this.prisma.contentItem.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } }),
      ]);

    const activities: Array<{ type: string; message: string; at: string }> = [];

    if (lastCrawl?.finishedAt) {
      activities.push({
        type: 'crawl',
        message: `Teknik SEO taraması tamamlandı — ${lastCrawl.pagesScanned} sayfa, ${lastCrawl.issuesFound} sorun`,
        at: lastCrawl.finishedAt.toISOString(),
      });
    }
    if (keywordsLast7 > 0 && lastKeyword) {
      activities.push({
        type: 'keyword',
        message: `Son 7 günde ${keywordsLast7} anahtar kelime eklendi`,
        at: lastKeyword.createdAt.toISOString(),
      });
    }
    if (lastBacklink) {
      activities.push({
        type: 'backlink',
        message: `Backlink profili güncellendi — son kaynak ${lastBacklink.sourceDomain}`,
        at: lastBacklink.createdAt.toISOString(),
      });
    }
    if (lastGeo) {
      activities.push({
        type: 'geo',
        message: `GEO taraması: ${lastGeo.mentionCount} bahsedilme, ${lastGeo.citationCount} kaynak gösterimi`,
        at: lastGeo.createdAt.toISOString(),
      });
    }
    if (lastContent) {
      activities.push({
        type: 'content',
        message: `İçerik oluşturuldu: "${lastContent.title}"`,
        at: lastContent.createdAt.toISOString(),
      });
    }

    return activities.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);
  }

  /** Actionable to-do list derived from real gaps in the project's data. */
  private async buildTodos(
    projectId: string,
    keywords: Array<{ phrase: string; ranks: Array<{ position: number | null }> }>,
  ) {
    const todos: Array<{ priority: 'HIGH' | 'MEDIUM' | 'LOW'; message: string }> = [];

    const lowRanking = keywords.filter((k) => {
      const p = k.ranks[0]?.position;
      return p != null && p > 10;
    });
    if (lowRanking.length > 0) {
      todos.push({
        priority: 'MEDIUM',
        message: `${lowRanking.length} anahtar kelime ilk sayfanın dışında (11+). İçerik ve iç linklemeyi güçlendirin.`,
      });
    }

    const notRanking = keywords.filter((k) => k.ranks[0]?.position == null);
    if (notRanking.length > 0) {
      todos.push({
        priority: 'MEDIUM',
        message: `${notRanking.length} kelimede henüz sıralama yok. Hedef sayfalar oluşturun veya optimize edin.`,
      });
    }

    const [criticalIssues, contentCount, lastGeo] = await Promise.all([
      this.prisma.crawlJob
        .findFirst({
          where: { projectId, status: CrawlJobStatus.DONE, pagesScanned: { gt: 0 } },
          orderBy: { finishedAt: 'desc' },
        })
        .then((job) =>
          job
            ? this.prisma.seoIssue.count({
                where: { crawlJobId: job.id, severity: 'CRITICAL', fixed: false },
              })
            : 0,
        ),
      this.prisma.contentItem.count({ where: { projectId } }),
      this.prisma.geoVisibilitySnapshot.findFirst({
        where: { projectId },
        orderBy: { date: 'desc' },
      }),
    ]);

    if (criticalIssues > 0) {
      todos.push({
        priority: 'HIGH',
        message: `${criticalIssues} kritik teknik SEO sorunu çözülmeyi bekliyor.`,
      });
    }
    if (contentCount === 0) {
      todos.push({
        priority: 'MEDIUM',
        message: 'Henüz içerik üretilmedi. AI içerik motoruyla ilk blog yazınızı oluşturun.',
      });
    }
    if (!lastGeo || lastGeo.mentionCount === 0) {
      todos.push({
        priority: 'HIGH',
        message: 'AI aramalarında görünürlük düşük. GEO taraması başlatıp içeriği AI için optimize edin.',
      });
    }

    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return todos.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 6);
  }

  // ─── Connect GSC ──────────────────────────────────────────────────────────────

  async connectGsc(id: string, organizationId: string): Promise<{ authUrl: string }> {
    await this.findOne(id, organizationId);

    const clientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const redirectUri = `${this.config.get('APP_BASE_URL', 'https://app.funbreakseo.com')}/api/v1/projects/${id}/gsc-callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state: `${id}:${organizationId}`,
    });

    return {
      authUrl: `https://accounts.google.com/o/oauth2/auth?${params.toString()}`,
    };
  }

  // ─── GSC Data ─────────────────────────────────────────────────────────────────

  async getGscData(id: string, organizationId: string) {
    const project = await this.findOne(id, organizationId);

    const integration = await this.prisma.apiIntegration.findFirst({
      where: { projectId: id, provider: 'GSC' },
    });

    if (!integration) {
      throw new NotFoundException('Google Search Console not connected');
    }

    const creds = integration.credentials as {
      accessToken: string;
      refreshToken: string;
    };

    // Refresh access token
    const tokenResponse = await axios.post<{
      access_token: string;
      expires_in: number;
    }>(
      'https://oauth2.googleapis.com/token',
      {
        client_id: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
        refresh_token: creds.refreshToken,
        grant_type: 'refresh_token',
      },
    );

    const accessToken = tokenResponse.data.access_token;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 28 * 86_400_000)
      .toISOString()
      .split('T')[0];

    const gscResponse = await axios.post<{
      rows?: Array<{
        keys: string[];
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
      }>;
    }>(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(`sc-domain:${project.domain}`)}/searchAnalytics/query`,
      {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 100,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    return gscResponse.data.rows ?? [];
  }

  // ─── Full Scan Orchestration ──────────────────────────────────────────────────

  /**
   * Kicks off a full scan in the background and returns immediately. Progress is
   * tracked in-memory and exposed via getFullScanStatus() for the dashboard to
   * poll. Steps run sequentially: crawl → keywords → backlinks → GEO → rakip.
   */
  async fullScan(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');

    const existing = this.fullScanProgress.get(projectId);
    if (existing && existing.status === 'running') {
      return { started: false, alreadyRunning: true, progress: existing };
    }

    const STEPS = ['crawl', 'keywords', 'backlinks', 'geo', 'competitors'] as const;
    const progress: FullScanProgress = {
      projectId,
      status: 'running',
      percent: 0,
      currentStep: 'crawl',
      startedAt: new Date().toISOString(),
      completedAt: null,
      steps: {},
      summary: {},
    };
    this.fullScanProgress.set(projectId, progress);

    // Run in background — do not block the HTTP response.
    void this.runFullScan(projectId, organizationId, progress, STEPS);

    return { started: true, progress };
  }

  private async runFullScan(
    projectId: string,
    organizationId: string,
    progress: FullScanProgress,
    steps: readonly string[],
  ): Promise<void> {
    const total = steps.length;
    let done = 0;
    const advance = (step: string) => {
      done++;
      progress.percent = Math.round((done / total) * 100);
      const next = steps[done];
      if (next) progress.currentStep = next;
    };

    // Step 1: technical SEO crawl
    progress.currentStep = 'crawl';
    try {
      const crawlJob = await this.prisma.crawlJob.create({
        data: { projectId, status: CrawlJobStatus.QUEUED, triggeredBy: 'MANUAL' },
      });
      await this.crawlerQueue.add('crawl', { crawlJobId: crawlJob.id, projectId });
      progress.steps['crawl'] = { status: 'done', jobId: crawlJob.id };
    } catch (err: any) {
      this.logger.warn('fullScan: crawl step failed', err.message);
      progress.steps['crawl'] = { status: 'error', error: err.message };
    }
    advance('crawl');

    // Step 2: keyword discovery (domain-based)
    progress.currentStep = 'keywords';
    try {
      const discovered = await this.keywordService.discoverKeywordsForDomain(projectId, organizationId);
      progress.steps['keywords'] = { status: 'done', discovered: discovered.length };
      progress.summary.keywords = discovered.length;
    } catch (err: any) {
      this.logger.warn('fullScan: keyword step failed', err.message);
      progress.steps['keywords'] = { status: 'error', error: err.message };
    }
    advance('keywords');

    // Step 3: backlink profile sync
    progress.currentStep = 'backlinks';
    try {
      const bl: any = await this.outreachService.syncBacklinks(projectId);
      progress.steps['backlinks'] = bl.error
        ? { status: 'skipped', reason: bl.error }
        : { status: 'done', synced: bl.synced ?? 0, total: bl.total ?? 0 };
      progress.summary.backlinks = bl.total ?? 0;
    } catch (err: any) {
      this.logger.warn('fullScan: backlink step failed', err.message);
      progress.steps['backlinks'] = { status: 'error', error: err.message };
    }
    advance('backlinks');

    // Step 4: GEO / AI-visibility scan (business-keyword queries)
    progress.currentStep = 'geo';
    try {
      const geo: any = await this.geoService.triggerScan(projectId);
      progress.steps['geo'] = { status: 'done', queued: geo.queued ?? 0 };
      progress.summary.geoQueries = geo.queued ?? 0;
    } catch (err: any) {
      this.logger.warn('fullScan: geo step failed', err.message);
      progress.steps['geo'] = { status: 'error', error: err.message };
    }
    advance('geo');

    // Step 5: competitor auto-discovery (filtered)
    progress.currentStep = 'competitors';
    try {
      const competitors: any[] = await this.competitorService.findCompetitors(projectId, organizationId);
      progress.steps['competitors'] = {
        status: 'done',
        found: competitors.length,
        top: competitors.slice(0, 5).map((c) => c.domain),
      };
      progress.summary.competitors = competitors.length;
    } catch (err: any) {
      this.logger.warn('fullScan: competitor step failed', err.message);
      progress.steps['competitors'] = { status: 'error', error: err.message };
    }
    advance('competitors');

    progress.percent = 100;
    progress.status = 'completed';
    progress.currentStep = 'done';
    progress.completedAt = new Date().toISOString();

    // Archive this scan so the customer can browse past scans by date.
    try {
      const ov: any = await this.getOverview(projectId, organizationId);
      await this.prisma.scanHistory.create({
        data: {
          projectId,
          healthScore: ov.healthScore ?? 0,
          pagesScanned: ov.pagesScanned ?? 0,
          issuesFound: ov.issuesFound ?? 0,
          keywordCount: ov.keywordCount ?? 0,
          rankedCount: ov.rankedCount ?? 0,
          firstPageCount: ov.firstPageCount ?? 0,
          avgPosition: ov.avgPosition ?? null,
          backlinkCount: ov.backlinkCount ?? 0,
          referringDomains: ov.referringDomains ?? 0,
          geoVisibilityScore: ov.geoVisibilityScore ?? 0,
          geoMentions: ov.latestGeoSnapshot?.mentionCount ?? 0,
          geoCitations: ov.latestGeoSnapshot?.citationCount ?? 0,
          competitorCount: progress.summary.competitors ?? 0,
          data: { steps: progress.steps, summary: progress.summary } as any,
        },
      });
    } catch (err: any) {
      this.logger.warn(`fullScan: scan history archive failed: ${err.message}`);
    }

    this.logger.log(`fullScan completed for project ${projectId}`);
  }

  getFullScanStatus(projectId: string): FullScanProgress | { status: 'idle' } {
    return this.fullScanProgress.get(projectId) ?? { status: 'idle' };
  }

  /** List archived scans for a project (newest first). */
  async getScanHistory(projectId: string, organizationId: string) {
    await this.findOne(projectId, organizationId);
    return this.prisma.scanHistory.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Get a single archived scan. */
  async getScanHistoryItem(projectId: string, scanId: string, organizationId: string) {
    await this.findOne(projectId, organizationId);
    const item = await this.prisma.scanHistory.findFirst({
      where: { id: scanId, projectId },
    });
    if (!item) throw new NotFoundException('Scan not found');
    return item;
  }
}
