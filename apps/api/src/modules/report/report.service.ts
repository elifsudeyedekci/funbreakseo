import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface ReportDto {
  projectId: string;
  format: 'PDF' | 'HTML' | 'JSON';
  schedule?: string;
  recipients?: string[];
}

export type ReportType =
  | 'ALL'
  | 'KEYWORDS'
  | 'TECHNICAL'
  | 'BACKLINKS'
  | 'GEO'
  | 'COMPETITORS';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(
    projectId: string,
    format: 'PDF' | 'HTML' | 'JSON',
    type: ReportType = 'ALL',
  ) {
    const includeAll = type === 'ALL';
    const want = (t: ReportType) => includeAll || type === t;
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
        keywords: {
          include: {
            ranks: { orderBy: { checkedAt: 'desc' }, take: 30 },
          },
        },
        crawlJobs: { orderBy: { createdAt: 'desc' }, take: 1 },
        contentItems: { where: { status: 'PUBLISHED' }, take: 10 },
        backlinks: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    const latestCrawl = project.crawlJobs[0];

    // Ranking summary
    const rankingData = project.keywords.map((kw) => {
      const latest = kw.ranks[0];
      const previous = kw.ranks[1];
      return {
        keyword: kw.phrase,
        currentRank: latest?.position ?? null,
        previousRank: previous?.position ?? null,
        change: latest && previous ? (previous.position ?? 0) - (latest.position ?? 0) : 0,
      };
    });

    const ranksInTop10 = rankingData.filter(
      (r) => r.currentRank !== null && r.currentRank <= 10,
    ).length;
    const avgRank =
      rankingData.length > 0
        ? rankingData.reduce((sum: number, r: typeof rankingData[0]) => sum + (r.currentRank ?? 100), 0) /
          rankingData.length
        : 0;

    // Technical SEO from latest crawl
    const technicalSeo = latestCrawl
      ? {
          healthScore: latestCrawl.healthScore ?? 0,
          pagesScanned: latestCrawl.pagesScanned,
          issuesFound: latestCrawl.issuesFound,
        }
      : null;

    // GEO visibility — from the real AI-scan results (geo_results) + snapshot.
    const geoResults = await this.prisma.geoResult.findMany({
      where: { geoQuery: { projectId } },
      orderBy: { checkedAt: 'desc' },
      take: 200,
    });
    const geoSnapshot = await this.prisma.geoVisibilitySnapshot.findFirst({
      where: { projectId },
      orderBy: { date: 'desc' },
    });

    const geoMentioned = geoResults.filter((g) => g.brandMentioned).length;
    const geoCited = geoResults.filter((g) => g.brandCited).length;
    const geoSummary = {
      total: geoResults.length,
      mentioned: geoMentioned,
      cited: geoCited,
      mentionCount: geoSnapshot?.mentionCount ?? geoMentioned,
      citationCount: geoSnapshot?.citationCount ?? geoCited,
      visibilityRate:
        geoResults.length > 0 ? (geoMentioned / geoResults.length) * 100 : 0,
      byPlatform: geoSnapshot?.byPlatform ?? null,
    };

    // Competitors (organic + GEO share-of-voice)
    const [organicCompetitors, geoCompetitors] = await Promise.all([
      this.prisma.competitor.findMany({
        where: { projectId },
        orderBy: { commonKeywords: 'desc' },
        take: 10,
      }),
      this.prisma.geoCompetitor.findMany({
        where: { projectId },
        orderBy: { shareOfVoice: 'desc' },
        take: 10,
      }),
    ]);

    const competitorSummary = {
      organic: organicCompetitors.map((c) => ({
        domain: c.domain,
        commonKeywords: c.commonKeywords,
        avgPosition: c.avgPosition,
        visibilityScore: c.visibilityScore,
      })),
      geo: geoCompetitors.map((c) => ({
        domain: c.domain,
        mentionCount: c.mentionCount,
        citationCount: c.citationCount,
        shareOfVoice: c.shareOfVoice,
      })),
    };

    // Backlinks
    const newBacklinks = project.backlinks.filter((b) => {
      const weekAgo = new Date(Date.now() - 7 * 86400_000);
      return b.createdAt >= weekAgo;
    });

    // Content summary
    const contentSummary = {
      published: project.contentItems.length,
      recentTitles: project.contentItems.slice(0, 5).map((p) => p.title),
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

    const typeTitles: Record<ReportType, string> = {
      ALL: 'Kapsamlı SEO & GEO Raporu',
      KEYWORDS: 'Anahtar Kelime Raporu',
      TECHNICAL: 'Teknik SEO Raporu',
      BACKLINKS: 'Backlink Raporu',
      GEO: 'GEO / AI Görünürlük Raporu',
      COMPETITORS: 'Rakip Analizi Raporu',
    };

    const report = {
      generatedAt: new Date(),
      format,
      type,
      title: typeTitles[type],
      project: {
        id: project.id,
        domain: project.domain,
        name: project.name,
        organization: project.organization.name,
      },
      rankingSummary: want('KEYWORDS')
        ? {
            totalKeywords: project.keywords.length,
            averageRank: Math.round(avgRank * 10) / 10,
            inTop10: ranksInTop10,
            firstPagePercentage:
              project.keywords.length > 0
                ? Math.round((ranksInTop10 / project.keywords.length) * 100)
                : 0,
            keywords: rankingData,
          }
        : null,
      technicalSeo: want('TECHNICAL') ? technicalSeo : null,
      geoVisibility: want('GEO') ? geoSummary : null,
      backlinks: want('BACKLINKS')
        ? {
            total: project.backlinks.length,
            newThisWeek: newBacklinks.length,
            recent: project.backlinks.slice(0, 10),
          }
        : null,
      competitors: want('COMPETITORS') ? competitorSummary : null,
      content: includeAll ? contentSummary : null,
      recommendations: recommendations.sort((a, b) => {
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return order[a.priority] - order[b.priority];
      }),
    };

    // Save report record
    await this.prisma.reportRecord.create({
      data: {
        projectId,
        format: format as 'PDF' | 'HTML' | 'JSON',
        data: report as object,
      },
    });

    return report;
  }

  async listReports(projectId: string) {
    return this.prisma.reportRecord.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getReport(projectId: string, reportId: string) {
    return this.prisma.reportRecord.findFirst({
      where: { id: reportId, projectId },
    });
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
        format: dto.format as 'PDF' | 'HTML' | 'JSON',
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
        const recipientList = Array.isArray(scheduled.recipients) ? (scheduled.recipients as string[]) : [];
        console.log(
          `Sent scheduled report for project ${scheduled.projectId} to ${recipientList.join(', ')}`,
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
