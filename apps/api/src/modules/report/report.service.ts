import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface ReportDto {
  projectId: string;
  format: 'PDF' | 'HTML' | 'JSON';
  schedule?: string;
  recipients?: string[];
}

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(projectId: string, format: 'PDF' | 'HTML' | 'JSON') {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
        keywords: {
          include: {
            rankHistory: { orderBy: { checkedAt: 'desc' }, take: 30 },
          },
        },
        crawlJobs: { orderBy: { createdAt: 'desc' }, take: 1 },
        blogPosts: { where: { status: 'PUBLISHED' }, take: 10 },
        backlinks: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    const latestCrawl = project.crawlJobs[0];

    // Ranking summary
    const rankingData = project.keywords.map((kw) => {
      const latest = kw.rankHistory[0];
      const previous = kw.rankHistory[1];
      return {
        keyword: kw.keyword,
        currentRank: latest?.rank ?? null,
        previousRank: previous?.rank ?? null,
        change: latest && previous ? previous.rank - latest.rank : 0,
      };
    });

    const ranksInTop10 = rankingData.filter(
      (r) => r.currentRank !== null && r.currentRank <= 10,
    ).length;
    const avgRank =
      rankingData.length > 0
        ? rankingData.reduce((sum, r) => sum + (r.currentRank ?? 100), 0) /
          rankingData.length
        : 0;

    // Technical SEO from latest crawl
    const technicalSeo = latestCrawl
      ? {
          healthScore: (latestCrawl.meta as Record<string, unknown>)?.healthScore ?? 0,
          criticalIssues: (latestCrawl.meta as Record<string, unknown>)?.criticalIssues ?? [],
          warnings: (latestCrawl.meta as Record<string, unknown>)?.warnings ?? [],
          pagesScanned: latestCrawl.pagesScanned,
          errorsFound: latestCrawl.errorsFound,
        }
      : null;

    // GEO visibility
    const geoVisibility = await this.prisma.geoVisibilityCheck.findMany({
      where: { keyword: { projectId } },
      orderBy: { checkedAt: 'desc' },
      take: 50,
    });

    const geoSummary = {
      total: geoVisibility.length,
      mentioned: geoVisibility.filter((g) => g.isMentioned).length,
      visibilityRate:
        geoVisibility.length > 0
          ? (geoVisibility.filter((g) => g.isMentioned).length /
              geoVisibility.length) *
            100
          : 0,
    };

    // Backlinks
    const newBacklinks = project.backlinks.filter((b) => {
      const weekAgo = new Date(Date.now() - 7 * 86400_000);
      return b.createdAt >= weekAgo;
    });

    // Content summary
    const contentSummary = {
      published: project.blogPosts.length,
      recentTitles: project.blogPosts.slice(0, 5).map((p) => p.title),
    };

    // Recommendations
    const recommendations: Array<{
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      category: string;
      recommendation: string;
    }> = [];

    if (technicalSeo && Number(technicalSeo.healthScore) < 70) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Technical SEO',
        recommendation: 'Fix critical technical issues to improve crawlability',
      });
    }
    if (geoSummary.visibilityRate < 20) {
      recommendations.push({
        priority: 'HIGH',
        category: 'GEO',
        recommendation:
          'Optimize content for AI search engines (GEO) — current visibility is low',
      });
    }
    if (ranksInTop10 < project.keywords.length * 0.1) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Rankings',
        recommendation: 'Improve keyword targeting to get more terms in top 10',
      });
    }
    if (newBacklinks.length === 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Backlinks',
        recommendation: 'No new backlinks this week — run an outreach campaign',
      });
    }

    const report = {
      generatedAt: new Date(),
      format,
      project: {
        id: project.id,
        domain: project.domain,
        name: project.name,
        organization: project.organization.name,
      },
      rankingSummary: {
        totalKeywords: project.keywords.length,
        averageRank: Math.round(avgRank * 10) / 10,
        inTop10: ranksInTop10,
        firstPagePercentage:
          project.keywords.length > 0
            ? Math.round((ranksInTop10 / project.keywords.length) * 100)
            : 0,
        keywords: rankingData,
      },
      technicalSeo,
      geoVisibility: geoSummary,
      backlinks: {
        total: project.backlinks.length,
        newThisWeek: newBacklinks.length,
        recent: project.backlinks.slice(0, 5),
      },
      content: contentSummary,
      recommendations: recommendations.sort((a, b) => {
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return order[a.priority] - order[b.priority];
      }),
    };

    // Save report record
    await this.prisma.reportRecord.create({
      data: {
        projectId,
        format,
        data: report as unknown as Record<string, unknown>,
      },
    });

    return report;
  }

  async getScheduledReports(projectId: string) {
    return this.prisma.scheduledReport.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createScheduledReport(
    projectId: string,
    dto: {
      format: 'PDF' | 'HTML' | 'JSON';
      schedule: string;
      recipients: string[];
    },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.scheduledReport.create({
      data: {
        projectId,
        format: dto.format,
        cronExpression: dto.schedule,
        recipients: dto.recipients,
        isActive: true,
      },
    });
  }

  async deleteScheduledReport(reportId: string) {
    await this.prisma.scheduledReport.delete({ where: { id: reportId } });
    return { success: true };
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendScheduledReports() {
    const now = new Date();
    const scheduledReports = await this.prisma.scheduledReport.findMany({
      where: { isActive: true },
    });

    for (const scheduled of scheduledReports) {
      try {
        // Check if cron expression matches current time
        const report = await this.generateReport(
          scheduled.projectId,
          scheduled.format as 'PDF' | 'HTML' | 'JSON',
        );

        // Log the send
        await this.prisma.scheduledReport.update({
          where: { id: scheduled.id },
          data: { lastSentAt: now },
        });

        // In production, email report to recipients
        console.log(
          `Sent scheduled report for project ${scheduled.projectId} to ${scheduled.recipients.join(', ')}`,
          { reportSummary: report.project },
        );
      } catch (err) {
        console.error(
          `Failed to send scheduled report ${scheduled.id}:`,
          err,
        );
      }
    }
  }
}
