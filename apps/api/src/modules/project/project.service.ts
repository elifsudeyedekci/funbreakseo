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

    const [keywordCount, topKeywords, lastDoneCrawl, latestCrawl, contentCount, geoQueryCount, backlinkCount] =
      await Promise.all([
        this.prisma.keyword.count({ where: { projectId: id } }),
        this.prisma.keyword.findMany({
          where: { projectId: id },
          include: { ranks: { take: 1, orderBy: { checkedAt: 'desc' } } },
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

    const positions = topKeywords
      .map((k) => k.ranks[0]?.position)
      .filter((p): p is number => p !== null && p !== undefined);

    const avgPosition =
      positions.length > 0
        ? +(positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1)
        : null;

    const lastCrawl = lastDoneCrawl ?? latestCrawl;

    return {
      project,
      keywordCount,
      avgPosition,
      lastCrawl,
      latestCrawl,
      contentCount,
      geoQueryCount,
      backlinkCount,
      pagesScanned: lastCrawl?.pagesScanned ?? 0,
      issuesFound: lastCrawl?.issuesFound ?? 0,
      healthScore: lastCrawl?.healthScore ?? project.healthScore,
      geoVisibilityScore: project.geoVisibilityScore,
    };
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

  async fullScan(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');

    const results: Record<string, unknown> = {
      projectId,
      startedAt: new Date().toISOString(),
      steps: {} as Record<string, unknown>,
    };

    const steps = results.steps as Record<string, unknown>;

    // Step 1: Start technical SEO crawl
    try {
      const crawlJob = await this.prisma.crawlJob.create({
        data: { projectId, status: CrawlJobStatus.QUEUED, triggeredBy: 'MANUAL' },
      });
      await this.crawlerQueue.add('crawl', { crawlJobId: crawlJob.id, projectId });
      steps['crawl'] = { jobId: crawlJob.id, status: 'queued' };
    } catch (err: any) {
      this.logger.warn('fullScan: crawl step failed', err.message);
      steps['crawl'] = { error: err.message };
    }

    // Step 2: Keyword discovery (domain-based, no seed required)
    try {
      const discovered = await this.keywordService.discoverKeywordsForDomain(projectId, organizationId);
      steps['keywords'] = { discovered: discovered.length, top: discovered.slice(0, 10) };
    } catch (err: any) {
      this.logger.warn('fullScan: keyword step failed', err.message);
      steps['keywords'] = { error: err.message };
    }

    // Step 3: Backlink profile sync (DataForSEO → DB)
    try {
      const bl = await this.outreachService.syncBacklinks(projectId);
      steps['backlinks'] = { synced: bl.synced ?? 0, total: bl.total ?? 0 };
    } catch (err: any) {
      this.logger.warn('fullScan: backlink step failed', err.message);
      steps['backlinks'] = { error: err.message };
    }

    // Step 4: GEO / AI-visibility scan (auto domain-based queries)
    try {
      const geo = await this.geoService.triggerScan(projectId);
      steps['geo'] = { queued: geo.queued ?? 0 };
    } catch (err: any) {
      this.logger.warn('fullScan: geo step failed', err.message);
      steps['geo'] = { error: err.message };
    }

    // Step 5: Competitor auto-discovery (DataForSEO competitors_domain, filtered)
    try {
      const competitors = await this.competitorService.findCompetitors(projectId, organizationId);
      steps['competitors'] = { found: competitors.length, top: competitors.slice(0, 5).map((c: any) => c.domain) };
    } catch (err: any) {
      this.logger.warn('fullScan: competitor step failed', err.message);
      steps['competitors'] = { error: err.message };
    }

    results['completedAt'] = new Date().toISOString();
    return results;
  }
}
