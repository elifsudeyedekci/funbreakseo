import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import { PriorityRecommendation } from '@funbreakseo/shared'

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

export type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok'

export interface SocialProfile {
  platform: SocialPlatform
  url: string
  found: boolean
}

export interface OpenGraphData {
  title: string | null
  description: string | null
  image: string | null
  type: string | null
}

export interface TwitterCardData {
  type: string | null
}

export interface SocialReport {
  profiles: SocialProfile[]
  openGraph: OpenGraphData
  twitterCard: TwitterCardData
  facebookPixel: boolean
  recommendations: PriorityRecommendation[]
}

// ---------------------------------------------------------------------------
// HTML parsing helpers (regex-based, matching crawler.worker.ts's convention)
// ---------------------------------------------------------------------------

const PLATFORM_PATTERNS: Record<SocialPlatform, RegExp> = {
  facebook: /href=["'](https?:\/\/(www\.)?facebook\.com[^"'\s]*)["']/i,
  instagram: /href=["'](https?:\/\/(www\.)?instagram\.com[^"'\s]*)["']/i,
  twitter: /href=["'](https?:\/\/(www\.)?(twitter|x)\.com[^"'\s]*)["']/i,
  linkedin: /href=["'](https?:\/\/(www\.)?linkedin\.com[^"'\s]*)["']/i,
  youtube: /href=["'](https?:\/\/(www\.)?youtube\.com[^"'\s]*)["']/i,
  tiktok: /href=["'](https?:\/\/(www\.)?tiktok\.com[^"'\s]*)["']/i,
}

function extractSocialProfiles(html: string): SocialProfile[] {
  return (Object.keys(PLATFORM_PATTERNS) as SocialPlatform[]).map((platform) => {
    const m = html.match(PLATFORM_PATTERNS[platform])
    return {
      platform,
      url: m ? m[1].trim() : '',
      found: !!m,
    }
  })
}

function extractMetaProperty(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m =
    html.match(new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)[^>]+property=["']${escaped}["']`, 'i'))
  return m ? m[1].trim() : null
}

function extractMetaName(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m =
    html.match(new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)[^>]+name=["']${escaped}["']`, 'i'))
  return m ? m[1].trim() : null
}

function detectFacebookPixel(html: string): boolean {
  return /fbq\(/i.test(html) || /connect\.facebook\.net/i.test(html)
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name)

  async analyze(url: string): Promise<SocialReport> {
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
      this.logger.warn(`Failed to fetch ${url} for social analysis: ${err.message}`)
    }

    const profiles = extractSocialProfiles(html)
    const openGraph: OpenGraphData = {
      title: extractMetaProperty(html, 'og:title'),
      description: extractMetaProperty(html, 'og:description'),
      image: extractMetaProperty(html, 'og:image'),
      type: extractMetaProperty(html, 'og:type'),
    }
    const twitterCard: TwitterCardData = { type: extractMetaName(html, 'twitter:card') }
    const facebookPixel = detectFacebookPixel(html)

    const recommendations = this.buildRecommendations(profiles, openGraph, twitterCard)

    return { profiles, openGraph, twitterCard, facebookPixel, recommendations }
  }

  private buildRecommendations(
    profiles: SocialProfile[],
    openGraph: OpenGraphData,
    twitterCard: TwitterCardData,
  ): PriorityRecommendation[] {
    const recs: PriorityRecommendation[] = []

    const hasAnyOg = !!(openGraph.title || openGraph.description || openGraph.image || openGraph.type)
    if (!hasAnyOg) {
      recs.push({
        code: 'SOCIAL_MISSING_OG_TAGS',
        title: 'Missing Open Graph tags',
        category: 'SOCIAL',
        priority: 'MEDIUM',
        howToFix:
          'Add og:title, og:description and og:image meta tags so shared links render rich previews on Facebook, LinkedIn and other platforms.',
      })
    }

    if (!twitterCard.type) {
      recs.push({
        code: 'SOCIAL_MISSING_TWITTER_CARD',
        title: 'Missing Twitter Card tag',
        category: 'SOCIAL',
        priority: 'LOW',
        howToFix:
          'Add a <meta name="twitter:card" content="summary_large_image"> tag so links render a rich preview when shared on X/Twitter.',
      })
    }

    const foundProfileCount = profiles.filter((p) => p.found).length
    if (foundProfileCount === 0) {
      recs.push({
        code: 'SOCIAL_NO_PROFILES_FOUND',
        title: 'No social media profile links found',
        category: 'SOCIAL',
        priority: 'LOW',
        howToFix:
          'Link your Facebook, Instagram, LinkedIn, X/Twitter, YouTube or TikTok profiles from the site (e.g. in the footer or header) to build trust and social signals.',
      })
    }

    return recs
  }
}
