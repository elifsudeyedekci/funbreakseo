import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import { PrismaService } from '../../prisma.service'
import { PriorityRecommendation, IssueCategory } from '@funbreakseo/shared'
import {
  PerformanceReport,
  PsiStrategyResult,
  CoreWebVitalsStrategyResult,
  CwvRating,
  PerformanceOpportunity,
  SizeBreakdown,
  CompressionByType,
  RequestsByType,
  RawPerfSnapshot,
} from './performance.types'

// ---------------------------------------------------------------------------
// Regex / heuristic helpers (house style — see crawler.worker.ts)
// ---------------------------------------------------------------------------

type ResourceBucket = 'HTML' | 'JS' | 'CSS' | 'IMG' | 'FONT' | 'OTHER'
const BUCKET_ORDER: ResourceBucket[] = ['HTML', 'JS', 'CSS', 'IMG', 'FONT', 'OTHER']

function classifyResource(name: string, initiatorType: string): ResourceBucket {
  const clean = name.split('?')[0].split('#')[0].toLowerCase()
  if (/\.(js|mjs|cjs)$/.test(clean) || initiatorType === 'script') return 'JS'
  if (/\.css$/.test(clean) || initiatorType === 'css') return 'CSS'
  if (/\.(png|jpe?g|gif|webp|svg|avif|ico|bmp)$/.test(clean) || initiatorType === 'img') return 'IMG'
  if (/\.(woff2?|ttf|eot|otf)$/.test(clean)) return 'FONT'
  return 'OTHER'
}

function bucketToSizeKey(bucket: ResourceBucket): keyof SizeBreakdown {
  switch (bucket) {
    case 'HTML':
      return 'html'
    case 'JS':
      return 'js'
    case 'CSS':
      return 'css'
    case 'IMG':
      return 'images'
    case 'FONT':
      return 'fonts'
    default:
      return 'other'
  }
}

function hasDeprecatedHtml(html: string): boolean {
  return /<(center|font|marquee|frameset|frame|applet|blink|big|strike|tt|acronym|dir|isindex|nobr|noframes|spacer)[\s>]/i.test(html)
}

function hasInlineStylesCheck(html: string): boolean {
  return /<[a-z][^>]*\sstyle\s*=\s*["']/i.test(html)
}

function isAmpPage(html: string): boolean {
  return /<html[^>]*\s(amp|⚡)(\s|=|>)/i.test(html)
}

function looksMinified(content: string): boolean {
  if (!content || content.length < 50) return true // unknown/empty — don't flag
  const lines = content.split('\n')
  const avgLineLen = content.length / Math.max(1, lines.length)
  const whitespaceRatio = (content.match(/\s/g) || []).length / content.length
  return avgLineLen > 200 || whitespaceRatio < 0.15
}

function mapPriorityToSeverity(priority: 'CRITICAL' | 'MEDIUM' | 'LOW'): 'CRITICAL' | 'WARNING' | 'NOTICE' {
  if (priority === 'CRITICAL') return 'CRITICAL'
  if (priority === 'MEDIUM') return 'WARNING'
  return 'NOTICE'
}

const PERF_CATEGORY: IssueCategory = 'PERFORMANCE'

// ---------------------------------------------------------------------------
// Internal gather shape (Puppeteer or degraded axios fallback)
// ---------------------------------------------------------------------------

interface PuppeteerGather {
  serverResponseMs: number
  pageLoadMs: number
  scriptsCompleteMs: number
  downloadSizeBytes: number
  sizeBreakdown: SizeBreakdown
  compressionRatio: number
  compressionByType: CompressionByType[]
  requestCount: number
  requestsByType: RequestsByType[]
  usesHttp2: boolean
  isAmp: boolean
  hasConsoleErrors: boolean
  minified: { js: boolean; css: boolean }
  deprecatedHtml: boolean
  hasInlineStyles: boolean
  degraded: boolean
}

function emptyGather(): PuppeteerGather {
  return {
    serverResponseMs: 0,
    pageLoadMs: 0,
    scriptsCompleteMs: 0,
    downloadSizeBytes: 0,
    sizeBreakdown: { html: 0, css: 0, js: 0, images: 0, fonts: 0, other: 0 },
    compressionRatio: 0,
    compressionByType: [],
    requestCount: 0,
    requestsByType: [],
    usesHttp2: false,
    isAmp: false,
    hasConsoleErrors: false,
    minified: { js: true, css: true },
    deprecatedHtml: false,
    hasInlineStyles: false,
    degraded: true,
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name)

  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Pure — no DB writes. Works for ANY domain (used by competitor comparison too). */
  async analyze(domain: string): Promise<PerformanceReport> {
    const url = domain.startsWith('http') ? domain : `https://${domain}`
    const recommendations: PriorityRecommendation[] = []

    let gather: PuppeteerGather
    try {
      gather = await this.withTimeout(this.gatherWithPuppeteer(url), 45_000)
    } catch (err: any) {
      this.logger.error(`[Performance] Gather totally failed for ${url}: ${err.message}`)
      gather = emptyGather()
      recommendations.push({
        code: 'PERFORMANCE_ANALYSIS_FAILED',
        title: 'Performans verisi toplanamadı',
        category: PERF_CATEGORY,
        priority: 'LOW',
        howToFix: 'Site şu anda erişilebilir değil ya da analiz zaman aşımına uğradı. Sunucunun ayakta ve erişilebilir olduğundan emin olun.',
      })
    }

    if (gather.degraded) {
      recommendations.push({
        code: 'PERFORMANCE_DEGRADED_ANALYSIS',
        title: 'Detaylı performans analizi tamamlanamadı (tarayıcı tabanlı ölçüm başarısız oldu)',
        category: PERF_CATEGORY,
        priority: 'LOW',
        howToFix: 'Sunucunun headless tarayıcı isteklerini engellemediğinden emin olun. Bu rapor sınırlı (yalnızca HTTP) veriyle hesaplanmıştır.',
      })
    }

    // PSI + CrUX — mobile & desktop in parallel, each fully wrapped, never throws.
    const [mobilePsi, desktopPsi] = await Promise.all([
      this.fetchPsi(url, 'mobile'),
      this.fetchPsi(url, 'desktop'),
    ])

    if (!mobilePsi.psi && !desktopPsi.psi) {
      recommendations.push({
        code: 'PSI_UNAVAILABLE',
        title: 'PageSpeed Insights verisi alınamadı',
        category: PERF_CATEGORY,
        priority: 'LOW',
        howToFix: 'GOOGLE_PSI_API_KEY ortam değişkeni tanımlanmalı veya Google API kotası kontrol edilmeli.',
      })
    }

    const opportunities = mobilePsi.opportunities.length > 0 ? mobilePsi.opportunities : desktopPsi.opportunities

    const psi = { mobile: mobilePsi.psi, desktop: desktopPsi.psi }
    const coreWebVitals = { mobile: mobilePsi.cwv, desktop: desktopPsi.cwv }

    recommendations.push(...this.buildThresholdRecommendations(gather, psi, coreWebVitals, opportunities))

    const report: PerformanceReport = {
      serverResponseMs: gather.serverResponseMs,
      pageLoadMs: gather.pageLoadMs,
      scriptsCompleteMs: gather.scriptsCompleteMs,
      downloadSizeBytes: gather.downloadSizeBytes,
      sizeBreakdown: gather.sizeBreakdown,
      compressionRatio: gather.compressionRatio,
      compressionByType: gather.compressionByType,
      requestCount: gather.requestCount,
      requestsByType: gather.requestsByType,
      opportunities,
      usesHttp2: gather.usesHttp2,
      isAmp: gather.isAmp,
      hasConsoleErrors: gather.hasConsoleErrors,
      minified: gather.minified,
      deprecatedHtml: gather.deprecatedHtml,
      hasInlineStyles: gather.hasInlineStyles,
      psi,
      coreWebVitals,
      recommendations,
    }

    return report
  }

  /** Runs analyze() then persists into SiteAuditReport.performanceJson + SeoIssue rows. */
  async analyzeAndPersist(projectId: string, crawlJobId: string, domain: string): Promise<PerformanceReport> {
    const report = await this.analyze(domain)

    try {
      await this.prisma.siteAuditReport.upsert({
        where: { crawlJobId },
        update: { performanceJson: report as unknown as object },
        create: { crawlJobId, projectId, performanceJson: report as unknown as object },
      })
    } catch (err: any) {
      this.logger.error(`[Performance] Failed to persist SiteAuditReport.performanceJson for crawlJob ${crawlJobId}: ${err.message}`)
    }

    try {
      const perfRecs = report.recommendations.filter((r) => r.category === PERF_CATEGORY)
      for (const rec of perfRecs) {
        try {
          await this.prisma.seoIssue.create({
            data: {
              crawlJobId,
              crawledPageId: null,
              category: 'PERFORMANCE',
              severity: mapPriorityToSeverity(rec.priority),
              code: rec.code,
              message: rec.title,
              recommendation: rec.howToFix,
              autoFixable: false,
            },
          })
        } catch (err: any) {
          this.logger.warn(`[Performance] Failed to insert SeoIssue for ${rec.code}: ${err.message}`)
        }
      }
    } catch (err: any) {
      this.logger.error(`[Performance] Failed to persist SeoIssue rows for crawlJob ${crawlJobId}: ${err.message}`)
    }

    return report
  }

  // -------------------------------------------------------------------------
  // Puppeteer gather
  // -------------------------------------------------------------------------

  private async gatherWithPuppeteer(url: string): Promise<PuppeteerGather> {
    let browser: any = null
    const navStart = Date.now()
    const consoleErrors: string[] = []

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const puppeteer = require('puppeteer')
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      })

      const page = await browser.newPage()
      page.on('console', (msg: any) => {
        try {
          if (msg.type() === 'error') consoleErrors.push(msg.text())
        } catch {
          // ignore malformed console messages
        }
      })
      page.on('pageerror', (err: any) => {
        consoleErrors.push(err && err.message ? err.message : String(err))
      })

      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 })
      const scriptsCompleteMs = Date.now() - navStart

      const html: string = await page.content()

      const rawJson: string = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const perf: any = performance
        const nav = perf.getEntriesByType('navigation')[0]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resources = perf.getEntriesByType('resource') as any[]
        return JSON.stringify({
          nav: nav
            ? {
                transferSize: nav.transferSize || 0,
                encodedBodySize: nav.encodedBodySize || 0,
                decodedBodySize: nav.decodedBodySize || 0,
                responseStart: nav.responseStart || 0,
                requestStart: nav.requestStart || 0,
                loadEventEnd: nav.loadEventEnd || 0,
                domContentLoadedEventEnd: nav.domContentLoadedEventEnd || 0,
                fetchStart: nav.fetchStart || 0,
                nextHopProtocol: nav.nextHopProtocol || '',
              }
            : null,
          resources: resources.map((r) => ({
            name: r.name,
            transferSize: r.transferSize || 0,
            encodedBodySize: r.encodedBodySize || 0,
            decodedBodySize: r.decodedBodySize || 0,
            initiatorType: r.initiatorType || 'other',
            nextHopProtocol: r.nextHopProtocol || '',
            duration: r.duration || 0,
          })),
        })
      })

      const snapshot: RawPerfSnapshot = JSON.parse(rawJson)

      const sizeBreakdown: SizeBreakdown = { html: 0, css: 0, js: 0, images: 0, fonts: 0, other: 0 }
      const encodedByBucket = new Map<ResourceBucket, number>()
      const decodedByBucket = new Map<ResourceBucket, number>()
      const countByBucket = new Map<ResourceBucket, number>()
      let usesHttp2 = false

      if (snapshot.nav) {
        const nav = snapshot.nav
        sizeBreakdown.html += nav.transferSize || nav.encodedBodySize || 0
        encodedByBucket.set('HTML', (encodedByBucket.get('HTML') || 0) + (nav.encodedBodySize || 0))
        decodedByBucket.set('HTML', (decodedByBucket.get('HTML') || 0) + (nav.decodedBodySize || 0))
        countByBucket.set('HTML', (countByBucket.get('HTML') || 0) + 1)
        if (/h2|h3/i.test(nav.nextHopProtocol)) usesHttp2 = true
      }

      for (const r of snapshot.resources) {
        const bucket = classifyResource(r.name, r.initiatorType)
        const key = bucketToSizeKey(bucket)
        sizeBreakdown[key] += r.transferSize || r.encodedBodySize || 0
        encodedByBucket.set(bucket, (encodedByBucket.get(bucket) || 0) + (r.encodedBodySize || 0))
        decodedByBucket.set(bucket, (decodedByBucket.get(bucket) || 0) + (r.decodedBodySize || 0))
        countByBucket.set(bucket, (countByBucket.get(bucket) || 0) + 1)
        if (/h2|h3/i.test(r.nextHopProtocol)) usesHttp2 = true
      }

      const downloadSizeBytes = Object.values(sizeBreakdown).reduce((a, b) => a + b, 0)
      const requestCount = (snapshot.nav ? 1 : 0) + snapshot.resources.length

      const requestsByType: RequestsByType[] = BUCKET_ORDER.filter((b) => (countByBucket.get(b) || 0) > 0).map((b) => ({
        type: b,
        count: countByBucket.get(b) || 0,
      }))

      const compressionByType: CompressionByType[] = BUCKET_ORDER.filter((b) => (decodedByBucket.get(b) || 0) > 0).map((b) => {
        const encoded = encodedByBucket.get(b) || 0
        const decoded = decodedByBucket.get(b) || 0
        const ratio = decoded > 0 ? Math.max(0, 1 - encoded / decoded) : 0
        return { type: b, ratio: Math.round(ratio * 100) / 100 }
      })

      const totalEncoded = Array.from(encodedByBucket.values()).reduce((a, b) => a + b, 0)
      const totalDecoded = Array.from(decodedByBucket.values()).reduce((a, b) => a + b, 0)
      const compressionRatio = totalDecoded > 0 ? Math.round(Math.max(0, 1 - totalEncoded / totalDecoded) * 100) / 100 : 0

      const serverResponseMs = snapshot.nav ? Math.max(0, Math.round(snapshot.nav.responseStart - snapshot.nav.requestStart)) : 0
      const pageLoadMs = snapshot.nav
        ? Math.max(0, Math.round((snapshot.nav.loadEventEnd || snapshot.nav.domContentLoadedEventEnd || 0) - snapshot.nav.fetchStart))
        : scriptsCompleteMs

      // Minification heuristic — fetch the largest JS/CSS resource and inspect it (best-effort).
      const minified = { js: true, css: true }
      const jsResources = snapshot.resources.filter((r) => classifyResource(r.name, r.initiatorType) === 'JS')
      const cssResources = snapshot.resources.filter((r) => classifyResource(r.name, r.initiatorType) === 'CSS')
      const largestJs = jsResources.sort((a, b) => b.transferSize - a.transferSize)[0]
      const largestCss = cssResources.sort((a, b) => b.transferSize - a.transferSize)[0]

      if (largestJs) {
        try {
          const resp = await axios.get<string>(largestJs.name, {
            timeout: 5_000,
            headers: { 'User-Agent': 'FunBreakSEO-PerfAudit/1.0' },
            responseType: 'text',
          })
          minified.js = looksMinified(typeof resp.data === 'string' ? resp.data : '')
        } catch (err: any) {
          this.logger.debug(`[Performance] Could not fetch JS asset for minify check: ${err.message}`)
        }
      }
      if (largestCss) {
        try {
          const resp = await axios.get<string>(largestCss.name, {
            timeout: 5_000,
            headers: { 'User-Agent': 'FunBreakSEO-PerfAudit/1.0' },
            responseType: 'text',
          })
          minified.css = looksMinified(typeof resp.data === 'string' ? resp.data : '')
        } catch (err: any) {
          this.logger.debug(`[Performance] Could not fetch CSS asset for minify check: ${err.message}`)
        }
      }

      return {
        serverResponseMs,
        pageLoadMs,
        scriptsCompleteMs,
        downloadSizeBytes,
        sizeBreakdown,
        compressionRatio,
        compressionByType,
        requestCount,
        requestsByType,
        usesHttp2,
        isAmp: isAmpPage(html),
        hasConsoleErrors: consoleErrors.length > 0,
        minified,
        deprecatedHtml: hasDeprecatedHtml(html),
        hasInlineStyles: hasInlineStylesCheck(html),
        degraded: false,
      }
    } catch (err: any) {
      this.logger.warn(`[Performance] Puppeteer gather failed for ${url}: ${err.message} — falling back to axios`)
      return await this.gatherWithAxiosFallback(url)
    } finally {
      if (browser) {
        try {
          await browser.close()
        } catch {
          // ignore close errors
        }
      }
    }
  }

  private async gatherWithAxiosFallback(url: string): Promise<PuppeteerGather> {
    const start = Date.now()
    try {
      const resp = await axios.get<string>(url, {
        timeout: 15_000,
        headers: { 'User-Agent': 'FunBreakSEO-PerfAudit/1.0', Accept: 'text/html,application/xhtml+xml' },
        maxRedirects: 5,
        validateStatus: () => true,
      })
      const elapsed = Date.now() - start
      const html = typeof resp.data === 'string' ? resp.data : ''
      const lenHeader = resp.headers['content-length']
      const contentLength = lenHeader ? parseInt(String(lenHeader), 10) : Buffer.byteLength(html, 'utf8')
      const encoding = resp.headers['content-encoding']
      const estimatedRatio = encoding ? 0.5 : 0

      return {
        serverResponseMs: elapsed,
        pageLoadMs: elapsed,
        scriptsCompleteMs: elapsed,
        downloadSizeBytes: contentLength,
        sizeBreakdown: { html: contentLength, css: 0, js: 0, images: 0, fonts: 0, other: 0 },
        compressionRatio: estimatedRatio,
        compressionByType: [{ type: 'HTML', ratio: estimatedRatio }],
        requestCount: 1,
        requestsByType: [{ type: 'HTML', count: 1 }],
        usesHttp2: false,
        isAmp: isAmpPage(html),
        hasConsoleErrors: false,
        minified: { js: true, css: true },
        deprecatedHtml: hasDeprecatedHtml(html),
        hasInlineStyles: hasInlineStylesCheck(html),
        degraded: true,
      }
    } catch (err: any) {
      this.logger.error(`[Performance] Axios fallback also failed for ${url}: ${err.message}`)
      return emptyGather()
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>
    const timeout = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Performance analysis timed out after ${ms}ms`)), ms)
    })
    try {
      return await Promise.race([promise, timeout])
    } finally {
      clearTimeout(timer!)
    }
  }

  // -------------------------------------------------------------------------
  // PageSpeed Insights + CrUX (loadingExperience) — one API call covers both.
  // -------------------------------------------------------------------------

  private async fetchPsi(
    url: string,
    strategy: 'mobile' | 'desktop',
  ): Promise<{ psi: PsiStrategyResult | null; cwv: CoreWebVitalsStrategyResult | null; opportunities: PerformanceOpportunity[] }> {
    const apiKey = process.env.GOOGLE_PSI_API_KEY
    if (!apiKey) {
      return { psi: null, cwv: null, opportunities: [] }
    }

    try {
      const resp = await axios.get<any>('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', {
        params: { url, strategy, key: apiKey, category: 'performance' },
        timeout: 15_000,
      })

      const data = resp.data || {}
      const lighthouse = data.lighthouseResult
      const audits = (lighthouse && lighthouse.audits) || {}

      const numeric = (key: string): number => {
        const v = audits[key] && audits[key].numericValue
        return typeof v === 'number' ? Math.round(v) : 0
      }

      const rawScore = lighthouse && lighthouse.categories && lighthouse.categories.performance && lighthouse.categories.performance.score
      const score = typeof rawScore === 'number' ? Math.round(rawScore * 100) : 0

      const clsRaw = audits['cumulative-layout-shift'] && audits['cumulative-layout-shift'].numericValue
      const psi: PsiStrategyResult = {
        score,
        fcp: numeric('first-contentful-paint'),
        speedIndex: numeric('speed-index'),
        lcp: numeric('largest-contentful-paint'),
        tti: numeric('interactive'),
        tbt: numeric('total-blocking-time'),
        cls: typeof clsRaw === 'number' ? clsRaw : 0,
      }

      const experience = data.loadingExperience && data.loadingExperience.metrics ? data.loadingExperience : data.originLoadingExperience
      const metrics = experience && experience.metrics

      const toRating = (category: string | undefined): CwvRating => {
        if (category === 'FAST') return 'GOOD'
        if (category === 'SLOW') return 'POOR'
        return 'NEEDS_IMPROVEMENT'
      }

      let cwv: CoreWebVitalsStrategyResult | null = null
      if (metrics) {
        const lcpMetric = metrics['LARGEST_CONTENTFUL_PAINT_MS']
        const inpMetric = metrics['INTERACTION_TO_NEXT_PAINT']
        const clsMetric = metrics['CUMULATIVE_LAYOUT_SHIFT_SCORE']
        if (lcpMetric || inpMetric || clsMetric) {
          cwv = {
            lcp: { value: (lcpMetric && lcpMetric.percentile) || 0, rating: toRating(lcpMetric && lcpMetric.category) },
            inp: { value: (inpMetric && inpMetric.percentile) || 0, rating: toRating(inpMetric && inpMetric.category) },
            cls: {
              value: clsMetric && typeof clsMetric.percentile === 'number' ? clsMetric.percentile / 100 : 0,
              rating: toRating(clsMetric && clsMetric.category),
            },
          }
        }
      }

      const opportunities: PerformanceOpportunity[] = Object.entries(audits)
        .filter(([, audit]: [string, any]) => audit && audit.details && audit.details.type === 'opportunity' && (audit.details.overallSavingsMs || 0) > 0)
        .map(([id, audit]: [string, any]) => ({
          id,
          title: audit.title as string,
          savingsMs: Math.round(audit.details.overallSavingsMs as number),
        }))
        .sort((a, b) => b.savingsMs - a.savingsMs)
        .slice(0, 8)

      return { psi, cwv, opportunities }
    } catch (err: any) {
      this.logger.warn(`[Performance] PSI (${strategy}) fetch failed for ${url}: ${err.message}`)
      return { psi: null, cwv: null, opportunities: [] }
    }
  }

  // -------------------------------------------------------------------------
  // Threshold-based recommendation engine (mirrors Lighthouse's own thresholds)
  // -------------------------------------------------------------------------

  private buildThresholdRecommendations(
    gather: PuppeteerGather,
    psi: { mobile: PsiStrategyResult | null; desktop: PsiStrategyResult | null },
    cwv: { mobile: CoreWebVitalsStrategyResult | null; desktop: CoreWebVitalsStrategyResult | null },
    opportunities: PerformanceOpportunity[],
  ): PriorityRecommendation[] {
    const recs: PriorityRecommendation[] = []
    const add = (code: string, title: string, priority: 'CRITICAL' | 'MEDIUM' | 'LOW', howToFix: string, affectedCount?: number) => {
      recs.push({ code, title, category: PERF_CATEGORY, priority, howToFix, affectedCount })
    }

    // Server response time (TTFB)
    if (gather.serverResponseMs > 500) {
      add(
        'SERVER_RESPONSE_SLOW',
        `Sunucu yanıt süresi çok yüksek (${gather.serverResponseMs} ms)`,
        'CRITICAL',
        'Sunucu yanıt süresini (TTFB) 500ms altına düşürün: sunucu tarafı önbellekleme, daha hızlı hosting/CDN veya veritabanı sorgu optimizasyonu uygulayın.',
      )
    } else if (gather.serverResponseMs > 200) {
      add(
        'SERVER_RESPONSE_MEDIUM',
        `Sunucu yanıt süresi iyileştirilebilir (${gather.serverResponseMs} ms)`,
        'MEDIUM',
        'TTFB süresini 200ms altına indirmek için sunucu tarafı önbellekleme veya CDN kullanımını değerlendirin.',
      )
    }

    // HTTP/2
    if (!gather.usesHttp2) {
      add(
        'NO_HTTP2',
        'Sunucu HTTP/2 (veya HTTP/3) kullanmıyor',
        'MEDIUM',
        'Sunucuda HTTP/2 veya HTTP/3 protokolünü etkinleştirin; bu, paralel istekleri hızlandırır ve toplam gecikmeyi azaltır.',
      )
    }

    // Minification
    if (!gather.minified.js) {
      add(
        'JS_NOT_MINIFIED',
        'JavaScript dosyaları minify edilmemiş',
        'MEDIUM',
        'JS dosyalarını bir build aracıyla (Terser, esbuild, webpack vb.) minify edin ve gereksiz boşluk/yorumları kaldırın.',
      )
    }
    if (!gather.minified.css) {
      add(
        'CSS_NOT_MINIFIED',
        'CSS dosyaları minify edilmemiş',
        'MEDIUM',
        'CSS dosyalarını bir build aracıyla (cssnano, esbuild vb.) minify edin.',
      )
    }

    // Deprecated HTML
    if (gather.deprecatedHtml) {
      add(
        'DEPRECATED_HTML',
        'Sayfada kullanımdan kaldırılmış (deprecated) HTML etiketleri bulundu',
        'LOW',
        'Etiketleri (<center>, <font>, <marquee> vb.) modern CSS eşdeğerleriyle değiştirin.',
      )
    }

    // Console errors
    if (gather.hasConsoleErrors) {
      add(
        'CONSOLE_ERRORS',
        'Tarayıcı konsolunda JavaScript hataları tespit edildi',
        'MEDIUM',
        'Konsol hatalarını giderin; bu hatalar sayfa performansını, işlevselliğini ve kullanıcı deneyimini olumsuz etkileyebilir.',
      )
    }

    // Inline styles
    if (gather.hasInlineStyles) {
      add(
        'INLINE_STYLES',
        'Sayfada satır içi (inline) stiller kullanılıyor',
        'LOW',
        'Stil tanımlarını harici bir CSS dosyasına taşıyın; bu, tarayıcı önbellekleme ve tekrar kullanım açısından avantaj sağlar.',
      )
    }

    // Compression
    if (gather.compressionRatio < 0.1 && gather.downloadSizeBytes > 0) {
      add(
        'NO_COMPRESSION',
        'Metin tabanlı kaynaklar sıkıştırılmıyor (Gzip/Brotli)',
        'CRITICAL',
        'Sunucuda Gzip veya Brotli sıkıştırmasını etkinleştirin; bu, aktarılan veri boyutunu önemli ölçüde azaltır.',
      )
    } else if (gather.compressionRatio < 0.5 && gather.downloadSizeBytes > 0) {
      add(
        'LOW_COMPRESSION',
        'Sıkıştırma oranı düşük',
        'MEDIUM',
        'Metin tabanlı kaynaklar (HTML/CSS/JS) için Brotli sıkıştırmasına geçmeyi değerlendirin.',
      )
    }

    // Total page weight
    if (gather.downloadSizeBytes > 5_000_000) {
      add(
        'PAGE_TOO_HEAVY',
        `Sayfa toplam boyutu çok yüksek (${(gather.downloadSizeBytes / 1_000_000).toFixed(1)} MB)`,
        'CRITICAL',
        'Görselleri sıkıştırın/WebP-AVIF formatına dönüştürün, kullanılmayan JS/CSS kodlarını kaldırın ve lazy-loading uygulayın.',
      )
    } else if (gather.downloadSizeBytes > 2_000_000) {
      add(
        'PAGE_HEAVY',
        `Sayfa toplam boyutu yüksek (${(gather.downloadSizeBytes / 1_000_000).toFixed(1)} MB)`,
        'MEDIUM',
        'Görsel ve script boyutlarını optimize ederek toplam sayfa ağırlığını azaltın.',
      )
    }

    // Request count
    if (gather.requestCount > 100) {
      add(
        'TOO_MANY_REQUESTS',
        `Sayfa çok fazla istek tetikliyor (${gather.requestCount})`,
        'MEDIUM',
        'İstek sayısını azaltmak için dosya birleştirme (bundling), sprite kullanımı veya HTTP/2 multiplexing uygulayın.',
      )
    }

    // Lighthouse opportunities (already capped to top 8, sorted desc by savingsMs)
    for (const opp of opportunities) {
      const priority: 'CRITICAL' | 'MEDIUM' | 'LOW' = opp.savingsMs > 2000 ? 'CRITICAL' : opp.savingsMs > 500 ? 'MEDIUM' : 'LOW'
      add(
        `PSI_OPP_${opp.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`,
        opp.title,
        priority,
        `Bu iyileştirme tahmini ${opp.savingsMs}ms kazanç sağlayabilir (Lighthouse opportunity: ${opp.id}).`,
      )
    }

    // PSI category scores
    if (psi.mobile) {
      if (psi.mobile.score < 50) {
        add('PSI_MOBILE_SCORE_LOW', `Mobil PageSpeed skoru düşük (${psi.mobile.score}/100)`, 'CRITICAL', 'Mobil performans skorunu yükseltmek için render-blocking kaynakları azaltın, görselleri optimize edin ve JS yürütme süresini kısaltın.')
      } else if (psi.mobile.score < 90) {
        add('PSI_MOBILE_SCORE_MEDIUM', `Mobil PageSpeed skoru iyileştirilebilir (${psi.mobile.score}/100)`, 'MEDIUM', 'Mobil deneyimi 90+ skora taşımak için Lighthouse önerilerini (opportunities) uygulayın.')
      }
    }
    if (psi.desktop) {
      if (psi.desktop.score < 50) {
        add('PSI_DESKTOP_SCORE_LOW', `Masaüstü PageSpeed skoru düşük (${psi.desktop.score}/100)`, 'MEDIUM', 'Masaüstü performans skorunu yükseltmek için render-blocking kaynakları azaltın ve gereksiz JS/CSS kodunu kaldırın.')
      } else if (psi.desktop.score < 90) {
        add('PSI_DESKTOP_SCORE_MEDIUM', `Masaüstü PageSpeed skoru iyileştirilebilir (${psi.desktop.score}/100)`, 'LOW', 'Masaüstü deneyimi 90+ skora taşımak için Lighthouse önerilerini (opportunities) uygulayın.')
      }
    }

    // Core Web Vitals (real-user CrUX field data)
    const cwvChecks: Array<{ strategy: 'mobil' | 'masaüstü'; data: CoreWebVitalsStrategyResult | null }> = [
      { strategy: 'mobil', data: cwv.mobile },
      { strategy: 'masaüstü', data: cwv.desktop },
    ]
    for (const { strategy, data } of cwvChecks) {
      if (!data) continue
      if (data.lcp.rating !== 'GOOD') {
        add(
          `CWV_LCP_${strategy === 'mobil' ? 'MOBILE' : 'DESKTOP'}`,
          `LCP (En Büyük İçerikli Boyama) ${strategy === 'mobil' ? 'mobilde' : 'masaüstünde'} ${data.lcp.rating === 'POOR' ? 'zayıf' : 'iyileştirilmeli'} (${data.lcp.value} ms)`,
          data.lcp.rating === 'POOR' ? 'CRITICAL' : 'MEDIUM',
          'En büyük içerik öğesinin (görsel, video veya metin bloğu) yüklenme süresini kısaltın: sunucu yanıt süresini iyileştirin, render-blocking kaynakları azaltın, kritik görselleri preload edin.',
        )
      }
      if (data.cls.rating !== 'GOOD') {
        add(
          `CWV_CLS_${strategy === 'mobil' ? 'MOBILE' : 'DESKTOP'}`,
          `CLS (Kümülatif Düzen Kayması) ${strategy === 'mobil' ? 'mobilde' : 'masaüstünde'} ${data.cls.rating === 'POOR' ? 'zayıf' : 'iyileştirilmeli'} (${data.cls.value})`,
          data.cls.rating === 'POOR' ? 'CRITICAL' : 'MEDIUM',
          'Görsel ve reklamlara sabit boyut (width/height) tanımlayın, fontları önceden yükleyin (font-display:swap) ve DOM üstüne dinamik içerik eklemekten kaçının.',
        )
      }
      if (data.inp.rating !== 'GOOD') {
        add(
          `CWV_INP_${strategy === 'mobil' ? 'MOBILE' : 'DESKTOP'}`,
          `INP (Sonraki Boyamaya Etkileşim) ${strategy === 'mobil' ? 'mobilde' : 'masaüstünde'} ${data.inp.rating === 'POOR' ? 'zayıf' : 'iyileştirilmeli'} (${data.inp.value} ms)`,
          data.inp.rating === 'POOR' ? 'CRITICAL' : 'MEDIUM',
          'Ana iş parçacığını bloke eden uzun JavaScript görevlerini parçalayın (code-splitting), üçüncü parti scriptleri erteleyin (defer/async).',
        )
      }
    }

    return recs
  }
}
