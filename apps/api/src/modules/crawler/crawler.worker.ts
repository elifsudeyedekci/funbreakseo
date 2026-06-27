import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { Injectable, Logger } from '@nestjs/common'
import { IssueCategory, IssueSeverity, CrawlJobStatus } from '@prisma/client'
import axios, { AxiosResponse } from 'axios'
import { PrismaService } from '../../prisma.service'

// ---------------------------------------------------------------------------
// HTML parsing helpers (regex-based, no external parser dependency)
// ---------------------------------------------------------------------------

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? m[1].trim() : null
}

function extractMetaDescription(html: string): string | null {
  const m =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)[^>]+name=["']description["']/i)
  return m ? m[1].trim() : null
}

function countH1(html: string): number {
  return (html.match(/<h1[\s>]/gi) || []).length
}

function extractH1Text(html: string): string | null {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : null
}

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.split(' ').filter((w) => w.length > 0).length
}

function hasSchema(html: string): boolean {
  return /application\/ld\+json/i.test(html) || /itemscope/i.test(html)
}

function extractCanonical(html: string): string | null {
  const m =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i) ||
    html.match(/<link[^>]+href=["']([^"']*)[^>]+rel=["']canonical["']/i)
  return m ? m[1].trim() : null
}

function hasViewport(html: string): boolean {
  return /<meta[^>]+name=["']viewport["']/i.test(html)
}

function isNoIndex(html: string): boolean {
  return /<meta[^>]+content=["'][^"']*noindex[^"']*["']/i.test(html)
}

function countImages(html: string): { total: number; noAlt: number } {
  const imgs = html.match(/<img[^>]*>/gi) || []
  const noAlt = imgs.filter(
    (img) => !/<img[^>]+alt=["'][^"']+["']/i.test(img),
  ).length
  return { total: imgs.length, noAlt }
}

function countLinks(
  html: string,
  baseUrl: string,
): { internal: number; external: number } {
  const links = html.match(/href=["']([^"'#?]*)/gi) || []
  let internal = 0
  let external = 0
  let base: string
  try {
    base = new URL(baseUrl).hostname
  } catch {
    base = ''
  }
  for (const link of links) {
    const href = link.replace(/href=["']/i, '')
    if (href.startsWith('http')) {
      try {
        new URL(href).hostname === base ? internal++ : external++
      } catch {
        // malformed URL — skip
      }
    } else if (href.startsWith('/')) {
      internal++
    }
  }
  return { internal, external }
}

function hasMixedContent(html: string): boolean {
  return /src=["']http:\/\//i.test(html) || /href=["']http:\/\//i.test(html)
}

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

interface PageData {
  url: string
  statusCode: number
  html: string
  loadTimeMs: number
  finalUrl: string
  redirectCount: number
}

interface PageAnalysis {
  title: string | null
  titleLength: number
  metaDescription: string | null
  metaLength: number
  h1Count: number
  h1Text: string | null
  wordCount: number
  isIndexable: boolean
  canonicalUrl: string | null
  hasSchema: boolean
  imgCount: number
  imgNoAlt: number
  internalLinks: number
  externalLinks: number
  totalLinks: number
  hasViewport: boolean
  isHttps: boolean
  hasMixedContent: boolean
}

interface IssueRecord {
  ruleId: string
  category: IssueCategory
  severity: IssueSeverity
  code: string
  message: string
  recommendation: string
  autoFixable: boolean
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

@Processor('crawler')
@Injectable()
export class CrawlerWorker extends WorkerHost {
  private readonly logger = new Logger(CrawlerWorker.name)

  constructor(private readonly prisma: PrismaService) {
    super()
  }

  // -------------------------------------------------------------------------
  // Entry point
  // -------------------------------------------------------------------------

  async process(job: Job<{ crawlJobId: string; projectId: string }>): Promise<void> {
    const { crawlJobId, projectId } = job.data
    this.logger.log(`[Job ${job.id}] Starting crawl for project ${projectId}, crawlJobId=${crawlJobId}`)

    // Mark as RUNNING
    await this.prisma.crawlJob.update({
      where: { id: crawlJobId },
      data: { status: CrawlJobStatus.RUNNING, startedAt: new Date() },
    })

    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, domain: true },
      })

      if (!project) {
        throw new Error(`Project ${projectId} not found`)
      }

      const domain = project.domain.startsWith('http')
        ? project.domain
        : `https://${project.domain}`

      // Pre-load rule definitions to get correct UUIDs for FK reference
      const ruleDefs = await this.prisma.seoRuleDefinition.findMany({ select: { id: true, code: true } })
      const ruleIdByCode = new Map(ruleDefs.map((r) => [r.code, r.id]))

      // Step 1: Discover URLs
      const urls = await this.discoverUrls(domain)
      this.logger.log(`[Job ${job.id}] Discovered ${urls.length} URLs`)

      // Step 2: Crawl each URL and run SEO analysis
      const titlesSeen = new Map<string, string>()  // title -> url
      const metasSeen = new Map<string, string>()   // meta -> url

      let totalIssues = 0
      let pagesScanned = 0
      let cumulativeScore = 0

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i]
        this.logger.debug(`[Job ${job.id}] Crawling (${i + 1}/${urls.length}): ${url}`)

        let pageData: PageData | null = null
        try {
          pageData = await this.fetchPage(url)
        } catch (err: any) {
          this.logger.warn(`[Job ${job.id}] Failed to fetch ${url}: ${err.message}`)
          // Record as a broken/unreachable page with status 0
          pageData = {
            url,
            statusCode: 0,
            html: '',
            loadTimeMs: 0,
            finalUrl: url,
            redirectCount: 0,
          }
        }

        const analysis = this.analysePage(pageData)
        const issues = this.runRules(pageData, analysis, titlesSeen, metasSeen, domain)

        try {
          // Persist CrawledPage
          const crawledPage = await this.prisma.crawledPage.create({
            data: {
              crawlJobId,
              url: pageData.url,
              statusCode: pageData.statusCode,
              title: analysis.title,
              titleLength: analysis.titleLength,
              metaDescription: analysis.metaDescription,
              metaLength: analysis.metaLength,
              h1Count: analysis.h1Count,
              wordCount: analysis.wordCount,
              loadTimeMs: pageData.loadTimeMs,
              isIndexable: analysis.isIndexable,
              canonicalUrl: analysis.canonicalUrl,
              hasSchema: analysis.hasSchema,
              depth: this.estimateDepth(pageData.url, domain),
            },
          })

          // Persist SeoIssues
          if (issues.length > 0) {
            await this.prisma.seoIssue.createMany({
              data: issues.map((issue) => ({
                crawlJobId,
                crawledPageId: crawledPage.id,
                ruleId: ruleIdByCode.get(issue.code) ?? null,
                category: issue.category,
                severity: issue.severity,
                code: issue.code,
                message: issue.message,
                recommendation: issue.recommendation,
                autoFixable: issue.autoFixable,
                fixed: false,
              })),
            })
          }

          totalIssues += issues.length
          pagesScanned++

          // Accumulate per-page health contribution
          const pageScore = this.calculatePageScore(issues)
          cumulativeScore += pageScore
        } catch (pageErr: any) {
          this.logger.warn(`[Job ${job.id}] Failed to persist page ${pageData.url}: ${pageErr.message}`)
          // Continue crawling remaining pages even if one fails to save
        }

        // Track duplicates (outside try/catch — safe operations)
        if (analysis.title) {
          titlesSeen.set(analysis.title, pageData.url)
        }
        if (analysis.metaDescription) {
          metasSeen.set(analysis.metaDescription, pageData.url)
        }
      }

      // Step 3: Calculate overall health score
      const healthScore =
        pagesScanned > 0
          ? Math.max(0, Math.min(100, Math.round(cumulativeScore / pagesScanned)))
          : 100

      // Step 4: Finalize CrawlJob
      await this.prisma.crawlJob.update({
        where: { id: crawlJobId },
        data: {
          status: CrawlJobStatus.DONE,
          finishedAt: new Date(),
          pagesScanned,
          issuesFound: totalIssues,
          healthScore,
        },
      })

      // Step 5: Update Project health score
      await this.prisma.project.update({
        where: { id: projectId },
        data: { healthScore },
      })

      this.logger.log(
        `[Job ${job.id}] Crawl DONE — pages=${pagesScanned}, issues=${totalIssues}, healthScore=${healthScore}`,
      )

      // Step 6: Notify (Socket.io gateway would pick this up in a real setup)
      this.logger.log(
        `[Job ${job.id}] EMIT crawler:done { crawlJobId: "${crawlJobId}", projectId: "${projectId}", healthScore: ${healthScore} }`,
      )
    } catch (err: any) {
      this.logger.error(`[Job ${job.id}] Crawl FAILED: ${err.message}`, err.stack)

      await this.prisma.crawlJob.update({
        where: { id: crawlJobId },
        data: {
          status: CrawlJobStatus.FAILED,
          finishedAt: new Date(),
        },
      })

      throw err // Re-throw so BullMQ marks the job as failed
    }
  }

  // -------------------------------------------------------------------------
  // URL discovery
  // -------------------------------------------------------------------------

  private async discoverUrls(domain: string): Promise<string[]> {
    const sitemapUrl = `${domain.replace(/\/$/, '')}/sitemap.xml`
    try {
      const response = await axios.get<string>(sitemapUrl, {
        timeout: 10_000,
        headers: { 'User-Agent': 'FunBreakSEO-Crawler/1.0' },
        maxRedirects: 5,
      })

      const raw = response.data as string
      const matches = [...raw.matchAll(/<loc>(.*?)<\/loc>/g)]
      const urls = matches
        .map((m) => m[1].trim())
        .filter((u) => u.startsWith('http'))
        .slice(0, 100)

      if (urls.length > 0) {
        this.logger.log(`Sitemap found at ${sitemapUrl} — ${urls.length} URLs`)
        return urls
      }
    } catch (err: any) {
      this.logger.warn(`Sitemap fetch failed (${sitemapUrl}): ${err.message} — falling back to homepage`)
    }

    return [domain.replace(/\/$/, '') + '/']
  }

  // -------------------------------------------------------------------------
  // Page fetching
  // -------------------------------------------------------------------------

  private async fetchPage(url: string): Promise<PageData> {
    const start = Date.now()
    let redirectCount = 0
    let finalUrl = url

    const response: AxiosResponse<string> = await axios.get<string>(url, {
      timeout: 5_000,
      headers: {
        'User-Agent': 'FunBreakSEO-Crawler/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
      maxRedirects: 5,
      validateStatus: () => true, // Don't throw on 4xx/5xx
      onDownloadProgress: () => {},
    })

    // Axios follows redirects internally; count via response history if available
    if ((response as any).request?.res?.responseUrl) {
      finalUrl = (response as any).request.res.responseUrl
      if (finalUrl !== url) {
        redirectCount = 1 // Axios collapses chain; approximate count
      }
    } else {
      finalUrl = url
    }

    const loadTimeMs = Date.now() - start

    return {
      url,
      statusCode: response.status,
      html: typeof response.data === 'string' ? response.data : '',
      loadTimeMs,
      finalUrl,
      redirectCount,
    }
  }

  // -------------------------------------------------------------------------
  // Page analysis
  // -------------------------------------------------------------------------

  private analysePage(page: PageData): PageAnalysis {
    const { html, url } = page

    const title = extractTitle(html)
    const metaDescription = extractMetaDescription(html)
    const h1Count = countH1(html)
    const h1Text = extractH1Text(html)
    const wordCount = countWords(html)
    const canonicalUrl = extractCanonical(html)
    const schema = hasSchema(html)
    const viewport = hasViewport(html)
    const noindex = isNoIndex(html)
    const images = countImages(html)
    const links = countLinks(html, url)
    const mixedContent = hasMixedContent(html)
    const isHttps = url.startsWith('https://')

    return {
      title,
      titleLength: title ? title.length : 0,
      metaDescription,
      metaLength: metaDescription ? metaDescription.length : 0,
      h1Count,
      h1Text,
      wordCount,
      isIndexable: !noindex && page.statusCode < 400,
      canonicalUrl,
      hasSchema: schema,
      imgCount: images.total,
      imgNoAlt: images.noAlt,
      internalLinks: links.internal,
      externalLinks: links.external,
      totalLinks: links.internal + links.external,
      hasViewport: viewport,
      isHttps,
      hasMixedContent: mixedContent,
    }
  }

  // -------------------------------------------------------------------------
  // SEO rule engine
  // -------------------------------------------------------------------------

  private runRules(
    page: PageData,
    analysis: PageAnalysis,
    titlesSeen: Map<string, string>,
    metasSeen: Map<string, string>,
    domain: string,
  ): IssueRecord[] {
    const issues: IssueRecord[] = []

    const add = (
      code: string,
      category: IssueCategory,
      severity: IssueSeverity,
      message: string,
      recommendation: string,
      autoFixable = false,
    ) => {
      issues.push({ ruleId: code, code, category, severity, message, recommendation, autoFixable })
    }

    // -----------------------------------------------------------------------
    // TITLE rules
    // -----------------------------------------------------------------------
    if (!analysis.title) {
      add(
        'TITLE_MISSING',
        IssueCategory.TITLE,
        IssueSeverity.CRITICAL,
        'Page is missing a <title> tag.',
        'Add a descriptive <title> tag between 30–60 characters to this page.',
        true,
      )
    } else {
      if (analysis.titleLength < 30) {
        add(
          'TITLE_TOO_SHORT',
          IssueCategory.TITLE,
          IssueSeverity.WARNING,
          `Title is too short (${analysis.titleLength} chars). Minimum recommended: 30.`,
          'Expand the title to be between 30 and 60 characters for better SEO.',
        )
      }
      if (analysis.titleLength > 60) {
        add(
          'TITLE_TOO_LONG',
          IssueCategory.TITLE,
          IssueSeverity.WARNING,
          `Title is too long (${analysis.titleLength} chars). Maximum recommended: 60.`,
          'Shorten the title to under 60 characters to avoid truncation in SERPs.',
        )
      }
      // Duplicate title
      const prevTitleUrl = titlesSeen.get(analysis.title)
      if (prevTitleUrl && prevTitleUrl !== page.url) {
        add(
          'DUPLICATE_TITLE',
          IssueCategory.TITLE,
          IssueSeverity.WARNING,
          `Duplicate title found. Same title also used on: ${prevTitleUrl}`,
          'Each page should have a unique, descriptive title tag.',
        )
      }
    }

    // -----------------------------------------------------------------------
    // META DESCRIPTION rules
    // -----------------------------------------------------------------------
    if (!analysis.metaDescription) {
      add(
        'META_DESC_MISSING',
        IssueCategory.META,
        IssueSeverity.CRITICAL,
        'Page is missing a meta description.',
        'Add a meta description between 80–155 characters to improve click-through rate.',
        true,
      )
    } else {
      if (analysis.metaLength < 80) {
        add(
          'META_DESC_TOO_SHORT',
          IssueCategory.META,
          IssueSeverity.WARNING,
          `Meta description is too short (${analysis.metaLength} chars). Minimum recommended: 80.`,
          'Expand the meta description to between 80 and 155 characters.',
        )
      }
      if (analysis.metaLength > 155) {
        add(
          'META_DESC_TOO_LONG',
          IssueCategory.META,
          IssueSeverity.WARNING,
          `Meta description is too long (${analysis.metaLength} chars). Maximum recommended: 155.`,
          'Shorten the meta description to under 155 characters to avoid truncation.',
        )
      }
      // Duplicate meta description
      const prevMetaUrl = metasSeen.get(analysis.metaDescription)
      if (prevMetaUrl && prevMetaUrl !== page.url) {
        add(
          'DUPLICATE_META',
          IssueCategory.META,
          IssueSeverity.WARNING,
          `Duplicate meta description found. Same description also used on: ${prevMetaUrl}`,
          'Each page should have a unique meta description that summarises its content.',
        )
      }
    }

    // -----------------------------------------------------------------------
    // HEADING rules
    // -----------------------------------------------------------------------
    if (analysis.h1Count === 0) {
      add(
        'H1_MISSING',
        IssueCategory.HEADING,
        IssueSeverity.CRITICAL,
        'Page has no <h1> heading.',
        'Add exactly one <h1> heading that describes the primary topic of this page.',
      )
    } else {
      if (analysis.h1Count > 1) {
        add(
          'MULTIPLE_H1',
          IssueCategory.HEADING,
          IssueSeverity.WARNING,
          `Page has ${analysis.h1Count} <h1> headings. Only one is recommended.`,
          'Reduce to a single <h1> heading and use <h2>–<h6> for sub-headings.',
        )
      }
      if (analysis.h1Text && analysis.h1Text.length > 70) {
        add(
          'H1_TOO_LONG',
          IssueCategory.HEADING,
          IssueSeverity.NOTICE,
          `<h1> text is too long (${analysis.h1Text.length} chars). Recommended max: 70.`,
          'Shorten the <h1> text to be concise and keyword-focused (under 70 characters).',
        )
      }
    }

    // -----------------------------------------------------------------------
    // SECURITY rules
    // -----------------------------------------------------------------------
    if (!analysis.isHttps) {
      add(
        'NO_HTTPS',
        IssueCategory.SECURITY,
        IssueSeverity.CRITICAL,
        'Page is served over HTTP instead of HTTPS.',
        'Migrate the site to HTTPS by obtaining an SSL/TLS certificate and enforcing HTTPS redirects.',
      )
    }

    if (analysis.isHttps && analysis.hasMixedContent) {
      add(
        'MIXED_CONTENT',
        IssueCategory.SECURITY,
        IssueSeverity.CRITICAL,
        'Page loads insecure (HTTP) resources on an HTTPS page (mixed content).',
        'Update all resource URLs to use HTTPS to prevent browser security warnings.',
      )
    }

    // -----------------------------------------------------------------------
    // SCHEMA / CANONICAL rules
    // -----------------------------------------------------------------------
    if (!analysis.canonicalUrl) {
      add(
        'MISSING_CANONICAL',
        IssueCategory.SCHEMA,
        IssueSeverity.WARNING,
        'Page does not have a canonical tag.',
        'Add a <link rel="canonical"> tag pointing to the preferred URL of this page.',
        true,
      )
    } else {
      // Normalise both URLs for comparison (strip trailing slash)
      const normalise = (u: string) => u.replace(/\/$/, '').toLowerCase()
      if (normalise(analysis.canonicalUrl) !== normalise(page.finalUrl)) {
        add(
          'DUPLICATE_CANONICAL',
          IssueCategory.SCHEMA,
          IssueSeverity.WARNING,
          `Canonical URL (${analysis.canonicalUrl}) differs from the page URL (${page.finalUrl}).`,
          'Ensure the canonical tag points to the correct, preferred version of this URL.',
        )
      }
    }

    if (!analysis.hasSchema) {
      add(
        'NO_SCHEMA',
        IssueCategory.SCHEMA,
        IssueSeverity.WARNING,
        'Page has no structured data (JSON-LD or microdata).',
        'Add relevant Schema.org structured data (e.g. Article, Product, BreadcrumbList) to improve rich results.',
      )
    }

    // -----------------------------------------------------------------------
    // SPEED rules
    // -----------------------------------------------------------------------
    if (page.loadTimeMs > 6_000) {
      add(
        'VERY_SLOW_PAGE',
        IssueCategory.SPEED,
        IssueSeverity.CRITICAL,
        `Page load time is very slow (${page.loadTimeMs} ms). Threshold: 6000 ms.`,
        'Optimise server response time, enable caching, compress assets, and use a CDN.',
      )
    } else if (page.loadTimeMs > 3_000) {
      add(
        'SLOW_PAGE',
        IssueCategory.SPEED,
        IssueSeverity.WARNING,
        `Page load time is slow (${page.loadTimeMs} ms). Threshold: 3000 ms.`,
        'Reduce server response time, minify JavaScript/CSS, and optimise images.',
      )
    }

    // -----------------------------------------------------------------------
    // CONTENT rules
    // -----------------------------------------------------------------------
    if (analysis.wordCount < 300) {
      add(
        'THIN_CONTENT',
        IssueCategory.CONTENT,
        IssueSeverity.WARNING,
        `Page has thin content (${analysis.wordCount} words). Minimum recommended: 300.`,
        'Add more substantive, keyword-relevant content to this page (aim for 300+ words).',
      )
    } else if (analysis.wordCount < 500) {
      add(
        'LOW_WORD_COUNT',
        IssueCategory.CONTENT,
        IssueSeverity.NOTICE,
        `Page word count is low (${analysis.wordCount} words). Recommended: 500+.`,
        'Consider expanding the content to at least 500 words for better topical authority.',
      )
    }

    if (analysis.imgNoAlt > 0) {
      add(
        'NO_ALT_TEXT',
        IssueCategory.CONTENT,
        IssueSeverity.WARNING,
        `${analysis.imgNoAlt} image(s) are missing alt attributes.`,
        'Add descriptive alt text to all images for accessibility and image SEO.',
      )
    }

    // -----------------------------------------------------------------------
    // LINKS rules
    // -----------------------------------------------------------------------
    if (analysis.internalLinks === 0) {
      add(
        'NO_INTERNAL_LINKS',
        IssueCategory.LINKS,
        IssueSeverity.WARNING,
        'Page has no internal links.',
        'Add internal links to related pages to help crawlers discover content and distribute PageRank.',
      )
    }

    if (analysis.totalLinks > 100) {
      add(
        'TOO_MANY_LINKS',
        IssueCategory.LINKS,
        IssueSeverity.NOTICE,
        `Page has an excessive number of links (${analysis.totalLinks}). Recommended max: 100.`,
        'Reduce the number of links on this page to avoid diluting PageRank and improve user experience.',
      )
    }

    if (page.statusCode >= 400) {
      add(
        'BROKEN_LINK',
        IssueCategory.LINKS,
        IssueSeverity.CRITICAL,
        `Page returned HTTP ${page.statusCode} — broken or inaccessible URL.`,
        'Fix or remove broken links. Set up proper 301 redirects if the content has moved.',
      )
    }

    // -----------------------------------------------------------------------
    // MOBILE rules
    // -----------------------------------------------------------------------
    if (!analysis.hasViewport) {
      add(
        'MISSING_VIEWPORT',
        IssueCategory.MOBILE,
        IssueSeverity.CRITICAL,
        'Page is missing the viewport meta tag required for mobile responsiveness.',
        'Add <meta name="viewport" content="width=device-width, initial-scale=1"> inside <head>.',
        true,
      )
    }

    // -----------------------------------------------------------------------
    // TECHNICAL rules
    // -----------------------------------------------------------------------
    if (page.redirectCount >= 2) {
      add(
        'REDIRECT_CHAIN',
        IssueCategory.TECHNICAL,
        IssueSeverity.WARNING,
        `Page has a redirect chain of ${page.redirectCount} hops.`,
        'Reduce redirect chains to a single direct redirect to save crawl budget and latency.',
      )
    }

    if (!analysis.isIndexable) {
      add(
        'NOT_INDEXABLE',
        IssueCategory.TECHNICAL,
        IssueSeverity.NOTICE,
        'Page has a noindex directive and will not be indexed by search engines.',
        'Verify this is intentional. Remove the noindex tag if the page should appear in search results.',
      )
    }

    return issues
  }

  // -------------------------------------------------------------------------
  // Health score helpers
  // -------------------------------------------------------------------------

  private calculatePageScore(issues: IssueRecord[]): number {
    let score = 100

    for (const issue of issues) {
      switch (issue.severity) {
        case IssueSeverity.CRITICAL:
          score -= 5
          break
        case IssueSeverity.WARNING:
          score -= 2
          break
        case IssueSeverity.NOTICE:
          score -= 0.5
          break
      }
    }

    return Math.max(0, score)
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  private estimateDepth(url: string, domain: string): number {
    try {
      const base = domain.replace(/\/$/, '')
      const path = url.replace(base, '').replace(/^\//, '')
      if (!path || path === '/') return 0
      return path.split('/').filter(Boolean).length
    } catch {
      return 0
    }
  }
}
