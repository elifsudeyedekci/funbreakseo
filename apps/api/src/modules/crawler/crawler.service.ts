import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { IssueCategory, IssueSeverity, CrawlJobStatus, CrawlTrigger } from '@prisma/client'
import { PrismaService } from '../../prisma.service'
import { PlanLimitService } from '../plan-limit/plan-limit.service'

@Injectable()
export class CrawlerService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('crawler') private readonly crawlerQueue: Queue,
    private readonly planLimit: PlanLimitService,
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

    if (triggeredBy === 'MANUAL') {
      await this.planLimit.assertCrawlWithinLimit(project.organizationId)
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

    if (!latest) return null

    // True severity totals (independent of the 200-row sample below) — groupBy
    // scans the whole table so counts stay correct even for very large crawls.
    const severityCounts = await this.prisma.seoIssue.groupBy({
      by: ['severity'],
      where: { crawlJobId: latest.id },
      _count: { severity: true },
    })
    const bySeverity = (sev: IssueSeverity) =>
      severityCounts.find((s) => s.severity === sev)?._count.severity ?? 0

    return this.shapeAudit(latest, {
      criticalCount: bySeverity('CRITICAL' as IssueSeverity),
      warningCount: bySeverity('WARNING' as IssueSeverity),
      noticeCount: bySeverity('NOTICE' as IssueSeverity),
    })
  }

  private auditInclude() {
    return {
      _count: { select: { issues: true, pages: true } },
      siteAuditReport: true,
      issues: {
        take: 500,
        orderBy: { severity: 'asc' as const },
        select: { id: true, severity: true, category: true, code: true, message: true, recommendation: true, crawledPage: { select: { url: true } } },
      },
    }
  }

  private shapeAudit(
    latest: any,
    severity: { criticalCount: number; warningCount: number; noticeCount: number },
  ) {
    // Group the (up to 500) sampled issues by rule code so the UI shows one
    // row per issue TYPE with an accurate "affected pages" count + URL list,
    // instead of a duplicate row per page (previous behaviour hardcoded count=1).
    const grouped = new Map<string, any>()
    for (const issue of latest.issues as any[]) {
      const key = issue.code
      const url = issue.crawledPage?.url
      const existing = grouped.get(key)
      if (existing) {
        existing.count += 1
        if (url && existing.urls.length < 10) existing.urls.push(url)
      } else {
        grouped.set(key, {
          ...issue,
          url,
          urls: url ? [url] : [],
          howToFix: issue.recommendation,
          count: 1,
        })
      }
    }

    return {
      ...latest,
      crawledPages: latest._count.pages,
      totalIssues: latest._count.issues,
      ...severity,
      completedAt: latest.finishedAt,
      siteAuditReport: latest.siteAuditReport ?? null,
      issues: Array.from(grouped.values()),
    }
  }

  /**
   * Ordered post-crawl analysis sub-steps — matches the keys AuditAggregatorService
   * writes to CrawlJob.currentStep as it works through each module sequentially
   * (see audit-aggregator.service.ts). Keeping the key + label + progress% together
   * here means the frontend stepper (ScanProgressOverlay) only needs `stepKey` to
   * render a checklist — no fragile guessing from the label text.
   */
  private static readonly STEP_LABELS: Record<string, { label: string; progress: number }> = {
    crawl: { label: 'Sayfalar taranıyor', progress: 0 },
    'analyzing:performance': { label: 'Performans ölçülüyor (PageSpeed, Core Web Vitals)', progress: 78 },
    'analyzing:technology': { label: 'Teknoloji ve domain bilgileri taranıyor', progress: 85 },
    'analyzing:geo': { label: 'GEO / AI görünürlüğü analiz ediliyor', progress: 90 },
    'analyzing:backlink': { label: 'Backlink verileri senkronize ediliyor', progress: 95 },
    'analyzing:finalize': { label: 'Sonuçlar birleştiriliyor', progress: 98 },
  }

  /**
   * Lightweight, frequently-polled progress signal for the audit page's live
   * progress bar — separate from getLatestAudit() (which returns the full
   * report and is heavier). Progress during the 'crawl' phase is a real
   * pagesScanned/totalPagesQueued ratio (weighted to 70% of the bar); each
   * post-crawl module now runs sequentially and writes its own currentStep
   * key, so the analyzing phase advances step by step instead of sitting on
   * a fixed plateau.
   */
  async getScanStatus(projectId: string): Promise<{ progress: number; step: string; stepKey: string; status: CrawlJobStatus; crawlJobId: string | null }> {
    const latest = await this.prisma.crawlJob.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, currentStep: true, pagesScanned: true, totalPagesQueued: true },
    })
    if (!latest) return { progress: 0, step: 'Henüz taranmadı', stepKey: 'none', status: CrawlJobStatus.QUEUED, crawlJobId: null }

    if (latest.status === CrawlJobStatus.DONE) {
      return { progress: 100, step: 'Tamamlandı', stepKey: 'done', status: latest.status, crawlJobId: latest.id }
    }
    if (latest.status === CrawlJobStatus.FAILED) {
      return { progress: 100, step: 'Hata oluştu', stepKey: 'failed', status: latest.status, crawlJobId: latest.id }
    }

    if (latest.currentStep && latest.currentStep.startsWith('analyzing:')) {
      const meta = CrawlerService.STEP_LABELS[latest.currentStep] ?? CrawlerService.STEP_LABELS['analyzing:finalize']
      return { progress: meta.progress, step: meta.label, stepKey: latest.currentStep, status: latest.status, crawlJobId: latest.id }
    }

    const total = latest.totalPagesQueued
    const scanned = latest.pagesScanned ?? 0
    const pagePercent = total ? Math.min(100, Math.round((scanned / total) * 100)) : 0
    const progress = total ? Math.min(70, Math.round(pagePercent * 0.7)) : 5
    const step = total ? `${CrawlerService.STEP_LABELS.crawl.label} (${scanned}/${total})` : CrawlerService.STEP_LABELS.crawl.label
    return { progress, step, stepKey: 'crawl', status: latest.status, crawlJobId: latest.id }
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
