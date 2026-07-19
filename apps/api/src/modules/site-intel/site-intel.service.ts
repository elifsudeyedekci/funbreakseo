import { Injectable, Logger } from '@nestjs/common'
import { IssueSeverity } from '@prisma/client'
import { PriorityRecommendation } from '@funbreakseo/shared'
import { PrismaService } from '../../prisma.service'
import { UsabilityService, UsabilityReport, ScreenshotSet } from './usability.service'
import { SocialService, SocialReport } from './social.service'
import { TechnologyService, TechnologyReport } from './technology.service'
import { LocalSeoService, LocalSeoReport } from './local-seo.service'

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

export interface SiteIntelReport {
  usability: UsabilityReport
  social: SocialReport
  technology: TechnologyReport
  localSeo: LocalSeoReport
  screenshots: ScreenshotSet
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeUrl(domain: string): string {
  const trimmed = domain.trim().replace(/\/+$/, '')
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
}

function mapPriority(priority: 'CRITICAL' | 'MEDIUM' | 'LOW'): IssueSeverity {
  switch (priority) {
    case 'CRITICAL':
      return IssueSeverity.CRITICAL
    case 'MEDIUM':
      return IssueSeverity.WARNING
    case 'LOW':
    default:
      return IssueSeverity.NOTICE
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class SiteIntelService {
  private readonly logger = new Logger(SiteIntelService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly usabilityService: UsabilityService,
    private readonly socialService: SocialService,
    private readonly technologyService: TechnologyService,
    private readonly localSeoService: LocalSeoService,
  ) {}

  /** Pure analysis — works for ANY domain, no DB writes. Used by competitor-comparison too. */
  async analyze(domain: string): Promise<SiteIntelReport> {
    const url = normalizeUrl(domain)
    let hostname = domain
    try {
      hostname = new URL(url).hostname
    } catch {
      // keep raw domain string as a fallback for DNS lookups
    }

    const [usabilityResult, social, technology, localSeo] = await Promise.all([
      this.usabilityService.analyze(url).catch((err: any) => {
        this.logger.warn(`Usability analysis failed for ${url}: ${err.message}`)
        return this.emptyUsabilityResult()
      }),
      this.socialService.analyze(url).catch((err: any) => {
        this.logger.warn(`Social analysis failed for ${url}: ${err.message}`)
        return this.emptySocialReport()
      }),
      this.technologyService.analyze(url, hostname).catch((err: any) => {
        this.logger.warn(`Technology analysis failed for ${url}: ${err.message}`)
        return this.emptyTechnologyReport()
      }),
      this.localSeoService.analyze(url).catch((err: any) => {
        this.logger.warn(`Local SEO analysis failed for ${url}: ${err.message}`)
        return this.emptyLocalSeoReport()
      }),
    ])

    return {
      usability: usabilityResult.usability,
      social,
      technology,
      localSeo,
      screenshots: usabilityResult.screenshots,
    }
  }

  async analyzeAndPersist(projectId: string, crawlJobId: string, domain: string): Promise<SiteIntelReport> {
    const report = await this.analyze(domain)

    try {
      await this.prisma.siteAuditReport.upsert({
        where: { crawlJobId },
        update: {
          usabilityJson: report.usability as any,
          socialJson: report.social as any,
          technologyJson: report.technology as any,
          localSeoJson: report.localSeo as any,
          screenshotDesktopUrl: report.screenshots.desktop,
          screenshotMobileUrl: report.screenshots.mobile,
          screenshotTabletUrl: report.screenshots.tablet,
        },
        create: {
          crawlJobId,
          projectId,
          usabilityJson: report.usability as any,
          socialJson: report.social as any,
          technologyJson: report.technology as any,
          localSeoJson: report.localSeo as any,
          screenshotDesktopUrl: report.screenshots.desktop,
          screenshotMobileUrl: report.screenshots.mobile,
          screenshotTabletUrl: report.screenshots.tablet,
        },
      })
    } catch (err: any) {
      this.logger.error(`Failed to persist SiteAuditReport for crawlJob ${crawlJobId}: ${err.message}`, err.stack)
      throw err
    }

    const allRecommendations: PriorityRecommendation[] = [
      ...report.usability.recommendations,
      ...report.social.recommendations,
      ...report.technology.recommendations,
      ...report.localSeo.recommendations,
    ]

    if (allRecommendations.length > 0) {
      try {
        await this.prisma.seoIssue.createMany({
          data: allRecommendations.map((rec) => ({
            crawlJobId,
            crawledPageId: null,
            category: rec.category as any,
            severity: mapPriority(rec.priority),
            code: rec.code,
            message: rec.title,
            recommendation: rec.howToFix,
            autoFixable: false,
          })),
        })
      } catch (err: any) {
        this.logger.warn(`Failed to persist site-intel SeoIssue rows for crawlJob ${crawlJobId}: ${err.message}`)
      }
    }

    return report
  }

  // -------------------------------------------------------------------------
  // Fallback empty reports — used when a sub-service unexpectedly rejects
  // -------------------------------------------------------------------------

  private emptyUsabilityResult(): { usability: UsabilityReport; screenshots: ScreenshotSet } {
    return {
      usability: {
        hasViewportMeta: false,
        smallFontCount: 0,
        smallTouchTargetCount: 0,
        hasFlashOrIframe: false,
        hasFavicon: false,
        plainTextEmailExposed: false,
        recommendations: [],
      },
      screenshots: { desktop: null, mobile: null, tablet: null },
    }
  }

  private emptySocialReport(): SocialReport {
    return {
      profiles: [],
      openGraph: { title: null, description: null, image: null, type: null },
      twitterCard: { type: null },
      facebookPixel: false,
      recommendations: [],
    }
  }

  private emptyTechnologyReport(): TechnologyReport {
    return {
      technologies: [],
      serverIp: null,
      nameservers: [],
      webServer: null,
      charset: null,
      dmarc: { found: false, record: null },
      spf: { found: false, record: null },
      domainAgeYears: null,
      sslExpiryDate: null,
      sslValid: false,
      recommendations: [],
    }
  }

  private emptyLocalSeoReport(): LocalSeoReport {
    return {
      found: false,
      schemaType: null,
      name: null,
      address: null,
      telephone: null,
      napConsistency: { consistent: null, pageTelephone: null },
      recommendations: [],
    }
  }
}
