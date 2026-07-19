import { ForbiddenException, Injectable } from '@nestjs/common';
import { DEFAULT_PLAN_LIMITS } from '@funbreakseo/shared';
import { PrismaService } from '../../prisma.service';

type PlanSlug = keyof typeof DEFAULT_PLAN_LIMITS;
type PlanLimits = (typeof DEFAULT_PLAN_LIMITS)[PlanSlug];

/**
 * Tek noktadan paket (plan) limiti kontrolü. billing.service.ts:getUsage() ile
 * aynı kaynağı (DEFAULT_PLAN_LIMITS) kullanır, böylece görüntülenen kullanım ile
 * gerçekte uygulanan limit hep tutarlı kalır.
 */
@Injectable()
export class PlanLimitService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlanLimits(organizationId: string): Promise<PlanLimits> {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
    const slug = (sub?.plan?.slug ?? 'starter') as PlanSlug;
    return DEFAULT_PLAN_LIMITS[slug] ?? DEFAULT_PLAN_LIMITS.starter;
  }

  /** Bu ayki crawl/full-scan (site denetimi) sayısı paket limitini aşıyor mu? */
  async assertCrawlWithinLimit(organizationId: string): Promise<void> {
    const limits = await this.getPlanLimits(organizationId);
    const { startOfMonth, endOfMonth } = this.monthRange();
    const used = await this.prisma.crawlJob.count({
      where: {
        project: { organizationId },
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });
    if (used >= limits.monthlyCrawls) {
      throw new ForbiddenException(
        `LIMIT_REACHED: Bu ayki site denetimi (crawl) limitinize ulaştınız (${used}/${limits.monthlyCrawls}). Daha yüksek bir pakete geçerek limitinizi artırabilirsiniz.`,
      );
    }
  }

  /** Backlink profili yeniden senkronizasyonu (DataForSEO çağrısı) paket limiti. */
  async assertFeatureWithinLimit(
    organizationId: string,
    feature: 'BACKLINK_SYNC' | 'COMPETITOR_COMPARE',
  ): Promise<void> {
    const limits = await this.getPlanLimits(organizationId);
    const limit =
      feature === 'BACKLINK_SYNC'
        ? limits.backlinkSyncsPerMonth
        : limits.competitorComparisonsPerMonth;

    const { startOfMonth, endOfMonth } = this.monthRange();
    const used = await this.prisma.featureUsageLog.count({
      where: {
        organizationId,
        feature,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });
    if (used >= limit) {
      const label = feature === 'BACKLINK_SYNC' ? 'backlink senkronizasyonu' : 'rakip karşılaştırma';
      throw new ForbiddenException(
        `LIMIT_REACHED: Bu ayki ${label} limitinize ulaştınız (${used}/${limit}). Daha yüksek bir pakete geçerek limitinizi artırabilirsiniz.`,
      );
    }
  }

  async recordFeatureUsage(
    organizationId: string,
    feature: 'BACKLINK_SYNC' | 'COMPETITOR_COMPARE',
    projectId?: string,
  ): Promise<void> {
    await this.prisma.featureUsageLog.create({
      data: { organizationId, feature, projectId },
    });
  }

  /** Ücretsiz analiz sayfasında tam raporun kilidini açıp açmayacağımızı belirler. */
  hasFullAuditAccess(limits: PlanLimits): boolean {
    return limits.fullAuditReport;
  }

  private monthRange() {
    const now = new Date();
    return {
      startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      endOfMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  }
}
