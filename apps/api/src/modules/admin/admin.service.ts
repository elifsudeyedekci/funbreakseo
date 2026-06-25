import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------
  async getDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeSubscriptions,
      trialSubscriptions,
      newSignupsThisMonth,
      pendingContentReview,
      pendingOutreachReview,
    ] = await Promise.all([
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: 'TRIALING' } }),
      this.prisma.organization.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.blogPost.count({ where: { status: 'REVIEW' } }),
      this.prisma.outreachEmail.count({
        where: { status: 'REPLIED', reviewedAt: null },
      }),
    ]);

    // MRR: sum of active subscription amounts
    const mrrResult = await this.prisma.$queryRaw<{ mrr: number }[]>`
      SELECT COALESCE(SUM(p."monthlyPrice"), 0) as mrr
      FROM "subscriptions" s
      JOIN "plans" p ON p.id = s."planId"
      WHERE s.status = 'ACTIVE'
    `;
    const mrr = Number(mrrResult[0]?.mrr ?? 0);

    // Churn: subscriptions cancelled this month
    const churn = await this.prisma.subscription.count({
      where: {
        status: 'CANCELED',
        canceledAt: { gte: startOfMonth },
      },
    });

    // API cost this month
    const apiCostResult = await this.prisma.apiUsageLog.aggregate({
      _sum: { costUsd: true },
      where: { createdAt: { gte: startOfMonth } },
    });
    const apiCost = Number(apiCostResult._sum?.costUsd ?? 0);

    // Queue health: count jobs per queue
    const queueHealth = await this.getSystemQueues();

    return {
      mrr,
      activeSubscriptions,
      trialSubscriptions,
      newSignupsThisMonth,
      churn,
      apiCost,
      queueHealth,
      pendingContentReview,
      pendingOutreachReview,
    };
  }

  // -------------------------------------------------------------------------
  // Customers
  // -------------------------------------------------------------------------
  async getCustomers(
    filters: {
      search?: string;
      plan?: string;
      status?: string;
    },
    pagination: { page: number; limit: number },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        {
          users: {
            some: { email: { contains: filters.search, mode: 'insensitive' } },
          },
        },
      ];
    }

    if (filters.status) {
      where.subscription = { status: filters.status };
    }

    const [total, organizations] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        include: {
          users: {
            select: { id: true, email: true, fullName: true, role: true },
          },
          subscription: {
            include: { plan: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, page, limit, data: organizations };
  }

  async getCustomer(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        users: true,
        projects: {
          include: { keywords: { take: 10 } },
        },
        subscription: { include: { plan: true } },
        invoices: { orderBy: { createdAt: 'desc' }, take: 20 },
        wallet: true,
      },
    });

    if (!org) throw new NotFoundException('Organization not found');

    // Usage stats
    const usageStats = await this.prisma.apiUsageLog.aggregate({
      _sum: { costUsd: true, tokens: true },
      _count: { id: true },
      where: { organizationId: orgId },
    });

    // Health score: projects with active crawl, keyword count, content count
    const healthScore = await this.computeOrgHealthScore(orgId);

    return { ...org, usageStats, healthScore };
  }

  private async computeOrgHealthScore(orgId: string): Promise<number> {
    const [projectCount, keywordCount, contentCount, crawlCount] =
      await Promise.all([
        this.prisma.project.count({ where: { organizationId: orgId } }),
        this.prisma.keyword.count({ where: { project: { organizationId: orgId } } }),
        this.prisma.contentItem.count({ where: { project: { organizationId: orgId } } }),
        this.prisma.crawlJob.count({
          where: { project: { organizationId: orgId }, status: 'DONE' },
        }),
      ]);

    let score = 0;
    if (projectCount > 0) score += 20;
    if (keywordCount > 5) score += 20;
    if (keywordCount > 20) score += 10;
    if (contentCount > 0) score += 20;
    if (contentCount > 10) score += 10;
    if (crawlCount > 0) score += 20;

    return Math.min(score, 100);
  }

  // -------------------------------------------------------------------------
  // Account management
  // -------------------------------------------------------------------------
  async suspendAccount(orgId: string, userId: string, reason: string) {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { status: 'SUSPENDED' },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId,
        action: 'ACCOUNT_SUSPENDED',
        meta: { reason },
      },
    });

    return { success: true };
  }

  async activateAccount(orgId: string) {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { status: 'ACTIVE' },
    });

    return { success: true };
  }

  async cancelSubscription(orgId: string, immediately: boolean) {
    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId: orgId },
    });

    if (!sub) throw new NotFoundException('Subscription not found');

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'CANCELED',
        canceledAt: immediately ? new Date() : sub.currentPeriodEnd,
        cancelAtPeriodEnd: !immediately,
      },
    });

    return { success: true };
  }

  async refundInvoice(
    invoiceId: string,
    amount: number,
    type: 'FULL' | 'PARTIAL',
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    const refundAmount = type === 'FULL' ? invoice.amount : amount;

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'REFUNDED', refundedAmount: refundAmount },
    });

    return { success: true, refundedAmount: refundAmount };
  }

  async changePlan(
    orgId: string,
    planId: string,
    isComplimentary: boolean,
    reason: string,
    until?: Date,
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId: orgId },
    });

    if (sub) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          planId,
          isComplimentary,
          complimentaryReason: reason,
          complimentaryUntil: until,
        },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          organizationId: orgId,
          planId,
          status: 'ACTIVE',
          isComplimentary,
          complimentaryReason: reason,
          complimentaryUntil: until,
          currentPeriodStart: new Date(),
          currentPeriodEnd: until ?? new Date(Date.now() + 30 * 86400_000),
        },
      });
    }

    return { success: true };
  }

  async addCredit(orgId: string, amount: number, description: string) {
    let wallet = await this.prisma.wallet.findFirst({ where: { organizationId: orgId } });
    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { organizationId: orgId, balance: 0 },
      });
    }

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      }),
      this.prisma.walletTransaction.create({
        data: {
          organizationId: orgId,
          amount,
          type: 'CREDIT',
          description,
          balanceAfter: Number(wallet.balance) + amount,
        },
      }),
    ]);

    return { success: true };
  }

  async setQuotaOverride(orgId: string, metric: string, value: number) {
    await this.prisma.quotaOverride.upsert({
      where: { orgId_metric: { organizationId: orgId, metric } },
      create: { organizationId: orgId, metric, value },
      update: { value },
    });

    return { success: true };
  }

  async impersonateUser(adminUserId: string, targetUserId: string) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: 'IMPERSONATE_USER',
        meta: { targetUserId },
      },
    });

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { organization: true },
    });

    if (!targetUser) throw new NotFoundException('Target user not found');

    return { impersonating: true, user: targetUser };
  }

  async sendCustomEmail(orgId: string, subject: string, body: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { users: { where: { role: 'CUSTOMER' }, take: 1 } },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const ownerEmail = org.users[0]?.email;
    if (!ownerEmail) throw new BadRequestException('No owner email found');

    // Log the custom email
    await this.prisma.emailLog.create({
      data: {
        to: ownerEmail,
        subject,
        body,
        type: 'CUSTOM_ADMIN',
        organizationId: orgId,
      },
    });

    return { success: true, sentTo: ownerEmail };
  }

  async getConsentRecords(
    orgId: string,
    filters: { type?: string; from?: Date; to?: Date },
  ) {
    const where: Record<string, unknown> = { organizationId: orgId };

    if (filters.type) where.consentType = filters.type;
    if (filters.from || filters.to) {
      where.acceptedAt = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    return this.prisma.consentRecord.findMany({
      where,
      orderBy: { acceptedAt: 'desc' },
    });
  }

  async exportConsentsPdf(orgId: string, consentId?: string) {
    const where: Record<string, unknown> = { organizationId: orgId };
    if (consentId) where.id = consentId;

    const records = await this.prisma.consentRecord.findMany({ where });
    // In production, generate PDF via puppeteer/pdfkit
    return { records, format: 'pdf', message: 'PDF generation queued' };
  }

  async exportConsentsCsv(filters: {
    orgId?: string;
    type?: string;
    from?: Date;
    to?: Date;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.orgId) where.organizationId = filters.orgId;
    if (filters.type) where.consentType = filters.type;
    if (filters.from || filters.to) {
      where.acceptedAt = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    const records = await this.prisma.consentRecord.findMany({ where });

    const csv = [
      'id,organizationId,consentType,acceptedAt,ip,userAgent',
      ...records.map(
        (r) =>
          `${r.id},${r.organizationId ?? ''},${r.consentType},${r.acceptedAt.toISOString()},${r.ip ?? ''},${r.userAgent ?? ''}`,
      ),
    ].join('\n');

    return { csv };
  }

  async setDigestFrequency(
    orgId: string,
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'OFF',
  ) {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { digestFrequency: frequency },
    });

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Audit logs
  // -------------------------------------------------------------------------
  async getAuditLogs(filters: {
    orgId?: string;
    action?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (filters.orgId) where.organizationId = filters.orgId;
    if (filters.action) where.action = filters.action;
    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      };
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, page, limit, data: logs };
  }

  // -------------------------------------------------------------------------
  // API Usage
  // -------------------------------------------------------------------------
  async getApiUsage() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [byProvider, byCustomer] = await Promise.all([
      this.prisma.apiUsageLog.groupBy({
        by: ['provider'],
        _sum: { costUsd: true, tokens: true },
        _count: { id: true },
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.apiUsageLog.groupBy({
        by: ['organizationId'],
        _sum: { costUsd: true, tokens: true },
        _count: { id: true },
        where: { createdAt: { gte: startOfMonth } },
        orderBy: { _sum: { costUsd: 'desc' } },
        take: 20,
      }),
    ]);

    const totalCost = byProvider.reduce(
      (sum: number, r: typeof byProvider[0]) => sum + Number(r._sum.costUsd ?? 0),
      0,
    );

    return { totalCost, byProvider, byCustomer };
  }

  // -------------------------------------------------------------------------
  // System Queues
  // -------------------------------------------------------------------------
  async getSystemQueues() {
    // Return queue metadata from the DB job tracking table
    const queues = await this.prisma.queueJob.groupBy({
      by: ['queueName', 'status'],
      _count: { id: true },
    });

    const grouped: Record<
      string,
      { waiting: number; active: number; completed: number; failed: number }
    > = {};

    for (const q of queues) {
      if (!grouped[q.queueName]) {
        grouped[q.queueName] = {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
        };
      }
      const status = q.status.toLowerCase() as keyof (typeof grouped)[string];
      if (status in grouped[q.queueName]) {
        grouped[q.queueName][status] = q._count.id;
      }
    }

    return grouped;
  }

  // -------------------------------------------------------------------------
  // System Settings
  // -------------------------------------------------------------------------
  async getSystemSettings() {
    return this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async updateSystemSetting(key: string, value: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  // -------------------------------------------------------------------------
  // Content / Outreach Review
  // -------------------------------------------------------------------------
  async getPendingContentReview() {
    return this.prisma.blogPost.findMany({
      where: { status: 'REVIEW' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getPendingOutreachReview() {
    return this.prisma.outreachEmail.findMany({
      where: { status: 'REPLIED', reviewedAt: null },
      include: {
        outreachCampaign: { include: { project: true } },
      },
      orderBy: { repliedAt: 'asc' },
    });
  }

  // -------------------------------------------------------------------------
  // Market Disputes
  // -------------------------------------------------------------------------
  async getMarketDisputes() {
    return this.prisma.marketplaceDispute.findMany({
      where: { status: 'OPEN' },
      include: {
        offer: true,
        buyer: true,
        seller: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // -------------------------------------------------------------------------
  // Plans CRUD
  // -------------------------------------------------------------------------
  async getPlans() {
    return this.prisma.plan.findMany({ orderBy: { monthlyPrice: 'asc' } });
  }

  async createPlan(dto: {
    name: string;
    slug: string;
    monthlyPrice: number;
    yearlyPrice: number;
    currency: string;
    limits: Record<string, unknown>;
    features?: Record<string, unknown>;
  }) {
    return this.prisma.plan.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        monthlyPrice: dto.monthlyPrice,
        yearlyPrice: dto.yearlyPrice,
        currency: dto.currency,
        limits: dto.limits as object,
      },
    });
  }

  async updatePlan(planId: string, dto: Partial<Parameters<typeof this.createPlan>[0]>) {
    return this.prisma.plan.update({ where: { id: planId }, data: dto as Record<string, unknown> });
  }

  async deletePlan(planId: string) {
    return this.prisma.plan.delete({ where: { id: planId } });
  }

  // -------------------------------------------------------------------------
  // Customer health
  // -------------------------------------------------------------------------
  async getCustomerHealth() {
    const orgs = await this.prisma.organization.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
    });

    const health = await Promise.all(
      orgs.map(async (org) => ({
        orgId: org.id,
        orgName: org.name,
        score: await this.computeOrgHealthScore(org.id),
      })),
    );

    return health.sort((a, b) => a.score - b.score);
  }
}
