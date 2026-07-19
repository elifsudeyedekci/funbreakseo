import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import { PriorityRecommendation, IssueCategory } from '@funbreakseo/shared'
import { PrismaService } from '../../prisma.service'
import { DataForSeoService } from '../dataforseo/dataforseo.service'

// ---------------------------------------------------------------------------
// HTML parsing helpers (regex-based, matches crawler.worker.ts house style —
// no external HTML parser dependency).
// ---------------------------------------------------------------------------

function stripTagsAndCountWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length === 0 ? 0 : text.split(' ').filter((w) => w.length > 0).length
}

/** Extracts every JSON-LD block from raw HTML, parsing each independently so one
 * malformed block never discards the rest. Flattens `@graph` arrays. */
function extractJsonLd(html: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim())
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        if (item && typeof item === 'object') {
          if (Array.isArray((item as Record<string, unknown>)['@graph'])) {
            for (const g of (item as Record<string, unknown>)['@graph'] as unknown[]) {
              if (g && typeof g === 'object') blocks.push(g as Record<string, unknown>)
            }
          } else {
            blocks.push(item as Record<string, unknown>)
          }
        }
      }
    } catch {
      // Skip malformed JSON-LD block, continue parsing the rest.
    }
  }
  return blocks
}

function typeMatches(rawType: unknown, needle: string): boolean {
  const types = Array.isArray(rawType) ? rawType : [rawType]
  return types.some((t) => typeof t === 'string' && t.toLowerCase().includes(needle.toLowerCase()))
}

function typeIsAnyOf(rawType: unknown, needles: string[]): string | null {
  const types = Array.isArray(rawType) ? rawType : [rawType]
  for (const t of types) {
    if (typeof t !== 'string') continue
    for (const n of needles) {
      if (t.toLowerCase() === n.toLowerCase()) return t
    }
  }
  return null
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

export interface GeoAuditReport {
  identitySchema: { found: boolean; type: string | null; name: string | null } | null
  llmReadability: {
    renderedWordCount: number
    staticWordCount: number
    jsRenderedPercent: number
    rating: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR'
  }
  llmsTxt: { found: boolean; url: string | null }
  structuredDataIssues: { schemaType: string; missingFields: string[] }[]
  eeat: { score: number; factors: { label: string; present: boolean; weight: number }[] }
  recommendations: PriorityRecommendation[]
}

export interface AiOverviewTrackingEntry {
  keyword: string
  hasAiOverview: boolean
  cited: boolean
}

@Injectable()
export class GeoAuditService {
  private readonly logger = new Logger(GeoAuditService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly dataForSeoService: DataForSeoService,
  ) {}

  // -------------------------------------------------------------------------
  // analyzeGeoAudit — pure, no DB writes. Works for any domain string.
  // -------------------------------------------------------------------------
  async analyzeGeoAudit(domain: string): Promise<GeoAuditReport> {
    const normalizedUrl = domain.startsWith('http') ? domain : `https://${domain}`

    // --- 1. Static HTML fetch (axios) ---------------------------------------
    let staticHtml = ''
    try {
      const res = await axios.get<string>(normalizedUrl, {
        timeout: 5_000,
        headers: {
          'User-Agent': 'FunBreakSEO-Crawler/1.0',
          Accept: 'text/html,application/xhtml+xml',
        },
        maxRedirects: 5,
        validateStatus: () => true,
      })
      staticHtml = typeof res.data === 'string' ? res.data : ''
    } catch (err) {
      this.logger.warn(`GEO audit: static fetch failed for ${normalizedUrl}: ${(err as Error).message}`)
    }

    // --- 2. Rendered HTML fetch (puppeteer) ---------------------------------
    let renderedWordCount = 0
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      })
      try {
        const page = await browser.newPage()
        await page.goto(normalizedUrl, { waitUntil: 'networkidle0', timeout: 20_000 })
        // No DOM lib in this tsconfig (ES2022 only) — access `document` via
        // globalThis so TS doesn't need the dom lib typings; this still runs
        // fine inside the puppeteer browser page context.
        const innerText: string = await page.evaluate(() => {
          const doc = (globalThis as any).document
          return doc && doc.body ? (doc.body.innerText ?? '') : ''
        })
        renderedWordCount = innerText.split(/\s+/).filter((w) => w.length > 0).length
      } finally {
        await browser.close()
      }
    } catch (err) {
      this.logger.warn(`GEO audit: puppeteer render failed for ${normalizedUrl}: ${(err as Error).message}`)
    }

    const staticWordCount = stripTagsAndCountWords(staticHtml)
    const jsRenderedPercent =
      renderedWordCount > 0 ? Math.max(0, ((renderedWordCount - staticWordCount) / renderedWordCount) * 100) : 0
    const rating: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' =
      jsRenderedPercent < 15 ? 'GOOD' : jsRenderedPercent < 40 ? 'NEEDS_IMPROVEMENT' : 'POOR'

    // --- 3. llms.txt ----------------------------------------------------------
    let llmsTxt: { found: boolean; url: string | null } = { found: false, url: null }
    try {
      const llmsTxtUrl = `${normalizedUrl.replace(/\/$/, '')}/llms.txt`
      const res = await axios.get<string>(llmsTxtUrl, {
        timeout: 5_000,
        headers: { 'User-Agent': 'FunBreakSEO-Crawler/1.0' },
        validateStatus: () => true,
      })
      const body = typeof res.data === 'string' ? res.data.trim() : ''
      llmsTxt = { found: res.status === 200 && body.length > 0, url: res.status === 200 && body.length > 0 ? llmsTxtUrl : null }
    } catch (err) {
      this.logger.warn(`GEO audit: llms.txt check failed for ${normalizedUrl}: ${(err as Error).message}`)
    }

    // --- 4. JSON-LD parsing (identity schema + structured-data quality) -------
    const jsonLdBlocks = extractJsonLd(staticHtml)

    let identitySchema: GeoAuditReport['identitySchema'] = null
    for (const block of jsonLdBlocks) {
      const type = block['@type']
      const isOrgOrPerson = typeMatches(type, 'Organization') || typeMatches(type, 'Person')
      const isLocalBusiness = typeMatches(type, 'LocalBusiness') || typeMatches(type, 'Business')
      if (isOrgOrPerson || isLocalBusiness) {
        const types = Array.isArray(type) ? type : [type]
        const resolvedType = types.find((t) => typeof t === 'string') as string | undefined
        identitySchema = {
          found: true,
          type: resolvedType ?? null,
          name: typeof block['name'] === 'string' ? (block['name'] as string) : null,
        }
        break
      }
    }
    if (!identitySchema) identitySchema = { found: false, type: null, name: null }

    const structuredDataIssues: { schemaType: string; missingFields: string[] }[] = []
    for (const block of jsonLdBlocks) {
      const type = block['@type']
      const articleType = typeIsAnyOf(type, ['Article', 'BlogPosting', 'NewsArticle'])
      if (articleType) {
        const missing: string[] = []
        for (const field of ['headline', 'author', 'datePublished']) {
          if (block[field] === undefined || block[field] === null || block[field] === '') missing.push(field)
        }
        if (missing.length > 0) structuredDataIssues.push({ schemaType: articleType, missingFields: missing })
        continue
      }
      const productType = typeIsAnyOf(type, ['Product'])
      if (productType) {
        const missing: string[] = []
        if (!block['name']) missing.push('name')
        const hasOffers = block['offers'] !== undefined && block['offers'] !== null
        const offersObj = (Array.isArray(block['offers']) ? block['offers'][0] : block['offers']) as
          | Record<string, unknown>
          | undefined
        const hasPrice = hasOffers && offersObj && (offersObj['price'] !== undefined || offersObj['priceCurrency'] !== undefined)
        if (!hasOffers && !hasPrice) missing.push('offers')
        const hasAvailability = hasOffers && offersObj && offersObj['availability'] !== undefined
        const hasImage = block['image'] !== undefined && block['image'] !== null
        if (!hasAvailability && !hasImage) missing.push('availability')
        if (missing.length > 0) structuredDataIssues.push({ schemaType: productType, missingFields: missing })
      }
    }

    // --- 5. E-E-A-T score -------------------------------------------------------
    const hasAuthorByline =
      /rel=["']author["']/i.test(staticHtml) ||
      /<meta[^>]+name=["']author["']/i.test(staticHtml) ||
      jsonLdBlocks.some((b) => typeMatches(b['@type'], 'Person'))
    const hasContactLink = /href=["'][^"']*(iletisim|contact)[^"']*["']/i.test(staticHtml)
    const hasAboutLink = /href=["'][^"']*(hakkimizda|about)[^"']*["']/i.test(staticHtml)
    const usesHttps = normalizedUrl.toLowerCase().startsWith('https')
    const hasSameAs = jsonLdBlocks.some((b) => Array.isArray(b['sameAs']) && (b['sameAs'] as unknown[]).length > 0)
    const pageHostname = safeHostname(normalizedUrl)
    const hasExternalLink = (() => {
      const hrefs = [...staticHtml.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)].map((m) => m[1])
      return hrefs.some((h) => {
        const host = safeHostname(h)
        return host && pageHostname && host !== pageHostname
      })
    })()

    const factors: { label: string; present: boolean; weight: number }[] = [
      { label: 'Yazar bilgisi (byline) mevcut', present: hasAuthorByline, weight: 20 },
      { label: 'İletişim sayfası bağlantısı var', present: hasContactLink, weight: 15 },
      { label: 'Hakkımızda sayfası bağlantısı var', present: hasAboutLink, weight: 15 },
      { label: 'HTTPS kullanılıyor', present: usesHttps, weight: 15 },
      { label: 'Organization/Person şeması mevcut', present: identitySchema.found, weight: 15 },
      { label: 'Şemada sameAs (sosyal medya) bağlantıları var', present: hasSameAs, weight: 10 },
      { label: 'Sayfa dışa bağlantı (dış kaynak atıfı) içeriyor', present: hasExternalLink, weight: 10 },
    ]
    const eeatScore = factors.filter((f) => f.present).reduce((sum, f) => sum + f.weight, 0)

    // --- 6. Recommendations -----------------------------------------------------
    const recommendations: PriorityRecommendation[] = []

    if (!llmsTxt.found) {
      recommendations.push({
        code: 'GEO_MISSING_LLMS_TXT',
        title: 'llms.txt dosyası eksik',
        category: 'SCHEMA' as IssueCategory,
        priority: 'LOW',
        howToFix: 'llms.txt ekleyerek AI asistanlarına sitenizin hangi içeriklerinin öncelikli olduğunu belirtin.',
      })
    }

    if (!identitySchema.found) {
      recommendations.push({
        code: 'GEO_MISSING_IDENTITY_SCHEMA',
        title: 'Kimlik şeması (Organization/Person/LocalBusiness) bulunamadı',
        category: 'SCHEMA' as IssueCategory,
        priority: 'MEDIUM',
        howToFix:
          'Sayfaya Organization, Person veya LocalBusiness türünde JSON-LD yapılandırılmış veri ekleyerek markanızın AI motorları tarafından doğru tanımlanmasını sağlayın.',
      })
    }

    if (jsRenderedPercent > 40) {
      recommendations.push({
        code: 'GEO_HIGH_JS_DEPENDENCY',
        title: 'İçerik büyük oranda JavaScript render sonrası görünüyor',
        category: 'TECHNICAL' as IssueCategory,
        priority: 'MEDIUM',
        howToFix:
          'İçeriğinizin büyük kısmı yalnızca JavaScript render sonrası görünüyor — AI motorları ve bazı arama motorları bunu kaçırabilir; sunucu tarafı render (SSR) veya statik üretim (SSG) düşünün.',
      })
    }

    for (const issue of structuredDataIssues) {
      recommendations.push({
        code: 'GEO_STRUCTURED_DATA_INCOMPLETE',
        title: `${issue.schemaType} şeması eksik alanlar içeriyor`,
        category: 'SCHEMA' as IssueCategory,
        priority: 'LOW',
        howToFix: `${issue.schemaType} yapılandırılmış verisine şu alanları ekleyin: ${issue.missingFields.join(', ')}.`,
        affectedCount: 1,
      })
    }

    if (eeatScore < 50) {
      const missingFactors = factors.filter((f) => !f.present).map((f) => f.label)
      recommendations.push({
        code: 'GEO_LOW_EEAT_SCORE',
        title: 'E-E-A-T skoru düşük',
        category: 'SCHEMA' as IssueCategory,
        priority: 'MEDIUM',
        howToFix: `E-E-A-T sinyallerinizi güçlendirin. Eksik sinyaller: ${missingFactors.join(', ')}.`,
      })
    }

    return {
      identitySchema,
      llmReadability: { renderedWordCount, staticWordCount, jsRenderedPercent, rating },
      llmsTxt,
      structuredDataIssues,
      eeat: { score: eeatScore, factors },
      recommendations,
    }
  }

  // -------------------------------------------------------------------------
  // analyzeAndPersistGeoAudit — runs analyzeGeoAudit and persists into
  // SiteAuditReport.geoJson (upsert) + SeoIssue rows for structured-data
  // findings only.
  // -------------------------------------------------------------------------
  async analyzeAndPersistGeoAudit(projectId: string, crawlJobId: string, domain: string): Promise<GeoAuditReport> {
    const report = await this.analyzeGeoAudit(domain)

    await this.prisma.siteAuditReport.upsert({
      where: { crawlJobId },
      update: { geoJson: report as unknown as object },
      create: { crawlJobId, projectId, geoJson: report as unknown as object },
    })

    for (const issue of report.structuredDataIssues) {
      try {
        await this.prisma.seoIssue.create({
          data: {
            crawlJobId,
            crawledPageId: null,
            category: 'SCHEMA',
            severity: 'NOTICE',
            code: 'STRUCTURED_DATA_INCOMPLETE',
            message: `${issue.schemaType} yapılandırılmış verisinde eksik alanlar bulundu: ${issue.missingFields.join(', ')}.`,
            recommendation: `${issue.schemaType} şemasına şu alanları ekleyin: ${issue.missingFields.join(', ')}.`,
            autoFixable: false,
          },
        })
      } catch (err) {
        this.logger.warn(`Failed to insert SeoIssue for structured data issue (${issue.schemaType}): ${(err as Error).message}`)
      }
    }

    return report
  }

  // -------------------------------------------------------------------------
  // getAiOverviewTracking — cross-references the project's tracked keywords
  // against Google AI Overview presence/citation via DataForSEO.
  // -------------------------------------------------------------------------
  async getAiOverviewTracking(projectId: string): Promise<AiOverviewTrackingEntry[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { domain: true },
    })
    const projectDomain = project?.domain ? safeHostname(project.domain.startsWith('http') ? project.domain : `https://${project.domain}`) : ''

    const keywords = await this.prisma.keyword.findMany({
      where: { projectId },
      orderBy: [{ isStarred: 'desc' }, { createdAt: 'asc' }],
      take: 10,
      select: { phrase: true },
    })

    const results: AiOverviewTrackingEntry[] = []
    for (const kw of keywords) {
      try {
        const serp = await this.dataForSeoService.getAiModeSerp(kw.phrase)
        const hasAiOverview = !!serp.ai_answer && serp.ai_answer.trim().length > 0
        const cited = (serp.cited_urls ?? []).some((u) => {
          const host = safeHostname(u)
          return !!host && !!projectDomain && (host.includes(projectDomain) || projectDomain.includes(host))
        })
        results.push({ keyword: kw.phrase, hasAiOverview, cited })
      } catch (err) {
        this.logger.warn(`AI Overview tracking failed for keyword "${kw.phrase}": ${(err as Error).message}`)
      }
    }
    return results
  }
}
