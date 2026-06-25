import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AffiliateService {
  constructor(private readonly prisma: PrismaService) {}

  private generateCode(): string {
    return randomBytes(6).toString('hex').toUpperCase();
  }

  async getOrCreateAffiliate(orgId: string) {
    let affiliate = await this.prisma.affiliate.findFirst({ where: { organizationId: orgId } });

    if (!affiliate) {
      affiliate = await this.prisma.affiliate.create({
        data: {
          organizationId: orgId,
          code: this.generateCode(),
          commissionRate: 0.2, // 20% default
          status: 'ACTIVE',
        },
      });
    }

    return affiliate;
  }

  async getMyAffiliate(orgId: string) {
    const affiliate = await this.getOrCreateAffiliate(orgId);

    const [clicks, signups, commissions] = await Promise.all([
      this.prisma.affiliateClick.count({ where: { affiliateId: affiliate.id } }),
      this.prisma.affiliateConversion.count({
        where: { affiliateId: affiliate.id },
      }),
      this.prisma.affiliateCommission.aggregate({
        _sum: { amount: true },
        where: { affiliateId: affiliate.id, status: 'APPROVED' },
      }),
    ]);

    const pendingPayout = await this.prisma.affiliateCommission.aggregate({
      _sum: { amount: true },
      where: { affiliateId: affiliate.id, status: 'PENDING' },
    });

    const baseUrl = process.env.FRONTEND_URL ?? 'https://funbreakseo.com';
    const referralLink = `${baseUrl}?ref=${affiliate.code}`;

    return {
      ...affiliate,
      referralLink,
      stats: {
        clicks,
        signups,
        totalEarned: Number(commissions._sum?.amount ?? 0),
        pendingPayout: Number(pendingPayout._sum?.amount ?? 0),
      },
    };
  }

  async trackClick(code: string, userAgent: string, ip: string) {
    const affiliate = await this.prisma.affiliate.findFirst({
      where: { code, status: 'ACTIVE' },
    });

    if (!affiliate) return { tracked: false };

    await this.prisma.affiliateClick.create({
      data: {
        affiliateId: affiliate.id,
        userAgent,
        ip,
      },
    });

    return { tracked: true };
  }

  async trackSignup(code: string, newOrgId: string) {
    const affiliate = await this.prisma.affiliate.findFirst({
      where: { code, status: 'ACTIVE' },
    });

    if (!affiliate) return;

    await this.prisma.affiliateConversion.create({
      data: {
        affiliateId: affiliate.id,
        referredOrgId: newOrgId,
        type: 'SIGNUP',
      },
    });

    // Tag the org with the referral code for later conversion tracking
    await this.prisma.organization.update({
      where: { id: newOrgId },
      data: { referralCode: code, referredByAffiliateId: affiliate.id },
    });
  }

  async trackConversion(orgId: string, planId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org?.referredByAffiliateId) return;

    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id: org.referredByAffiliateId },
    });
    if (!affiliate) return;

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return;

    const commission = Number(plan.monthlyPrice) * Number(affiliate.commissionRate);

    await this.prisma.$transaction([
      this.prisma.affiliateConversion.create({
        data: {
          affiliateId: affiliate.id,
          referredOrgId: orgId,
          type: 'SALE',
          planId,
          amount: Number(plan.monthlyPrice),
        },
      }),
      this.prisma.affiliateCommission.create({
        data: {
          affiliateId: affiliate.id,
          amount: commission,
          status: 'PENDING',
          description: `Commission for plan ${plan.name} sale`,
        },
      }),
    ]);
  }

  async requestPayout(affiliateId: string, amount: number) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id: affiliateId },
    });
    if (!affiliate) throw new NotFoundException('Affiliate not found');

    const availableBalance = await this.prisma.affiliateCommission.aggregate({
      _sum: { amount: true },
      where: { affiliateId, status: 'APPROVED' },
    });

    const available = Number(availableBalance._sum?.amount ?? 0);
    if (amount > available) {
      throw new BadRequestException(
        `Insufficient balance. Available: $${available}`,
      );
    }

    return this.prisma.affiliatePayout.create({
      data: {
        affiliateId,
        amount,
        status: 'PENDING',
      },
    });
  }

  async getReferrals(orgId: string) {
    const affiliate = await this.prisma.affiliate.findFirst({ where: { organizationId: orgId } });
    if (!affiliate) return [];

    return this.prisma.affiliateConversion.findMany({
      where: { affiliateId: affiliate.id },
      include: {
        referredOrg: { select: { id: true, name: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPayouts(orgId: string) {
    const affiliate = await this.prisma.affiliate.findFirst({ where: { organizationId: orgId } });
    if (!affiliate) return [];
    return this.prisma.affiliatePayout.findMany({
      where: { affiliateId: affiliate.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestPayoutByOrg(orgId: string, amount: number) {
    const affiliate = await this.prisma.affiliate.findFirst({ where: { organizationId: orgId } });
    if (!affiliate) throw new NotFoundException('Affiliate not found');
    return this.requestPayout(affiliate.id, amount);
  }

  // Admin
  async getAllAffiliates() {
    return this.prisma.affiliate.findMany({
      include: {
        organization: { select: { id: true, name: true } },
        commissions: { where: { status: 'PENDING' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveCommission(affiliateId: string, amount: number) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id: affiliateId },
    });
    if (!affiliate) throw new NotFoundException('Affiliate not found');

    // Approve all pending commissions up to amount
    const pending = await this.prisma.affiliateCommission.findMany({
      where: { affiliateId, status: 'PENDING' },
    });

    for (const commission of pending) {
      await this.prisma.affiliateCommission.update({
        where: { id: commission.id },
        data: { status: 'APPROVED' },
      });
    }

    // Also credit the wallet
    let wallet = await this.prisma.wallet.findFirst({
      where: { organizationId: affiliate.organizationId },
    });
    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { organizationId: affiliate.organizationId, balance: 0 },
      });
    }

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    });

    return { success: true, approvedAmount: amount };
  }

  async setCommissionRate(rate: number) {
    if (rate < 0 || rate > 1) {
      throw new BadRequestException('Rate must be between 0 and 1');
    }

    await this.prisma.systemSetting.upsert({
      where: { key: 'affiliate_commission_rate' },
      create: { key: 'affiliate_commission_rate', value: String(rate) },
      update: { value: String(rate) },
    });

    return { success: true, rate };
  }
}
