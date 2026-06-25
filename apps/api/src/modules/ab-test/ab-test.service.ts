import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface AbTestVariant {
  id: string;
  name: string;
  weight: number; // 0-100, percentage
  config: Record<string, unknown>;
}

export interface CreateAbTestDto {
  name: string;
  description?: string;
  targetType: 'CONTENT' | 'TITLE' | 'META_DESC' | 'CTA' | 'LAYOUT';
  projectId: string;
  variants: AbTestVariant[];
  trafficSplit?: number; // percentage of traffic to include in test (default 100)
  startAt?: Date;
  endAt?: Date;
}

@Injectable()
export class AbTestService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new A/B test
   */
  async createTest(userId: string, dto: CreateAbTestDto) {
    const variants = dto.variants ?? [];
    // Validate weights sum to 100
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (variants.length > 0 && totalWeight !== 100) {
      throw new Error(`Variant weights must sum to 100, got ${totalWeight}`);
    }

    const test = await this.prisma.systemSetting.create({
      data: {
        key: `ab_test_${Date.now()}_${userId}`,
        value: {
          userId,
          name: dto.name,
          description: dto.description ?? '',
          targetType: dto.targetType,
          projectId: dto.projectId,
          variants: dto.variants,
          trafficSplit: dto.trafficSplit ?? 100,
          status: 'DRAFT',
          startAt: dto.startAt?.toISOString() ?? null,
          endAt: dto.endAt?.toISOString() ?? null,
          createdAt: new Date().toISOString(),
        } as object,
      },
    });

    return {
      id: test.id,
      key: test.key,
      ...((test.value as Record<string, unknown>) ?? {}),
    };
  }

  /**
   * List all A/B tests for a project
   */
  async listTests(projectId: string) {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: 'ab_test_' } },
    });

    return rows
      .map((r) => {
        const val = (r.value ?? {}) as Record<string, unknown>;
        return { id: r.id, key: r.key, ...val } as Record<string, unknown> & { id: string; key: string };
      })
      .filter((t) => (t['projectId'] as string) === projectId);
  }

  /**
   * Get a single A/B test
   */
  async getTest(testId: string) {
    const row = await this.prisma.systemSetting.findUnique({ where: { id: testId } });
    if (!row) return null;
    return { id: row.id, key: row.key, ...((row.value as Record<string, unknown>) ?? {}) };
  }

  /**
   * Activate a test (set to RUNNING)
   */
  async activateTest(testId: string) {
    const row = await this.prisma.systemSetting.findUnique({ where: { id: testId } });
    if (!row) throw new Error('Test not found');
    const val = (row.value as Record<string, unknown>) ?? {};
    await this.prisma.systemSetting.update({
      where: { id: testId },
      data: { value: { ...val, status: 'RUNNING', startAt: new Date().toISOString() } as object },
    });
    return { activated: true, testId };
  }

  /**
   * Stop a test
   */
  async stopTest(testId: string, winnerVariantId?: string) {
    const row = await this.prisma.systemSetting.findUnique({ where: { id: testId } });
    if (!row) throw new Error('Test not found');
    const val = (row.value as Record<string, unknown>) ?? {};
    await this.prisma.systemSetting.update({
      where: { id: testId },
      data: {
        value: {
          ...val,
          status: 'COMPLETED',
          endAt: new Date().toISOString(),
          winnerVariantId: winnerVariantId ?? null,
        } as object,
      },
    });
    return { stopped: true, testId, winnerVariantId };
  }

  /**
   * Record an impression (variant was shown)
   */
  async recordImpression(testId: string, variantId: string, sessionId: string) {
    const key = `ab_impression_${testId}_${variantId}_${sessionId}`;
    // Idempotent — one impression per session per variant
    await this.prisma.systemSetting.upsert({
      where: { key },
      update: {},
      create: {
        key,
        value: {
          testId,
          variantId,
          sessionId,
          type: 'impression',
          timestamp: new Date().toISOString(),
        } as object,
      },
    });
    return { recorded: true };
  }

  /**
   * Record a conversion
   */
  async recordConversion(
    testId: string,
    variantId: string,
    sessionId: string,
    conversionType: string,
  ) {
    const key = `ab_conversion_${testId}_${variantId}_${sessionId}_${conversionType}`;
    await this.prisma.systemSetting.upsert({
      where: { key },
      update: {},
      create: {
        key,
        value: {
          testId,
          variantId,
          sessionId,
          type: 'conversion',
          conversionType,
          timestamp: new Date().toISOString(),
        } as object,
      },
    });
    return { recorded: true };
  }

  /**
   * Get test results / statistics
   */
  async getResults(testId: string) {
    const [impressionRows, conversionRows] = await Promise.all([
      this.prisma.systemSetting.findMany({
        where: { key: { startsWith: `ab_impression_${testId}_` } },
      }),
      this.prisma.systemSetting.findMany({
        where: { key: { startsWith: `ab_conversion_${testId}_` } },
      }),
    ]);

    // Aggregate per variant
    const stats: Record<string, { impressions: number; conversions: number; conversionRate: number }> = {};

    for (const row of impressionRows) {
      const val = row.value as Record<string, unknown>;
      const vId = val.variantId as string;
      if (!stats[vId]) stats[vId] = { impressions: 0, conversions: 0, conversionRate: 0 };
      stats[vId].impressions++;
    }

    for (const row of conversionRows) {
      const val = row.value as Record<string, unknown>;
      const vId = val.variantId as string;
      if (!stats[vId]) stats[vId] = { impressions: 0, conversions: 0, conversionRate: 0 };
      stats[vId].conversions++;
    }

    // Compute conversion rates
    for (const vId of Object.keys(stats)) {
      const s = stats[vId];
      s.conversionRate = s.impressions > 0 ? Math.round((s.conversions / s.impressions) * 10000) / 100 : 0;
    }

    return { testId, variantStats: stats };
  }

  /**
   * Assign variant to a user/session deterministically
   */
  assignVariant(variants: AbTestVariant[], sessionId: string): AbTestVariant | null {
    if (!variants.length) return null;
    // Deterministic hash: sum char codes mod 100
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) hash += sessionId.charCodeAt(i);
    const bucket = hash % 100;

    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) return variant;
    }
    return variants[variants.length - 1];
  }
}
