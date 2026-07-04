import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ConfigService } from '@nestjs/config';
import { VakifBankService, CardData } from './vakifbank.service';
import { ParasutService } from './parasut.service';
import { CurrencyService } from './currency.service';
import { BillingCycle, InvoiceStatus, WalletTxType } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { DEFAULT_PLAN_LIMITS } from '@funbreakseo/shared';

export interface BillingProfileDto {
  invoiceType: 'INDIVIDUAL' | 'CORPORATE';
  companyTitle?: string;
  taxOffice?: string;
  taxNumber?: string;
  tckn?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface SubscribeDto {
  planId: string;
  cycle: BillingCycle;
  couponCode?: string;
  billingProfile: BillingProfileDto;
  card: CardData;
  consents: string[];
  ip?: string;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly mailer: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly vakifbank: VakifBankService,
    private readonly parasut: ParasutService,
    private readonly currency: CurrencyService,
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

  // ─── Plans ───────────────────────────────────────────────────────────────────

  async getPlans(locale = 'tr', targetCurrency = 'TRY') {
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const rates = await this.currency.getRates('TRY');

    return plans.map((plan) => {
      const monthlyBase = parseFloat(plan.monthlyPrice.toString());
      const yearlyBase = parseFloat(plan.yearlyPrice.toString());
      const rate = rates[targetCurrency] ?? 1;

      return {
        ...plan,
        monthlyPrice: +(monthlyBase * rate).toFixed(2),
        yearlyPrice: +(yearlyBase * rate).toFixed(2),
        displayCurrency: targetCurrency,
      };
    });
  }

  // ─── Subscribe ───────────────────────────────────────────────────────────────

  async subscribe(orgId: string, dto: SubscribeDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    let amount =
      dto.cycle === 'YEARLY'
        ? parseFloat(plan.yearlyPrice.toString())
        : parseFloat(plan.monthlyPrice.toString());

    // Apply coupon
    if (dto.couponCode) {
      const discount = await this.applyCoupon(dto.couponCode, dto.planId, dto.cycle);
      amount = Math.max(0, amount - discount.discountAmount);
    }

    // Save/update billing profile
    await this.prisma.billingProfile.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, ...dto.billingProfile },
      update: dto.billingProfile,
    });

    const callbackUrl = `${this.config.get('APP_BASE_URL', 'https://app.funbreakseo.com')}/api/v1/webhooks/vakifbank`;
    const orderId = `ORD-${orgId.slice(0, 8)}-${Date.now()}`;

    // Initiate 3D Secure
    const { html3d, transactionId } = await this.vakifbank.initPayment(
      orderId,
      amount,
      plan.currency,
      dto.card,
      callbackUrl,
    );

    // Store pending subscription intent
    await this.prisma.subscription.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        planId: plan.id,
        status: 'TRIALING',
        billingCycle: dto.cycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 86_400_000),
        paymentProviderRef: orderId,
      },
      update: {
        planId: plan.id,
        billingCycle: dto.cycle,
        paymentProviderRef: orderId,
        status: 'TRIALING',
      },
    });

    return { html3d, transactionId, orderId };
  }

  // ─── Resolve plan UUID from slug/key ─────────────────────────────────────────

  async resolvePlanId(planKey?: string): Promise<string | null> {
    if (!planKey) return null;
    const plan = await this.prisma.plan.findFirst({ where: { slug: planKey } });
    return plan?.id ?? null;
  }

  // ─── Change Plan ─────────────────────────────────────────────────────────────

  async changePlan(orgId: string, planId: string, billingCycle?: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const cycle = (billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY') as BillingCycle;
    const now = new Date();
    const periodEnd = cycle === 'YEARLY'
      ? new Date(now.getTime() + 365 * 86_400_000)
      : new Date(now.getTime() + 30 * 86_400_000);

    // ── Wallet deduction ──────────────────────────────────────────────────────
    const planPrice = cycle === 'YEARLY'
      ? parseFloat(plan.yearlyPrice.toString())
      : parseFloat(plan.monthlyPrice.toString());

    if (planPrice > 0) {
      const orgRows = await this.prisma.$queryRaw<Array<{ walletBalance: string }>>`
        SELECT "walletBalance" FROM organizations WHERE id = ${orgId} LIMIT 1
      `;
      const walletBalance = parseFloat(orgRows[0]?.walletBalance ?? '0');
      if (walletBalance > 0) {
        const deduct = Math.min(walletBalance, planPrice);
        const newBalance = walletBalance - deduct;
        await this.prisma.$executeRaw`
          UPDATE organizations
          SET "walletBalance" = ${newBalance}, "updatedAt" = NOW()
          WHERE id = ${orgId}
        `;
        await this.prisma.walletTransaction.create({
          data: {
            organizationId: orgId,
            type: 'SPEND',
            amount: deduct,
            balanceAfter: newBalance,
            refType: 'plan_change',
            refId: planId,
            description: `Plan değişikliği: ${plan.slug} (${cycle}) — ₺${deduct.toFixed(2)} cüzdandan düşüldü`,
          },
        });
        this.logger.log(`Wallet deducted ₺${deduct} for org ${orgId} plan change to ${plan.slug}`);
      }
    }

    // ── Upsert subscription (works whether or not one already exists) ─────────
    const updated = await this.prisma.subscription.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        planId,
        billingCycle: cycle,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        planId,
        billingCycle: cycle,
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    await this.provisionSubscription(orgId, planId);

    return updated;
  }

  // ─── Cancel Subscription ─────────────────────────────────────────────────────

  async cancelSubscription(orgId: string, reason: string, feedback?: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
    if (!sub) throw new NotFoundException('No active subscription');

    await this.prisma.subscription.update({
      where: { organizationId: orgId },
      data: { cancelAtPeriodEnd: true },
    });

    await this.prisma.cancellationFeedback.create({
      data: {
        organizationId: orgId,
        reason: reason as any,
        comment: feedback,
      },
    });

    return { message: 'Subscription will cancel at period end' };
  }

  // ─── Apply Coupon ─────────────────────────────────────────────────────────────

  async applyCoupon(code: string, planId: string, cycle: BillingCycle) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });

    if (
      !coupon ||
      !coupon.isActive ||
      (coupon.validUntil && coupon.validUntil < new Date()) ||
      coupon.validFrom > new Date()
    ) {
      throw new BadRequestException('Invalid or expired coupon');
    }

    if (coupon.maxRedemptions && coupon.redemptionCount >= coupon.maxRedemptions) {
      throw new BadRequestException('Coupon redemption limit reached');
    }

    const applicablePlans = coupon.applicablePlans as string[] | null;
    if (applicablePlans && !applicablePlans.includes(planId)) {
      throw new BadRequestException('Coupon not applicable to this plan');
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const price =
      cycle === 'YEARLY'
        ? parseFloat(plan.yearlyPrice.toString())
        : parseFloat(plan.monthlyPrice.toString());

    let discountAmount = 0;
    if (coupon.type === 'PERCENT') {
      discountAmount = (price * parseFloat(coupon.value.toString())) / 100;
    } else if (coupon.type === 'FIXED') {
      discountAmount = parseFloat(coupon.value.toString());
    } else if (coupon.type === 'FIRST_MONTH_FREE') {
      discountAmount = parseFloat(plan.monthlyPrice.toString());
    }

    discountAmount = Math.min(discountAmount, price);

    return {
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      discountAmount: +discountAmount.toFixed(2),
      finalPrice: +(price - discountAmount).toFixed(2),
    };
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────────

  async getInvoices(orgId: string) {
    return this.prisma.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async getInvoicePdf(invoiceId: string, orgId: string): Promise<string> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    if (invoice.pdfUrl) return invoice.pdfUrl;

    if (invoice.parasutInvoiceId) {
      const url = await this.parasut.getInvoicePdf(invoice.parasutInvoiceId);
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { pdfUrl: url },
      });
      return url;
    }

    throw new NotFoundException('PDF not available');
  }

  // ─── Wallet ───────────────────────────────────────────────────────────────────

  async walletTopup(orgId: string, amount: number, card?: CardData) {
    if (!card) {
      // Direct wallet credit for admin-initiated or pre-approved topups
      const tx = await this.prisma.walletTransaction.create({
        data: {
          organizationId: orgId,
          amount,
          balanceAfter: 0,
          type: 'TOPUP',
          description: `Bakiye yükleme talebi: ₺${amount}`,
        },
      });
      return { message: 'Bakiye yükleme talebiniz alındı. Ödeme için kart bilgileri gerekiyor.', transactionId: tx.id, requiresCard: true };
    }
    const callbackUrl = `${this.config.get('APP_BASE_URL', 'https://app.funbreakseo.com')}/api/v1/webhooks/vakifbank`;
    const orderId = `WAL-${orgId.slice(0, 8)}-${Date.now()}`;

    return this.vakifbank.initPayment(orderId, amount, 'TRY', card, callbackUrl);
  }

  async getWalletTransactions(orgId: string) {
    return this.prisma.walletTransaction.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getSubscription(orgId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId: orgId },
      include: { plan: true },
    });
    if (!sub) return null;
    return {
      id: sub.id,
      planId: sub.planId,
      planKey: sub.plan.slug,
      status: sub.status,
      billingCycle: sub.billingCycle,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      isComplimentary: sub.isComplimentary,
      plan: sub.plan,
    };
  }

  async getUsage(orgId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId: orgId },
      include: { plan: true },
    });

    // Always derive limits from canonical DEFAULT_PLAN_LIMITS by plan slug
    // so display and enforcement always agree regardless of DB plan.limits JSON
    const planSlug = (sub?.plan?.slug ?? 'starter') as keyof typeof DEFAULT_PLAN_LIMITS;
    const planLimits = DEFAULT_PLAN_LIMITS[planSlug] ?? DEFAULT_PLAN_LIMITS.starter;

    const [keywords, crawls, aiBlogs, geoQueries] = await Promise.all([
      this.prisma.keyword.count({
        where: { project: { organizationId: orgId } },
      }),
      this.prisma.crawlJob.count({
        where: {
          project: { organizationId: orgId },
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      this.prisma.contentItem.count({
        where: {
          project: { organizationId: orgId },
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      this.prisma.geoQuery.count({
        where: {
          project: { organizationId: orgId },
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
    ]);

    return {
      keywords:   { used: keywords,   limit: planLimits.keywords },
      crawls:     { used: crawls,     limit: planLimits.monthlyCrawls },
      aiBlogs:    { used: aiBlogs,    limit: planLimits.aiBlogsPerProject },
      geoQueries: { used: geoQueries, limit: planLimits.geoQueries },
    };
  }

  async getWallet(orgId: string) {
    const orgRows = await this.prisma.$queryRaw<Array<{ walletBalance: string }>>`
      SELECT "walletBalance" FROM organizations WHERE id = ${orgId} LIMIT 1
    `;
    const balance = parseFloat(orgRows[0]?.walletBalance ?? '0');
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return { balance, transactions };
  }

  // ─── VakıfBank Webhook ───────────────────────────────────────────────────────

  async handleVakifbankWebhook(payload: Record<string, string>) {
    const hash = payload['MAC'] ?? '';
    const isValid = this.vakifbank.verifyCallback(payload, hash);

    if (!isValid) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    const orderId = payload['OrderId'];
    const responseCode = payload['ResponseCode'];
    const approvedCode = payload['ApprovedCode'];

    if (responseCode !== '00' && !approvedCode) {
      this.logger.warn(`Payment failed for order ${orderId}`);
      return { status: 'failed' };
    }

    // Find subscription by orderId
    const subscription = await this.prisma.subscription.findFirst({
      where: { paymentProviderRef: orderId },
      include: { organization: { include: { billingProfile: true } } },
    });

    if (!subscription) {
      this.logger.warn(`No subscription found for order ${orderId}`);
      return { status: 'ignored' };
    }

    const org = subscription.organization;
    const amount = parseFloat(payload['Amount'] ?? '0') / 100;
    const now = new Date();

    // Activate subscription
    const periodEnd =
      subscription.billingCycle === 'YEARLY'
        ? new Date(now.getTime() + 365 * 86_400_000)
        : new Date(now.getTime() + 30 * 86_400_000);

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
        pastDueSince: null,
      },
    });

    // Generate invoice number
    const invoiceCount = await this.prisma.invoice.count();
    const invoiceNumber = `FBS-${String(invoiceCount + 1).padStart(6, '0')}`;
    const tax = +(amount * 0.2).toFixed(2);
    const total = +(amount).toFixed(2);

    // Create internal invoice record
    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId: org.id,
        subscriptionId: subscription.id,
        number: invoiceNumber,
        amount: amount - tax,
        tax,
        total,
        currency: 'TRY',
        status: InvoiceStatus.PAID,
        paidAt: now,
        paymentProviderRef: approvedCode,
      },
    });

    // Cut Paraşüt e-invoice
    try {
      const bp = org.billingProfile;
      const parasutInvoiceId = await this.parasut.createInvoice({
        itemType: 'invoice',
        description: `FunBreak SEO Abonelik - ${invoiceNumber}`,
        issueDate: now.toISOString().split('T')[0],
        currency: 'TRY',
        contactId: org.id, // Paraşüt contact id (should be mapped)
        billingAddress: bp?.address ?? undefined,
        billingCity: bp?.city ?? undefined,
        billingCountry: bp?.country ?? 'TR',
        taxNumber: bp?.taxNumber ?? undefined,
        lines: [
          {
            quantity: 1,
            unitPrice: amount - tax,
            vatRate: 20,
            name: `FunBreak SEO Abonelik`,
          },
        ],
      });

      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { parasutInvoiceId },
      });
    } catch (err) {
      this.logger.error('Paraşüt invoice failed', err);
    }

    // Provision features
    await this.provisionSubscription(org.id, subscription.planId);

    // Send admin notification
    await this.mailer.sendMail({
      from: `"FunBreak SEO" <${this.config.get('SMTP_FROM', 'noreply@funbreakseo.com')}>`,
      to: this.config.get<string>('ADMIN_EMAIL', 'admin@funbreakseo.com'),
      subject: `Yeni Ödeme: ${invoiceNumber} — ${total} TRY`,
      html: `<p>Organizasyon: ${org.name}<br>Fatura: ${invoiceNumber}<br>Tutar: ${total} TRY</p>`,
    });

    return { status: 'ok', invoiceId: invoice.id };
  }

  // ─── Provision Subscription ──────────────────────────────────────────────────

  async provisionSubscription(orgId: string, planId: string): Promise<void> {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return;

    // The limits JSON on plan drives what gets unlocked.
    // For now we just ensure the subscription record is correct — the
    // enforcement is done at query time by reading plan.limits.
    this.logger.log(
      `Subscription provisioned for org ${orgId} on plan ${plan.slug}`,
    );
  }
}
