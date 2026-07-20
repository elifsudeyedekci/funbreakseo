import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import * as dns from 'dns'
import * as tls from 'tls'
import * as net from 'net'
import { PriorityRecommendation } from '@funbreakseo/shared'

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

export type TechnologyCategory = 'CMS' | 'Framework' | 'Analytics' | 'CDN' | 'Payment' | 'Chat' | 'Font' | 'Other'

export interface DetectedTechnology {
  category: TechnologyCategory
  name: string
}

export interface DnsTxtResult {
  found: boolean
  record: string | null
}

interface SslResult {
  expiryDate: string | null
  valid: boolean
}

export interface TechnologyReport {
  technologies: DetectedTechnology[]
  serverIp: string | null
  nameservers: string[]
  webServer: string | null
  charset: string | null
  dmarc: DnsTxtResult
  spf: DnsTxtResult
  domainAgeYears: number | null
  sslExpiryDate: string | null
  sslValid: boolean
  recommendations: PriorityRecommendation[]
}

// ---------------------------------------------------------------------------
// Technology signature detection (hand-rolled, Wappalyzer-style, no new dep)
// ---------------------------------------------------------------------------

interface SignatureContext {
  html: string
  headers: Record<string, string>
}

interface SignatureRule {
  category: TechnologyCategory
  name: string
  test: (ctx: SignatureContext) => boolean
}

const SIGNATURES: SignatureRule[] = [
  { category: 'CMS', name: 'WordPress', test: ({ html }) => /wp-content|wp-includes/i.test(html) },
  { category: 'CMS', name: 'Shopify', test: ({ html }) => /cdn\.shopify\.com/i.test(html) },
  { category: 'Framework', name: 'Next.js', test: ({ html }) => /_next\/static/i.test(html) },
  { category: 'Framework', name: 'React', test: ({ html }) => /react-dom/i.test(html) },
  { category: 'Other', name: 'jQuery', test: ({ html }) => /jquery/i.test(html) },
  {
    category: 'Analytics',
    name: 'Google Analytics / GTM',
    test: ({ html }) => /gtag\/js|googletagmanager\.com\/gtm\.js/i.test(html),
  },
  {
    category: 'CDN',
    name: 'Cloudflare',
    test: ({ headers }) => Object.values(headers).some((v) => /cloudflare/i.test(v)),
  },
  { category: 'Analytics', name: 'Hotjar', test: ({ html }) => /static\.hotjar\.com/i.test(html) },
  { category: 'Chat', name: 'Intercom', test: ({ html }) => /intercom\.io|widget\.intercom\.io/i.test(html) },
  { category: 'Payment', name: 'Stripe', test: ({ html }) => /js\.stripe\.com/i.test(html) },
  { category: 'Payment', name: 'PayPal', test: ({ html }) => /www\.paypal\.com\/sdk/i.test(html) },
  { category: 'Framework', name: 'Tailwind CSS', test: ({ html }) => /cdn\.tailwindcss\.com/i.test(html) },
]

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class TechnologyService {
  private readonly logger = new Logger(TechnologyService.name)

  async analyze(url: string, hostname: string): Promise<TechnologyReport> {
    let html = ''
    let headers: Record<string, string> = {}

    try {
      const res = await axios.get<string>(url, {
        timeout: 6_000,
        headers: {
          'User-Agent': 'FunBreakSEO-Crawler/1.0',
          Accept: 'text/html,application/xhtml+xml',
        },
        maxRedirects: 5,
        validateStatus: () => true,
      })
      html = typeof res.data === 'string' ? res.data : ''
      headers = this.normalizeHeaders(res.headers)
    } catch (err: any) {
      this.logger.warn(`Failed to fetch ${url} for technology analysis: ${err.message}`)
    }

    const technologies = this.detectTechnologies(html, headers)
    const webServer = headers['server'] ?? null
    const charset = this.extractCharset(html, headers)

    const [serverIpResult, nameserversResult, dmarcResult, spfResult, domainAgeResult, sslResult] =
      await Promise.allSettled([
        this.resolveServerIp(hostname),
        this.resolveNameservers(hostname),
        this.resolveDmarc(hostname),
        this.resolveSpf(hostname),
        this.resolveDomainAge(hostname),
        this.resolveSsl(hostname),
      ])

    const serverIp = serverIpResult.status === 'fulfilled' ? serverIpResult.value : null
    const nameservers = nameserversResult.status === 'fulfilled' ? nameserversResult.value : []
    const dmarc: DnsTxtResult = dmarcResult.status === 'fulfilled' ? dmarcResult.value : { found: false, record: null }
    const spf: DnsTxtResult = spfResult.status === 'fulfilled' ? spfResult.value : { found: false, record: null }
    const domainAgeYears = domainAgeResult.status === 'fulfilled' ? domainAgeResult.value : null
    const ssl: SslResult = sslResult.status === 'fulfilled' ? sslResult.value : { expiryDate: null, valid: false }

    const recommendations = this.buildRecommendations(dmarc, spf, ssl)

    return {
      technologies,
      serverIp,
      nameservers,
      webServer,
      charset,
      dmarc,
      spf,
      domainAgeYears,
      sslExpiryDate: ssl.expiryDate,
      sslValid: ssl.valid,
      recommendations,
    }
  }

  // -------------------------------------------------------------------------
  // Signature detection
  // -------------------------------------------------------------------------

  private normalizeHeaders(rawHeaders: unknown): Record<string, string> {
    const out: Record<string, string> = {}
    if (!rawHeaders || typeof rawHeaders !== 'object') return out
    for (const [key, value] of Object.entries(rawHeaders as Record<string, unknown>)) {
      out[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value ?? '')
    }
    return out
  }

  private detectTechnologies(html: string, headers: Record<string, string>): DetectedTechnology[] {
    const found: DetectedTechnology[] = []
    const ctx: SignatureContext = { html, headers }

    for (const sig of SIGNATURES) {
      try {
        if (sig.test(ctx)) found.push({ category: sig.category, name: sig.name })
      } catch {
        // a single bad signature test must not break detection for the rest
      }
    }

    const generatorMatch = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']*)/i)
    if (generatorMatch && generatorMatch[1].trim()) {
      const generator = generatorMatch[1].trim()
      const alreadyDetected = found.some((f) => generator.toLowerCase().includes(f.name.toLowerCase()))
      if (!alreadyDetected) {
        found.push({ category: 'CMS', name: generator })
      }
    }

    const poweredBy = headers['x-powered-by']
    if (poweredBy) {
      found.push({ category: 'Other', name: poweredBy })
    }

    const seen = new Set<string>()
    return found.filter((f) => {
      const key = `${f.category}:${f.name}`.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private extractCharset(html: string, headers: Record<string, string>): string | null {
    const metaMatch = html.match(/<meta[^>]+charset=["']?([a-zA-Z0-9_-]+)/i)
    if (metaMatch) return metaMatch[1]

    const contentType = headers['content-type']
    if (contentType) {
      const m = contentType.match(/charset=([a-zA-Z0-9_-]+)/i)
      if (m) return m[1]
    }
    return null
  }

  // -------------------------------------------------------------------------
  // Network lookups — each individually try/caught, never throws
  // -------------------------------------------------------------------------

  private async resolveServerIp(hostname: string): Promise<string | null> {
    try {
      const addresses = await dns.promises.resolve4(hostname)
      return addresses[0] ?? null
    } catch {
      return null
    }
  }

  private async resolveNameservers(hostname: string): Promise<string[]> {
    try {
      return await dns.promises.resolveNs(hostname)
    } catch {
      return []
    }
  }

  private async resolveDmarc(hostname: string): Promise<DnsTxtResult> {
    try {
      const records = await dns.promises.resolveTxt(`_dmarc.${hostname}`)
      const joined = records.map((chunks) => chunks.join(''))
      const dmarcRecord = joined.find((r) => /v=dmarc1/i.test(r)) ?? (joined.length > 0 ? joined[0] : null)
      return dmarcRecord ? { found: true, record: dmarcRecord } : { found: false, record: null }
    } catch {
      return { found: false, record: null }
    }
  }

  private async resolveSpf(hostname: string): Promise<DnsTxtResult> {
    try {
      const records = await dns.promises.resolveTxt(hostname)
      const joined = records.map((chunks) => chunks.join(''))
      const spfRecord = joined.find((r) => /v=spf1/i.test(r))
      return spfRecord ? { found: true, record: spfRecord } : { found: false, record: null }
    } catch {
      return { found: false, record: null }
    }
  }

  /**
   * RDAP first (rdap.org bridges most gTLDs + many ccTLDs), then a legacy
   * WHOIS (port 43) fallback for .tr domains specifically — Turkey's ccTLD
   * (.tr/.com.tr/...) has NO RDAP server at all (confirmed against IANA's
   * bootstrap registry at data.iana.org/rdap/dns.json, which has no "tr"
   * entry), so rdap.org 404s for every .tr domain. Since this platform's
   * customer base is majority-Turkish, that made domain age silently
   * unavailable (rendered as "0") for most real projects.
   */
  private async resolveDomainAge(hostname: string): Promise<number | null> {
    const registrableDomain = hostname.replace(/^www\./i, '')

    const viaRdap = await this.tryRdapDomainAge(registrableDomain)
    if (viaRdap != null) return viaRdap

    if (/\.tr$/i.test(registrableDomain)) {
      return this.tryTrWhoisDomainAge(registrableDomain)
    }

    return null
  }

  private async tryRdapDomainAge(domain: string): Promise<number | null> {
    try {
      const res = await axios.get(`https://rdap.org/domain/${domain}`, {
        timeout: 8_000,
        validateStatus: () => true,
      })
      if (res.status !== 200 || !res.data) return null

      const events = (res.data as any)?.events as Array<{ eventAction?: string; eventDate?: string }> | undefined
      const registration = events?.find((e) => e.eventAction === 'registration')
      if (!registration?.eventDate) return null

      return this.yearsSince(registration.eventDate)
    } catch {
      return null
    }
  }

  /** whois.trabis.gov.tr — Turkey's official ccTLD WHOIS server (raw TCP, port 43). */
  private tryTrWhoisDomainAge(domain: string): Promise<number | null> {
    return new Promise((resolve) => {
      let settled = false
      const finish = (v: number | null) => {
        if (settled) return
        settled = true
        resolve(v)
      }

      let socket: net.Socket
      try {
        socket = net.createConnection({ host: 'whois.trabis.gov.tr', port: 43, timeout: 8_000 })
      } catch {
        finish(null)
        return
      }

      let data = ''
      socket.on('connect', () => socket.write(`${domain}\r\n`))
      socket.on('data', (chunk) => {
        data += chunk.toString()
      })
      socket.on('end', () => {
        // "Created on..............: 2019-Jul-09."
        const m = data.match(/Created on\.*:\s*([\d]{4}-[A-Za-z]{3}-\d{1,2})/i)
        if (!m) return finish(null)
        const parsed = new Date(m[1].replace(/-/g, ' '))
        if (isNaN(parsed.getTime())) return finish(null)
        finish(this.yearsSince(parsed.toISOString()))
      })
      socket.on('timeout', () => {
        socket.destroy()
        finish(null)
      })
      socket.on('error', () => finish(null))
    })
  }

  private yearsSince(dateStr: string): number | null {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    const years = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    return years >= 0 ? Math.round(years * 10) / 10 : null
  }

  private resolveSsl(hostname: string): Promise<SslResult> {
    return new Promise((resolve) => {
      let settled = false
      const finish = (result: SslResult) => {
        if (settled) return
        settled = true
        resolve(result)
      }

      try {
        const socket = tls.connect(
          {
            host: hostname,
            port: 443,
            servername: hostname,
            timeout: 6_000,
            rejectUnauthorized: false,
          },
          () => {
            try {
              const cert = socket.getPeerCertificate()
              if (cert && cert.valid_to) {
                const validTo = new Date(cert.valid_to)
                finish({
                  expiryDate: isNaN(validTo.getTime()) ? null : validTo.toISOString(),
                  valid: validTo.getTime() > Date.now(),
                })
              } else {
                finish({ expiryDate: null, valid: false })
              }
            } catch {
              finish({ expiryDate: null, valid: false })
            } finally {
              socket.end()
            }
          },
        )
        socket.on('error', () => finish({ expiryDate: null, valid: false }))
        socket.on('timeout', () => {
          socket.destroy()
          finish({ expiryDate: null, valid: false })
        })
      } catch {
        finish({ expiryDate: null, valid: false })
      }
    })
  }

  // -------------------------------------------------------------------------
  // Recommendations
  // -------------------------------------------------------------------------

  private buildRecommendations(dmarc: DnsTxtResult, spf: DnsTxtResult, ssl: SslResult): PriorityRecommendation[] {
    const recs: PriorityRecommendation[] = []

    if (!dmarc.found) {
      recs.push({
        code: 'TECHNOLOGY_MISSING_DMARC',
        title: 'No DMARC record found',
        category: 'TECHNOLOGY',
        priority: 'MEDIUM',
        howToFix:
          'Publish a DMARC TXT record at _dmarc.<yourdomain> to reduce the risk of attackers spoofing your domain in phishing emails.',
      })
    }

    if (!spf.found) {
      recs.push({
        code: 'TECHNOLOGY_MISSING_SPF',
        title: 'No SPF record found',
        category: 'TECHNOLOGY',
        priority: 'MEDIUM',
        howToFix:
          'Publish an SPF TXT record listing your authorized mail servers to help prevent email spoofing and improve deliverability.',
      })
    }

    if (!ssl.expiryDate) {
      recs.push({
        code: 'TECHNOLOGY_SSL_UNREACHABLE',
        title: 'Could not verify an SSL/TLS certificate over HTTPS',
        category: 'TECHNOLOGY',
        priority: 'CRITICAL',
        howToFix:
          'Ensure the site is reachable over HTTPS on port 443 with a valid SSL/TLS certificate installed.',
      })
    } else {
      const daysLeft = (new Date(ssl.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      if (!ssl.valid || daysLeft < 30) {
        recs.push({
          code: 'TECHNOLOGY_SSL_EXPIRING_OR_INVALID',
          title: !ssl.valid
            ? 'SSL/TLS certificate is invalid or expired'
            : `SSL/TLS certificate expires in ${Math.max(0, Math.round(daysLeft))} day(s)`,
          category: 'TECHNOLOGY',
          priority: 'CRITICAL',
          howToFix:
            'Renew the SSL/TLS certificate immediately to avoid browser security warnings and loss of visitor trust.',
        })
      }
    }

    return recs
  }
}
