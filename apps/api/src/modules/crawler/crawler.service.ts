import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { IssueCategory, IssueSeverity, CrawlJobStatus, CrawlTrigger } from '@prisma/client'
import { PrismaService } from '../../prisma.service'

@Injectable()
export class CrawlerService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('crawler') private readonly crawlerQueue: Queue,
  ) {}

  async startCrawl(
    projectId: string,
    triggeredBy: 'MANUAL' | 'SCHEDULED',
    user?: any,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    })
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`)
    }

    const crawlJob = await this.prisma.crawlJob.create({
      data: {
        projectId,
        status: CrawlJobStatus.QUEUED,
        triggeredBy: triggeredBy as CrawlTrigger,
      },
    })

    await this.crawlerQueue.add('process', {
      crawlJobId: crawlJob.id,
      projectId,
    })

    return crawlJob
  }

  async getLatestAudit(projectId: string) {
    // Prefer the latest crawl that actually produced data. A newer QUEUED/RUNNING/FAILED
    // job (or an empty retry) must not hide the issues/pages from the last good crawl.
    const latest =
      (await this.prisma.crawlJob.findFirst({
        where: { projectId, status: CrawlJobStatus.DONE, pagesScanned: { gt: 0 } },
        orderBy: { finishedAt: 'desc' },
        include: this.auditInclude(),
      })) ??
      (await this.prisma.crawlJob.findFirst({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: this.auditInclude(),
      }))

    return this.shapeAudit(latest)
  }

  private auditInclude() {
    return {
      _count: { select: { issues: true, pages: true } },
      issues: {
        take: 200,
        orderBy: { severity: 'asc' as const },
        select: { id: true, severity: true, category: true, code: true, message: true, recommendation: true, crawledPage: { select: { url: true } } },
      },
    }
  }

  private shapeAudit(latest: any) {
    if (!latest) return null
    return {
      ...latest,
      crawledPages: latest._count.pages,
      totalIssues: latest._count.issues,
      criticalCount: latest.issues.filter((i: any) => i.severity === 'CRITICAL').length,
      warningCount: latest.issues.filter((i: any) => i.severity === 'WARNING').length,
      noticeCount: latest.issues.filter((i: any) => i.severity === 'NOTICE').length,
      completedAt: latest.finishedAt,
      issues: latest.issues.map((i: any) => ({
        ...i,
        url: i.crawledPage?.url,
        howToFix: i.recommendation,
        count: 1,
      })),
    }
  }

  async getCrawlHistory(projectId: string) {
    return this.prisma.crawlJob.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        triggeredBy: true,
        startedAt: true,
        finishedAt: true,
        pagesScanned: true,
        issuesFound: true,
        healthScore: true,
        createdAt: true,
      },
    })
  }

  async getCrawlResult(crawlJobId: string) {
    const crawlJob = await this.prisma.crawlJob.findUnique({
      where: { id: crawlJobId },
      include: {
        _count: {
          select: { issues: true, pages: true },
        },
      },
    })
    if (!crawlJob) {
      throw new NotFoundException(`CrawlJob ${crawlJobId} not found`)
    }

    const issueCounts = await this.prisma.seoIssue.groupBy({
      by: ['severity'],
      where: { crawlJobId },
      _count: { severity: true },
    })

    const severityBreakdown = issueCounts.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.severity] = item._count.severity
        return acc
      },
      {},
    )

    return {
      ...crawlJob,
      severityBreakdown,
    }
  }

  async getCrawlIssues(
    crawlJobId: string,
    filters: { severity?: IssueSeverity; category?: IssueCategory },
  ) {
    const where: Record<string, any> = { crawlJobId }
    if (filters.severity) where['severity'] = filters.severity
    if (filters.category) where['category'] = filters.category

    const [issues, total] = await Promise.all([
      this.prisma.seoIssue.findMany({
        where,
        orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
        include: {
          crawledPage: {
            select: { url: true, statusCode: true },
          },
        },
      }),
      this.prisma.seoIssue.count({ where }),
    ])

    return { issues, total }
  }

  async getCrawledPages(crawlJobId: string) {
    return this.prisma.crawledPage.findMany({
      where: { crawlJobId },
      orderBy: { depth: 'asc' },
      include: {
        _count: {
          select: { issues: true },
        },
      },
    })
  }

  async markIssueFixed(issueId: string) {
    const issue = await this.prisma.seoIssue.findUnique({
      where: { id: issueId },
    })
    if (!issue) {
      throw new NotFoundException(`SeoIssue ${issueId} not found`)
    }

    return this.prisma.seoIssue.update({
      where: { id: issueId },
      data: { fixed: true },
    })
  }

  async getIssueGuide(issueId: string) {
    const issue = await this.prisma.seoIssue.findUnique({
      where: { id: issueId },
      include: {
        crawledPage: {
          select: { url: true, statusCode: true, title: true },
        },
      },
    })
    if (!issue) {
      throw new NotFoundException(`SeoIssue ${issueId} not found`)
    }

    const ruleDefinition = await this.prisma.seoRuleDefinition.findUnique({
      where: { code: issue.code },
    })

    return {
      ...issue,
      ruleDefinition,
    }
  }
}
