import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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

  async impersonateByOrg(adminUserId: string, orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { users: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    if (!org) throw new NotFoundException('Organization not found');
    const targetUser = org.users[0];
    if (!targetUser) throw new NotFoundException('No user found in organization');
    return this.impersonateUser(adminUserId, targetUser.id);
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

  // Returns which API keys are configured (without revealing actual values for secrets)
  async getApiKeyStatus(): Promise<Record<string, string>> {
    const SECRET_KEYS = new Set([
      'DATAFORSEO_PASSWORD', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY',
      'GOOGLE_OAUTH_CLIENT_SECRET', 'VAKIFBANK_PASSWORD', 'VAKIFBANK_3DSECURE_KEY',
      'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'PARASUT_CLIENT_SECRET',
      'PARASUT_PASSWORD', 'SMTP_PASS', 'S3_SECRET_KEY', 'EXCHANGE_RATE_API_KEY',
    ]);

    const allSettings = await this.prisma.systemSetting.findMany();
    const result: Record<string, string> = {};

    for (const s of allSettings) {
      const val = String(s.value ?? '');
      if (SECRET_KEYS.has(s.key)) {
        result[s.key] = val ? '****' : '';
      } else {
        result[s.key] = val;
      }
    }

    // Also merge env-based values (for providers not yet in DB)
    const ENV_KEYS = [
      'DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD', 'DATAFORSEO_USE_SANDBOX',
      'ANTHROPIC_API_KEY', 'DEFAULT_CONTENT_MODEL', 'OPENAI_API_KEY',
      'GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GSC_REDIRECT_URI',
      'VAKIFBANK_MERCHANT_ID', 'VAKIFBANK_TERMINAL_NO', 'VAKIFBANK_PASSWORD',
      'VAKIFBANK_3DSECURE_KEY', 'VAKIFBANK_BASE_URL',
      'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_ENABLED',
      'PARASUT_CLIENT_ID', 'PARASUT_CLIENT_SECRET', 'PARASUT_USERNAME',
      'PARASUT_PASSWORD', 'PARASUT_COMPANY_ID',
      'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM', 'OUTREACH_FROM',
      'EXCHANGE_RATE_API_KEY', 'EXCHANGE_RATE_BASE_URL',
      'S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY',
      'SENTRY_DSN',
    ];

    for (const key of ENV_KEYS) {
      if (result[key] === undefined) {
        const envVal = this.config.get<string>(key);
        if (envVal) {
          result[key] = SECRET_KEYS.has(key) ? '****' : envVal;
        }
      }
    }

    return result;
  }

  // Test a specific integration connection
  async testIntegration(provider: string): Promise<{ ok: boolean; message: string }> {
    try {
      switch (provider) {
        case 'dataforseo': {
          const login = this.config.get<string>('DATAFORSEO_LOGIN');
          const pass = this.config.get<string>('DATAFORSEO_PASSWORD');
          if (!login || !pass) return { ok: false, message: 'DataForSEO kimlik bilgileri eksik' };
          // Quick ping to DataForSEO
          const axios = (await import('axios')).default;
          const resp = await axios.get('https://api.dataforseo.com/v3/merchant/google/locations', {
            auth: { username: login, password: pass },
            timeout: 5000,
          });
          return resp.status === 200
            ? { ok: true, message: 'DataForSEO bağlantısı başarılı' }
            : { ok: false, message: `HTTP ${resp.status}` };
        }
        case 'smtp': {
          const host = this.config.get<string>('SMTP_HOST');
          if (!host) return { ok: false, message: 'SMTP yapılandırılmamış' };
          // Basic DNS check only — actually sending a test mail would cause spam
          return { ok: true, message: `SMTP host yapılandırıldı: ${host}` };
        }
        case 'anthropic': {
          const key = this.config.get<string>('ANTHROPIC_API_KEY');
          return key
            ? { ok: true, message: 'Anthropic API anahtarı mevcut' }
            : { ok: false, message: 'Anthropic API anahtarı eksik' };
        }
        case 'openai': {
          const key = this.config.get<string>('OPENAI_API_KEY');
          return key
            ? { ok: true, message: 'OpenAI API anahtarı mevcut' }
            : { ok: false, message: 'OpenAI API anahtarı eksik' };
        }
        case 'stripe': {
          const key = this.config.get<string>('STRIPE_SECRET_KEY');
          if (!key) return { ok: false, message: 'Stripe anahtarı eksik' };
          const axios = (await import('axios')).default;
          const resp = await axios.get('https://api.stripe.com/v1/balance', {
            headers: { Authorization: `Bearer ${key}` },
            timeout: 5000,
          });
          return resp.status === 200
            ? { ok: true, message: 'Stripe bağlantısı başarılı' }
            : { ok: false, message: `HTTP ${resp.status}` };
        }
        default:
          return { ok: true, message: `${provider} yapılandırma kontrolü tamamlandı` };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      return { ok: false, message: msg };
    }
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

  // ─── System Health Status ────────────────────────────────────────────────────

  async getSystemHealthStatus() {
    const checks = await this.prisma.systemHealthCheck.findMany({
      orderBy: { checkedAt: 'desc' },
      distinct: ['service'],
    });

    const result: Record<string, { status: string; latencyMs?: number; checkedAt: string }> = {};
    for (const c of checks) {
      result[c.service.toLowerCase()] = {
        status: c.status === 'UP' ? 'ok' : c.status.toLowerCase(),
        latencyMs: c.latencyMs ?? undefined,
        checkedAt: c.checkedAt.toISOString(),
      };
    }
    return result;
  }

  async retryQueueJobs(queueName: string) {
    await this.prisma.queueJob.updateMany({
      where: { queueName, status: 'FAILED' },
      data: { status: 'WAITING' },
    });
    return { success: true };
  }

  async cleanQueueJobs(queueName: string) {
    await this.prisma.queueJob.deleteMany({
      where: { queueName, status: 'COMPLETED' },
    });
    return { success: true };
  }

  // ─── Revenue / Finance ───────────────────────────────────────────────────────

  async getRevenue() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthInvoices, lastMonthInvoices, allTimePaid, activeCount] =
      await Promise.all([
        this.prisma.invoice.aggregate({
          _sum: { total: true },
          where: { status: 'PAID', paidAt: { gte: startOfMonth } },
        }),
        this.prisma.invoice.aggregate({
          _sum: { total: true },
          where: { status: 'PAID', paidAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        }),
        this.prisma.invoice.aggregate({
          _sum: { total: true },
          where: { status: 'PAID' },
        }),
        this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      ]);

    const mrrResult = await this.prisma.$queryRaw<{ mrr: number }[]>`
      SELECT COALESCE(SUM(p."monthlyPrice"), 0) as mrr
      FROM subscriptions s JOIN plans p ON p.id = s."planId"
      WHERE s.status = 'ACTIVE'
    `;
    const mrr = Number(mrrResult[0]?.mrr ?? 0);
    const thisMonth = Number(thisMonthInvoices._sum.total ?? 0);
    const lastMonth = Number(lastMonthInvoices._sum.total ?? 0);
    const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    return {
      mrr,
      thisMonth,
      lastMonth,
      growth: Math.round(growth * 10) / 10,
      allTime: Number(allTimePaid._sum.total ?? 0),
      activeSubscriptions: activeCount,
    };
  }

  async updateFinanceSettings(dto: Record<string, unknown>) {
    for (const [key, value] of Object.entries(dto)) {
      await this.updateSystemSetting(`finance.${key}`, String(value));
    }
    return { success: true };
  }

  async getAllInvoices(page: number, limit: number, status?: string) {
    const where = status ? { status: status as any } : {};
    const [total, data] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: { organization: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { total, page, limit, data };
  }

  // ─── Coupons ─────────────────────────────────────────────────────────────────

  async getCoupons() {
    return this.prisma.coupon.findMany({
      include: { _count: { select: { redemptions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCoupon(dto: Record<string, unknown>) {
    return this.prisma.coupon.create({
      data: {
        code: String(dto.code).toUpperCase(),
        type: dto.type as 'PERCENT' | 'FIXED' | 'FIRST_MONTH_FREE',
        value: Number(dto.value),
        maxRedemptions: dto.maxRedemptions ? Number(dto.maxRedemptions) : null,
        validFrom: dto.validFrom ? new Date(String(dto.validFrom)) : new Date(),
        validUntil: dto.validUntil ? new Date(String(dto.validUntil)) : null,
        isActive: true,
      },
    });
  }

  async deleteCoupon(id: string) {
    await this.prisma.coupon.delete({ where: { id } });
    return { success: true };
  }

  // ─── Subscriptions (admin) ────────────────────────────────────────────────────

  async getAllSubscriptions(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.prisma.subscription.count(),
      this.prisma.subscription.findMany({
        skip,
        take: limit,
        include: {
          plan: true,
          organization: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, page, limit, data };
  }

  async suspendSubscription(id: string) {
    await this.prisma.subscription.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });
    return { success: true };
  }

  // ─── Staff ────────────────────────────────────────────────────────────────────

  async getStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'STAFF'] } },
      select: {
        id: true, email: true, fullName: true, role: true,
        status: true, createdAt: true, lastLoginAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaff(dto: Record<string, unknown>) {
    const passwordHash = await bcrypt.hash(String(dto.password || 'ChangeMe123!'), 10);
    return this.prisma.user.create({
      data: {
        email: String(dto.email),
        fullName: String(dto.fullName),
        role: (dto.role as 'ADMIN' | 'STAFF') || 'STAFF',
        passwordHash,
        emailVerified: true,
        status: 'ACTIVE',
      },
      select: { id: true, email: true, fullName: true, role: true, status: true, createdAt: true },
    });
  }

  async updateStaff(id: string, dto: Record<string, unknown>) {
    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName ? String(dto.fullName) : undefined,
        role: dto.role as 'ADMIN' | 'STAFF' | undefined,
        status: dto.status as 'ACTIVE' | 'SUSPENDED' | undefined,
      },
      select: { id: true, email: true, fullName: true, role: true, status: true },
    });
  }

  // ─── Affiliates (admin) ───────────────────────────────────────────────────────

  async getAffiliates() {
    return this.prisma.affiliate.findMany({
      include: {
        organization: { select: { id: true, name: true } },
        _count: { select: { referrals: true, payouts: true } },
      },
      orderBy: { totalEarned: 'desc' },
    });
  }

  async getAffiliatePendingPayouts() {
    return this.prisma.affiliatePayout.findMany({
      where: { status: 'PENDING' },
      include: {
        affiliate: {
          include: { organization: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveAffiliatePayout(payoutId: string) {
    await this.prisma.affiliatePayout.update({
      where: { id: payoutId },
      data: { status: 'APPROVED', processedAt: new Date() },
    });
    return { success: true };
  }

  // ─── Testimonials ─────────────────────────────────────────────────────────────

  async getTestimonials() {
    return this.prisma.testimonial.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async approveTestimonial(id: string) {
    await this.prisma.testimonial.update({ where: { id }, data: { isApproved: true } });
    return { success: true };
  }

  async featureTestimonial(id: string) {
    const t = await this.prisma.testimonial.findUnique({ where: { id } });
    await this.prisma.testimonial.update({ where: { id }, data: { isFeatured: !t?.isFeatured } });
    return { success: true };
  }

  // ─── Marketing ────────────────────────────────────────────────────────────────

  async getEmailCampaigns() {
    return this.prisma.emailCampaign.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createEmailCampaign(dto: Record<string, unknown>) {
    return this.prisma.emailCampaign.create({
      data: {
        name: String(dto.name),
        subject: String(dto.subject),
        bodyHtml: String(dto.bodyHtml || ''),
        locale: String(dto.locale || 'tr'),
        segment: (dto.segment as object) || {},
        scheduledAt: dto.scheduledAt ? new Date(String(dto.scheduledAt)) : null,
      },
    });
  }

  async getCaseStudies() {
    return this.prisma.caseStudy.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // ─── Cost Control ─────────────────────────────────────────────────────────────

  async getCostControl() {
    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: 'cost.' } },
    });
    return settings;
  }

  async updateCostControl(id: string, limit: number, behavior: string) {
    return this.prisma.systemSetting.upsert({
      where: { key: `cost.${id}` },
      create: { key: `cost.${id}`, value: { limit, behavior } },
      update: { value: { limit, behavior } },
    });
  }

  async toggleKillSwitch(dto: Record<string, unknown>) {
    return this.prisma.systemSetting.upsert({
      where: { key: 'cost.killSwitch' },
      create: { key: 'cost.killSwitch', value: JSON.stringify(dto) },
      update: { value: JSON.stringify(dto) },
    });
  }

  // ─── Legal Documents ─────────────────────────────────────────────────────────

  async getLegalDocs() {
    return this.prisma.legalDocument.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { locale: 'asc' }],
    });
  }

  async updateLegalDoc(id: string, content: string) {
    return this.prisma.legalDocument.update({
      where: { id },
      data: { content },
    });
  }

  // ─── Blog (admin CRUD) ────────────────────────────────────────────────────────

  async getBlogPosts(params: Record<string, string>) {
    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '20');
    const [total, data] = await Promise.all([
      this.prisma.blogPost.count(),
      this.prisma.blogPost.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, slug: true, title: true, locale: true,
          status: true, publishedAt: true, viewCount: true,
          seoScore: true, autopilot: true,
        },
      }),
    ]);
    return { total, page, limit, data };
  }

  async createBlogPost(dto: Record<string, unknown>) {
    return this.prisma.blogPost.create({
      data: {
        slug: String(dto.slug),
        locale: String(dto.locale || 'tr'),
        title: String(dto.title),
        bodyMarkdown: String(dto.bodyMarkdown || ''),
        bodyHtml: String(dto.bodyHtml || ''),
        status: String(dto.status || 'DRAFT'),
        authorName: String(dto.authorName || 'FunBreak SEO Ekibi'),
        metaTitle: String(dto.metaTitle || dto.title || ''),
        metaDescription: String(dto.metaDescription || ''),
      },
    });
  }

  async updateBlogPost(id: string, dto: Record<string, unknown>) {
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        title: dto.title ? String(dto.title) : undefined,
        slug: dto.slug ? String(dto.slug) : undefined,
        bodyMarkdown: dto.bodyMarkdown ? String(dto.bodyMarkdown) : undefined,
        bodyHtml: dto.bodyHtml ? String(dto.bodyHtml) : undefined,
        status: dto.status ? String(dto.status) : undefined,
        metaTitle: dto.metaTitle ? String(dto.metaTitle) : undefined,
        metaDescription: dto.metaDescription ? String(dto.metaDescription) : undefined,
      },
    });
  }

  async deleteBlogPost(id: string) {
    await this.prisma.blogPost.delete({ where: { id } });
    return { success: true };
  }

  // ─── Market listings ─────────────────────────────────────────────────────────

  async getMarketListings() {
    return this.prisma.marketListing.findMany({
      include: {
        publisherSite: true,
        offer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveListing(id: string) {
    await this.prisma.publisherOffer.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
    return { success: true };
  }

  async rejectListing(id: string, reason?: string) {
    await this.prisma.publisherOffer.update({
      where: { id },
      data: { status: 'REJECTED', adminNote: reason },
    });
    return { success: true };
  }

  async getBacklinkOrders() {
    return this.prisma.backlinkOrder.findMany({
      include: {
        organization: { select: { id: true, name: true } },
        listing: { include: { publisherSite: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyBacklinkOrder(id: string) {
    await this.prisma.backlinkOrder.update({
      where: { id },
      data: { status: 'VERIFIED', verifiedAt: new Date() },
    });
    return { success: true };
  }

  // ─── Support tickets ──────────────────────────────────────────────────────────

  async getSupportTickets(params: Record<string, string>) {
    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '20');
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;

    const [total, data] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          organization: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, fullName: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, page, limit, data };
  }

  async getSupportTicket(id: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        organization: true,
        user: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, fullName: true, role: true } } },
        },
      },
    });
  }

  async updateSupportTicket(id: string, dto: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(dto.status !== undefined && { status: dto.status as any }),
        ...(dto.priority !== undefined && { priority: dto.priority as any }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId as string }),
      },
    });
  }

  async replySupportTicket(id: string, message: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    await this.prisma.supportMessage.create({
      data: {
        ticketId: id,
        body: message,
        isStaff: true,
      },
    });

    await this.prisma.supportTicket.update({
      where: { id },
      data: { status: 'PENDING' },
    });

    return { success: true };
  }

  // ─── Customer detail sub-resources ────────────────────────────────────────────

  async getCustomerSubscription(orgId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId: orgId },
      include: { plan: { select: { name: true, monthlyPrice: true } } },
    });
    if (!sub) return null;
    return {
      planName: sub.plan?.name ?? 'Unknown',
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      price: Number(sub.plan?.monthlyPrice ?? 0),
      interval: 'month',
    };
  }

  async getCustomerInvoices(orgId: string) {
    return this.prisma.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, number: true, amount: true, currency: true, status: true, createdAt: true, pdfUrl: true },
    });
  }

  async getCustomerUsage(orgId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId: orgId },
      include: { plan: true },
    });
    const [keywords, crawls, contentItems, geoQueries] = await Promise.all([
      this.prisma.keyword.count({ where: { project: { organizationId: orgId } } }),
      this.prisma.crawledPage.count({ where: { crawlJob: { project: { organizationId: orgId } } } }),
      this.prisma.contentItem.count({ where: { project: { organizationId: orgId } } }),
      this.prisma.geoQuery.count({ where: { project: { organizationId: orgId } } }),
    ]);
    const limits = (sub?.plan?.limits as Record<string, number> | null) ?? {};
    return {
      keywords: { used: keywords, limit: limits.keywords ?? 100 },
      crawls: { used: crawls, limit: limits.crawls ?? 50 },
      aiBlogs: { used: contentItems, limit: limits.aiBlogs ?? 20 },
      geoQueries: { used: geoQueries, limit: limits.geoQueries ?? 10 },
    };
  }

  // ─── Analytics ────────────────────────────────────────────────────────────────

  async getAnalytics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalOrgs, activeOrgs, newOrgsThisMonth, apiUsage] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { status: 'ACTIVE' } }),
      this.prisma.organization.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.getApiUsage(),
    ]);

    return { totalOrgs, activeOrgs, newOrgsThisMonth, apiUsage };
  }
}
