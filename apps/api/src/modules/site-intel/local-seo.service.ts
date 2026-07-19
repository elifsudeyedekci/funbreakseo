import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import { PriorityRecommendation } from '@funbreakseo/shared'

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

export interface NapConsistency {
  consistent: boolean | null
  pageTelephone: string | null
}

export interface LocalSeoReport {
  found: boolean
  schemaType: string | null
  name: string | null
  address: string | null
  telephone: string | null
  napConsistency: NapConsistency
  recommendations: PriorityRecommendation[]
}

// ---------------------------------------------------------------------------
// JSON-LD parsing helpers
// ---------------------------------------------------------------------------

// Known Schema.org LocalBusiness subtypes (non-exhaustive) — anything whose
// @type also merely *contains* "Business" is treated as a hit too.
const LOCAL_BUSINESS_SUBTYPES = new Set([
  'localbusiness',
  'restaurant',
  'store',
  'automotivebusiness',
  'professionalservice',
  'homeandconstructionbusiness',
  'medicalbusiness',
  'legalservice',
  'financialservice',
  'foodestablishment',
  'lodgingbusiness',
  'entertainmentbusiness',
  'sportsactivitylocation',
  'organization',
])

function isLocalBusinessType(type: string): boolean {
  const normalized = type.toLowerCase()
  if (normalized.includes('business')) return true
  return LOCAL_BUSINESS_SUBTYPES.has(normalized)
}

function flattenAddress(address: unknown): string | null {
  if (!address) return null
  if (typeof address === 'string') return address
  if (typeof address === 'object') {
    const a = address as Record<string, unknown>
    const parts = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry].filter(
      (p): p is string => typeof p === 'string' && p.trim().length > 0,
    )
    return parts.length > 0 ? parts.join(', ') : null
  }
  return null
}

function extractJsonLdBlocks(html: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = []
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null

  while ((m = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim())
      if (Array.isArray(parsed)) {
        blocks.push(...parsed)
      } else if (parsed && Array.isArray((parsed as any)['@graph'])) {
        blocks.push(...(parsed as any)['@graph'])
      } else if (parsed && typeof parsed === 'object') {
        blocks.push(parsed)
      }
    } catch {
      // malformed JSON-LD is common in the wild — skip silently
    }
  }

  return blocks
}

function findLocalBusinessEntity(
  blocks: Record<string, unknown>[],
): { type: string; entity: Record<string, unknown> } | null {
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue
    const rawType = block['@type']
    const types: string[] = Array.isArray(rawType) ? rawType : rawType ? [rawType as string] : []
    for (const t of types) {
      if (typeof t === 'string' && isLocalBusinessType(t)) {
        return { type: t, entity: block }
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class LocalSeoService {
  private readonly logger = new Logger(LocalSeoService.name)

  async analyze(url: string): Promise<LocalSeoReport> {
    let html = ''
    try {
      const res = await axios.get<string>(url, {
        timeout: 5_000,
        headers: {
          'User-Agent': 'FunBreakSEO-Crawler/1.0',
          Accept: 'text/html,application/xhtml+xml',
        },
        maxRedirects: 5,
        validateStatus: () => true,
      })
      html = typeof res.data === 'string' ? res.data : ''
    } catch (err: any) {
      this.logger.warn(`Failed to fetch ${url} for local SEO analysis: ${err.message}`)
    }

    const blocks = extractJsonLdBlocks(html)
    const match = findLocalBusinessEntity(blocks)

    const name = typeof match?.entity?.name === 'string' ? (match.entity.name as string) : null
    const address = match ? flattenAddress(match.entity.address) : null
    const telephone = typeof match?.entity?.telephone === 'string' ? (match.entity.telephone as string) : null

    const napConsistency = this.checkNapConsistency(html, telephone)

    const recommendations: PriorityRecommendation[] = []
    if (!match) {
      recommendations.push({
        code: 'LOCAL_SEO_MISSING_SCHEMA',
        title: 'No LocalBusiness or Organization structured data found',
        category: 'LOCAL_SEO',
        priority: 'MEDIUM',
        howToFix: 'Add LocalBusiness structured data so search engines and AI assistants can verify your business identity',
      })
    }
    if (napConsistency.consistent === false) {
      recommendations.push({
        code: 'LOCAL_SEO_NAP_INCONSISTENT',
        title: 'Phone number on the page does not match the structured data telephone field',
        category: 'LOCAL_SEO',
        priority: 'MEDIUM',
        howToFix:
          'Ensure the Name, Address and Phone (NAP) shown on the page exactly match the values in your LocalBusiness structured data and business listings.',
      })
    }

    return {
      found: !!match,
      schemaType: match?.type ?? null,
      name,
      address,
      telephone,
      napConsistency,
      recommendations,
    }
  }

  private checkNapConsistency(html: string, schemaTelephone: string | null): NapConsistency {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const phoneMatch = text.match(/(\+?\d[\d\s().-]{7,}\d)/)
    const pageTelephone = phoneMatch ? phoneMatch[1].trim() : null

    if (!schemaTelephone || !pageTelephone) {
      return { consistent: null, pageTelephone }
    }

    const digitsOnly = (s: string) => s.replace(/\D/g, '')
    const schemaDigits = digitsOnly(schemaTelephone)
    const pageDigits = digitsOnly(pageTelephone)
    const consistent = schemaDigits.length > 0 && (pageDigits.includes(schemaDigits) || schemaDigits.includes(pageDigits))

    return { consistent, pageTelephone }
  }
}
