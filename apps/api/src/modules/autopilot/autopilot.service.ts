import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AutopilotService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.autopilotSettings.findFirst();
    if (!settings) {
      // Create default settings
      return this.prisma.autopilotSettings.create({
        data: {
          isEnabled: false,
          publishMode: 'SEMI_AUTO',
          weeklyTarget: 3,
          minSeoScore: 70,
          minGeoScore: 60,
          maxRetries: 2,
          locales: ['tr', 'en'],
          nichKeywords: ['SEO', 'GEO', 'dijital pazarlama', 'digital marketing'],
        },
      });
    }
    return settings;
  }

  async updateSettings(dto: {
    isEnabled?: boolean;
    publishMode?: 'AUTO' | 'SEMI_AUTO';
    weeklyTarget?: number;
    minSeoScore?: number;
    minGeoScore?: number;
    maxRetries?: number;
    locales?: string[];
    nichKeywords?: string[];
  }) {
    const existing = await this.getSettings();
    return this.prisma.autopilotSettings.update({
      where: { id: existing.id },
      data: dto,
    });
  }

  async getDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const settings = await this.getSettings();

    const stats = await Promise.all(
      settings.locales.map(async (locale: string) => {
        const [produced, published, queued] = await Promise.all([
          this.prisma.blogPost.count({
            where: {
              locale,
              autopilot: true,
              createdAt: { gte: startOfMonth },
            },
          }),
          this.prisma.blogPost.count({
            where: {
              locale,
              autopilot: true,
              status: 'PUBLISHED',
              createdAt: { gte: startOfMonth },
            },
          }),
          this.prisma.autopilotKeyword.count({
            where: { locale, status: 'QUEUED' },
          }),
        ]);

        return { locale, produced, published, queued };
      }),
    );

    const pendingReview = await this.prisma.blogPost.count({
      where: { autopilot: true, status: 'REVIEW' },
    });

    const performanceAlerts = await this.prisma.autopilotContentPerformance.count({
      where: { needsRefresh: true },
    });

    return {
      settings,
      thisMonth: stats,
      pendingReview,
      performanceAlerts,
    };
  }

  async getQueue() {
    const [queued, inProgress, produced, published] = await Promise.all([
      this.prisma.autopilotKeyword.findMany({
        where: { status: 'QUEUED' },
        orderBy: { opportunityScore: 'desc' },
        take: 50,
      }),
      this.prisma.autopilotKeyword.findMany({
        where: { status: 'IN_PROGRESS' },
        include: { blogPost: true },
        take: 20,
      }),
      this.prisma.blogPost.findMany({
        where: { autopilot: true, status: 'DRAFT' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.blogPost.findMany({
        where: { autopilot: true, status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 20,
      }),
    ]);

    return { queued, inProgress, produced, published };
  }

  async manualRun() {
    // Trigger the autopilot worker via a queue job
    await this.prisma.queueJob.create({
      data: {
        queueName: 'autopilot',
        jobName: 'autopilot:run',
        payload: { triggeredBy: 'MANUAL' },
        status: 'WAITING',
      },
    });

    return { triggered: true, message: 'Autopilot run queued' };
  }

  async discoverKeywords(locale: string) {
    // Trigger keyword discovery for a specific locale
    await this.prisma.queueJob.create({
      data: {
        queueName: 'autopilot',
        jobName: 'autopilot:discover',
        payload: { locale },
        status: 'WAITING',
      },
    });

    return { triggered: true, locale };
  }
}
