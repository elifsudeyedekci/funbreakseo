import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma.service'
import { PerformanceService } from '../performance/performance.service'
import { SiteIntelService } from '../site-intel/site-intel.service'
import { GeoAuditService } from '../geo/geo-audit.service'
import { OutreachService } from '../outreach/outreach.service'
import { PriorityRecommendation, scoreToLetterGrade } from '@funbreakseo/shared'

interface CategoryScore {
  score: number
  grade: string
}

/**
 * Runs the "beat Semrush/Ahrefs" modules (performance, site-intel, GEO) after
 * a crawl finishes, then reads the fully-populated SiteAuditReport row back
 * and computes the single overall score/grade + merged priority-recommendation
 * list the report UI renders. Every step is best-effort — one module failing
 * must never take down the whole post-crawl analysis.
 */
@Injectable()
export class AuditAggregatorService {
  private readonly logger = new Logger(AuditAggregatorService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly performance: PerformanceService,
    private readonly siteIntel: SiteIntelService,
    private readonly geoAudit: GeoAuditService,
    private readonly outreach: OutreachService,
  ) {}

  /**
   * Runs sequentially (not Promise.all) so CrawlJob.currentStep can advance
   * one real step at a time — the audit page's progress overlay polls this
   * field to render a step-by-step checklist instead of a single "analyzing"
   * plateau. Each module is still best-effort: one failing must never stop
   * the rest or fail the overall crawl.
   */
  async runPostCrawlAnalysis(projectId: string, crawlJobId: string, domain: string): Promise<void> {
    const setStep = async (step: string) => {
      try {
        await this.prisma.crawlJob.update({ where: { id: crawlJobId }, data: { currentStep: step } })
      } catch {
        // best-effort — a missed step label just means the overlay lags one step behind
      }
    }

    await setStep('analyzing:performance')
    try {
      await this.performance.analyzeAndPersist(projectId, crawlJobId, domain)
    } catch (e) {
      this.logger.warn(`[performance] analyzeAndPersist failed: ${(e as Error).message}`)
    }

    await setStep('analyzing:technology')
    try {
      await this.siteIntel.analyzeAndPersist(projectId, crawlJobId, domain)
    } catch (e) {
      this.logger.warn(`[site-intel] analyzeAndPersist failed: ${(e as Error).message}`)
    }

    await setStep('analyzing:geo')
    try {
      await this.geoAudit.analyzeAndPersistGeoAudit(projectId, crawlJobId, domain)
    } catch (e) {
      this.logger.warn(`[geo-audit] analyzeAndPersist failed: ${(e as Error).message}`)
    }

    // First-scan-only backlink sync: a brand-new project with zero backlinks
    // synced yet would otherwise show an empty backlink section right after
    // signup, which reads as "broken" rather than "no data collected yet".
    // Projects that already have backlinks keep using the plan-limited
    // manual sync button on the backlinks page — auto-resyncing on every
    // single full scan would burn through the DataForSEO quota for nothing,
    // and competitor backlink lookups stay a separate, user-triggered action
    // on the competitors page (not part of this pipeline at all).
    try {
      const existingBacklinks = await this.prisma.backlink.count({ where: { projectId } })
      if (existingBacklinks === 0) {
        await setStep('analyzing:backlink')
        await this.outreach.syncBacklinks(projectId)
      }
    } catch (e) {
      this.logger.warn(`[backlink] first-scan sync failed: ${(e as Error).message}`)
    }

    await setStep('analyzing:finalize')
    await this.finalize(projectId, crawlJobId)
  }

  async finalize(projectId: string, crawlJobId: string): Promise<void> {
    const [report, crawlJob, gauges, project] = await Promise.all([
      this.prisma.siteAuditReport.findUnique({ where: { crawlJobId } }),
      this.prisma.crawlJob.findUnique({ where: { id: crawlJobId } }),
      this.outreach
        .getBacklinkGauges(projectId)
        .catch(() => ({ domainStrength: 0, pageStrength: 0, counters: {} as Record<string, number> })),
      this.prisma.project.findUnique({ where: { id: projectId }, select: { geoVisibilityScore: true } }),
    ])
    if (!report || !crawlJob) return

    const onPageJson = (report.onPageJson ?? {}) as any
    const geoJson = (report.geoJson ?? {}) as any
    const performanceJson = (report.performanceJson ?? {}) as any
    const usabilityJson = (report.usabilityJson ?? {}) as any
    const socialJson = (report.socialJson ?? {}) as any
    const technologyJson = (report.technologyJson ?? {}) as any
    const localSeoJson = (report.localSeoJson ?? {}) as any
    const crawlListJson = (report.crawlListJson ?? {}) as any

    // ---- Category scores -----------------------------------------------
    const onPage: CategoryScore = this.toCategoryScore(crawlJob.healthScore ?? 0)

    const psiMobile = performanceJson?.psi?.mobile?.score
    const psiDesktop = performanceJson?.psi?.desktop?.score
    const perfScore =
      typeof psiMobile === 'number' && typeof psiDesktop === 'number'
        ? Math.round(psiMobile * 0.6 + psiDesktop * 0.4)
        : typeof psiMobile === 'number'
          ? psiMobile
          : typeof psiDesktop === 'number'
            ? psiDesktop
            : this.penaltyScore([...(performanceJson?.recommendations ?? [])])
    const performance: CategoryScore = this.toCategoryScore(perfScore)

    const backlinkScore = gauges.domainStrength ?? 0
    const backlink: CategoryScore = this.toCategoryScore(backlinkScore)

    const usabilityPenaltySource = [
      ...(usabilityJson?.recommendations ?? []),
      ...(socialJson?.recommendations ?? []),
      ...(technologyJson?.recommendations ?? []),
      ...(localSeoJson?.recommendations ?? []),
    ]
    const usability: CategoryScore = this.toCategoryScore(this.penaltyScore(usabilityPenaltySource))

    const geoScore =
      typeof geoJson?.eeat?.score === 'number' ? geoJson.eeat.score : (project?.geoVisibilityScore ?? 0)
    const geo: CategoryScore = this.toCategoryScore(geoScore)

    const categoryScores = { onPage, geo, backlink, usability, performance }
    const overallScore = Math.round(
      onPage.score * 0.25 + geo.score * 0.15 + backlink.score * 0.2 + usability.score * 0.2 + performance.score * 0.2,
    )
    const overallGrade = scoreToLetterGrade(overallScore)

    // ---- Merge recommendations from every module ------------------------
    const issueRecs = await this.crawlIssuesToRecommendations(crawlJobId)
    const crawlListRecs = this.crawlListToRecommendations(crawlListJson)
    const onPageRecs = this.onPageToRecommendations(onPageJson)

    const merged: PriorityRecommendation[] = [
      ...issueRecs,
      ...onPageRecs,
      ...crawlListRecs,
      ...((geoJson?.recommendations ?? []) as PriorityRecommendation[]),
      ...((performanceJson?.recommendations ?? []) as PriorityRecommendation[]),
      ...((usabilityJson?.recommendations ?? []) as PriorityRecommendation[]),
      ...((socialJson?.recommendations ?? []) as PriorityRecommendation[]),
      ...((technologyJson?.recommendations ?? []) as PriorityRecommendation[]),
      ...((localSeoJson?.recommendations ?? []) as PriorityRecommendation[]),
    ]
    const order = { CRITICAL: 0, MEDIUM: 1, LOW: 2 }
    merged.sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3))

    await this.prisma.siteAuditReport.update({
      where: { crawlJobId },
      data: {
        overallScore,
        overallGrade,
        categoryScores: categoryScores as any,
        recommendations: merged as any,
        recommendationsCount: merged.length,
      },
    })
  }

  private toCategoryScore(raw: number): CategoryScore {
    const score = Math.max(0, Math.min(100, Math.round(raw)))
    return { score, grade: scoreToLetterGrade(score) }
  }

  /** Same weighting as crawler.worker.ts's calculatePageScore, applied to a flat recommendations list. */
  private penaltyScore(recs: PriorityRecommendation[]): number {
    let score = 100
    for (const r of recs) {
      if (r.priority === 'CRITICAL') score -= 8
      else if (r.priority === 'MEDIUM') score -= 4
      else score -= 1
    }
    return Math.max(0, score)
  }

  /** Cap on how many affected-page URLs we attach to a single recommendation card. */
  private static readonly MAX_AFFECTED_URLS = 25

  private async crawlIssuesToRecommendations(crawlJobId: string): Promise<PriorityRecommendation[]> {
    // Fetch full rows (not groupBy) so we can attach the concrete affected
    // page URLs per recommendation — groupBy only gives counts.
    const issues = await this.prisma.seoIssue.findMany({
      where: { crawlJobId },
      select: {
        code: true,
        category: true,
        severity: true,
        message: true,
        recommendation: true,
        crawledPage: { select: { url: true } },
      },
    })

    const mapSeverity = { CRITICAL: 'CRITICAL', WARNING: 'MEDIUM', NOTICE: 'LOW' } as const
    const byCode = new Map<
      string,
      { category: string; severity: keyof typeof mapSeverity; message: string; recommendation: string | null; count: number; urls: Set<string> }
    >()

    for (const issue of issues) {
      let entry = byCode.get(issue.code)
      if (!entry) {
        entry = { category: issue.category, severity: issue.severity, message: issue.message, recommendation: issue.recommendation, count: 0, urls: new Set() }
        byCode.set(issue.code, entry)
      }
      entry.count++
      if (issue.crawledPage?.url && entry.urls.size < AuditAggregatorService.MAX_AFFECTED_URLS) {
        entry.urls.add(issue.crawledPage.url)
      }
    }

    return Array.from(byCode.entries()).map(([code, g]) => ({
      code,
      title: g.message,
      category: g.category as PriorityRecommendation['category'],
      priority: mapSeverity[g.severity],
      howToFix: g.recommendation ?? '',
      affectedCount: g.count,
      affectedUrls: Array.from(g.urls),
    }))
  }

  private crawlListToRecommendations(crawlListJson: any): PriorityRecommendation[] {
    const recs: PriorityRecommendation[] = []
    const broken = crawlListJson?.brokenLinks ?? []
    const redirects = crawlListJson?.redirectChains ?? []
    const orphans = crawlListJson?.orphanPages ?? []
    if (broken.length > 0) {
      recs.push({
        code: 'BROKEN_LINKS_FOUND',
        title: `${broken.length} sayfa erişilemez durumda (404/hata)`,
        category: 'LINKS',
        priority: 'CRITICAL',
        howToFix: 'Bozuk bağlantıları düzeltin veya 301 yönlendirme ekleyin.',
        affectedCount: broken.length,
        affectedUrls: broken.slice(0, AuditAggregatorService.MAX_AFFECTED_URLS).map((b: any) => b.url),
      })
    }
    if (redirects.length > 0) {
      recs.push({
        code: 'REDIRECT_CHAINS_FOUND',
        title: `${redirects.length} sayfada yönlendirme zinciri var`,
        category: 'LINKS',
        priority: 'MEDIUM',
        howToFix: 'Çoklu yönlendirmeleri tek bir doğrudan yönlendirmeye indirin.',
        affectedCount: redirects.length,
        affectedUrls: redirects.slice(0, AuditAggregatorService.MAX_AFFECTED_URLS).map((r: any) => r.url),
      })
    }
    if (orphans.length > 0) {
      recs.push({
        code: 'ORPHAN_PAGES_FOUND',
        title: `${orphans.length} sayfa hiçbir iç bağlantıdan erişilemiyor (orphan)`,
        category: 'LINKS',
        priority: 'MEDIUM',
        affectedUrls: orphans.slice(0, AuditAggregatorService.MAX_AFFECTED_URLS),
        howToFix: 'Bu sayfalara sitenizin başka sayfalarından iç bağlantı ekleyin.',
        affectedCount: orphans.length,
      })
    }
    return recs
  }

  private onPageToRecommendations(onPageJson: any): PriorityRecommendation[] {
    const recs: PriorityRecommendation[] = []
    if (!onPageJson?.sitemap?.found) {
      recs.push({
        code: 'SITEMAP_MISSING',
        title: 'XML sitemap bulunamadı',
        category: 'TECHNICAL',
        priority: 'MEDIUM',
        howToFix: '/sitemap.xml oluşturup Google Search Console\'a gönderin.',
      })
    }
    if (onPageJson?.robotsTxt?.blocking) {
      recs.push({
        code: 'ROBOTS_BLOCKING',
        title: 'robots.txt sitenin taranmasını engelliyor',
        category: 'TECHNICAL',
        priority: 'CRITICAL',
        howToFix: 'robots.txt dosyasındaki "Disallow: /" kuralını kaldırın veya daraltın.',
      })
    }
    if (onPageJson?.noindexHeader) {
      recs.push({
        code: 'NOINDEX_HEADER',
        title: 'X-Robots-Tag HTTP başlığı noindex içeriyor',
        category: 'TECHNICAL',
        priority: 'CRITICAL',
        howToFix: 'Bu sayfa arama motorlarında görünmeli mi kontrol edin; değilse kasıtlı olduğundan emin olun.',
      })
    }
    if (!onPageJson?.schemaTypes || onPageJson.schemaTypes.length === 0) {
      recs.push({
        code: 'NO_SCHEMA_TYPES',
        title: 'Yapılandırılmış veri (Schema.org) tespit edilemedi',
        category: 'SCHEMA',
        priority: 'LOW',
        howToFix: 'Sayfa tipine uygun JSON-LD şeması ekleyin (Organization, Article, Product, vb.).',
      })
    }
    if (onPageJson?.analytics && !onPageJson.analytics.ga4 && !onPageJson.analytics.gtm) {
      recs.push({
        code: 'NO_ANALYTICS',
        title: 'Analytics (GA4/GTM) tespit edilemedi',
        category: 'TECHNICAL',
        priority: 'LOW',
        howToFix: 'Google Analytics 4 veya Google Tag Manager kurulumu ekleyin.',
      })
    }
    return recs
  }
}
