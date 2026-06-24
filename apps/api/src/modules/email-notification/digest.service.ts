import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma.service';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  // -------------------------------------------------------------------------
  // Customer digests — daily check, filter by frequency
  // -------------------------------------------------------------------------
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendCustomerDigests() {
    this.logger.log('Sending customer digests...');
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const dayOfMonth = now.getDate();

    const orgs = await this.prisma.organization.findMany({
      where: {
        status: 'ACTIVE',
        digestFrequency: { not: 'NONE' },
      },
      include: {
        users: { where: { role: 'OWNER' }, take: 1 },
      },
    });

    for (const org of orgs) {
      try {
        const freq = org.digestFrequency as string;

        // Daily: every day
        // Weekly: Monday only
        // Monthly: 1st of month only
        const shouldSend =
          freq === 'DAILY' ||
          (freq === 'WEEKLY' && dayOfWeek === 1) ||
          (freq === 'MONTHLY' && dayOfMonth === 1);

        if (!shouldSend) continue;

        const ownerEmail = org.users[0]?.email;
        if (!ownerEmail) continue;

        const content = await this.buildDigestContent(org.id);

        await this.emailService.sendTemplate(ownerEmail, 'digest', {
          subject: `FunBreakSEO ${freq === 'WEEKLY' ? 'Haftalık' : freq === 'MONTHLY' ? 'Aylık' : 'Günlük'} Özet — ${org.name}`,
          ...content,
          dashboardUrl: `${this.config.get('FRONTEND_URL')}/dashboard`,
        });
      } catch (err) {
        this.logger.error(`Failed to send digest to org ${org.id}:`, err);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Admin financial digest — every Monday
  // -------------------------------------------------------------------------
  @Cron('0 9 * * 1') // Monday 9am
  async sendAdminFinancialDigest() {
    this.logger.log('Sending admin financial digest...');

    const adminEmail = this.config.get<string>(
      'ADMIN_EMAIL',
      'doganizzetcan@gmail.com',
    );

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400_000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [mrrResult, newSubs, churn, apiCost, dfsCost, llmCost] =
      await Promise.all([
        this.prisma.$queryRaw<{ mrr: number }[]>`
          SELECT COALESCE(SUM(p.price), 0) as mrr
          FROM "Subscription" s
          JOIN "Plan" p ON p.id = s."planId"
          WHERE s.status = 'ACTIVE'
        `,
        this.prisma.subscription.count({
          where: { createdAt: { gte: weekAgo }, status: 'ACTIVE' },
        }),
        this.prisma.subscription.count({
          where: { canceledAt: { gte: weekAgo }, status: 'CANCELED' },
        }),
        this.prisma.apiUsageLog.aggregate({
          _sum: { costUsd: true },
          where: { createdAt: { gte: startOfMonth } },
        }),
        this.prisma.apiUsageLog.aggregate({
          _sum: { costUsd: true },
          where: { provider: 'DATAFORSEO', createdAt: { gte: startOfMonth } },
        }),
        this.prisma.apiUsageLog.aggregate({
          _sum: { costUsd: true },
          where: {
            provider: { in: ['OPENAI', 'ANTHROPIC'] },
            createdAt: { gte: startOfMonth },
          },
        }),
      ]);

    await this.emailService.sendTemplate(
      adminEmail,
      'admin-financial-digest',
      {
        subject: 'FunBreakSEO — Haftalık Finansal Özet',
        mrr: `$${Number(mrrResult[0]?.mrr ?? 0).toFixed(2)}`,
        newSubscriptions: newSubs,
        churn,
        apiCost: `$${Number(apiCost._sum?.costUsd ?? 0).toFixed(2)}`,
        dataForSeoCost: `$${Number(dfsCost._sum?.costUsd ?? 0).toFixed(2)}`,
        llmCost: `$${Number(llmCost._sum?.costUsd ?? 0).toFixed(2)}`,
      },
    );

    this.logger.log('Admin financial digest sent');
  }

  // -------------------------------------------------------------------------
  // Build digest content for a given org
  // -------------------------------------------------------------------------
  async buildDigestContent(orgId: string): Promise<Record<string, unknown>> {
    const weekAgo = new Date(Date.now() - 7 * 86400_000);

    const projects = await this.prisma.project.findMany({
      where: { orgId },
      include: {
        keywords: {
          include: {
            rankHistory: { orderBy: { checkedAt: 'desc' }, take: 2 },
          },
        },
        crawlJobs: {
          where: { createdAt: { gte: weekAgo } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        backlinks: { where: { createdAt: { gte: weekAgo } } },
        blogPosts: {
          where: { status: 'PUBLISHED', publishedAt: { gte: weekAgo } },
        },
      },
    });

    let totalKeywords = 0;
    let avgRank = 0;
    let newBacklinks = 0;
    let newContent = 0;
    let geoMentioned = 0;
    let geoTotal = 0;

    for (const project of projects) {
      const ranks = project.keywords
        .map((k) => k.rankHistory[0]?.rank)
        .filter((r): r is number => r !== undefined);

      totalKeywords += ranks.length;
      avgRank += ranks.reduce((s, r) => s + r, 0);
      newBacklinks += project.backlinks.length;
      newContent += project.blogPosts.length;

      const geoChecks = await this.prisma.geoVisibilityCheck.findMany({
        where: {
          keyword: { projectId: project.id },
          checkedAt: { gte: weekAgo },
        },
      });
      geoTotal += geoChecks.length;
      geoMentioned += geoChecks.filter((g) => g.isMentioned).length;
    }

    return {
      avgRank:
        totalKeywords > 0 ? (avgRank / totalKeywords).toFixed(1) : 'N/A',
      geoRate:
        geoTotal > 0
          ? ((geoMentioned / geoTotal) * 100).toFixed(1)
          : '0',
      newBacklinks,
      newContent,
      projectCount: projects.length,
    };
  }

  // -------------------------------------------------------------------------
  // Admin sale alert
  // -------------------------------------------------------------------------
  async sendAdminSaleAlert(
    invoice: {
      id: string;
      amount: number;
      currency: string;
    },
    org: { name: string; id: string },
  ) {
    const adminEmail = this.config.get<string>(
      'ADMIN_EMAIL',
      'doganizzetcan@gmail.com',
    );

    const mrrResult = await this.prisma.$queryRaw<{ mrr: number }[]>`
      SELECT COALESCE(SUM(p.price), 0) as mrr
      FROM "Subscription" s
      JOIN "Plan" p ON p.id = s."planId"
      WHERE s.status = 'ACTIVE'
    `;

    const sub = await this.prisma.subscription.findFirst({
      where: { orgId: org.id },
      include: { plan: true },
    });

    await this.emailService.sendTemplate(adminEmail, 'admin-sale', {
      subject: `Yeni Satış: ${org.name} — ${invoice.currency} ${invoice.amount}`,
      orgName: org.name,
      planName: sub?.plan?.name ?? 'Unknown',
      amount: `${invoice.currency} ${invoice.amount}`,
      mrr: `$${Number(mrrResult[0]?.mrr ?? 0).toFixed(2)}`,
    });
  }
}
