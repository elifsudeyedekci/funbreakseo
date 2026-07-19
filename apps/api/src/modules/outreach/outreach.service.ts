import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../../prisma.service'
import { DataForSeoService } from '../dataforseo/dataforseo.service'
import { PlanLimitService } from '../plan-limit/plan-limit.service'

interface CreateCampaignDto {
  name: string
  targetUrl: string
  anchorText?: string
  topic?: string
}

@Injectable()
export class OutreachService {
  private readonly logger = new Logger(OutreachService.name)

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('outreach') private readonly queue: Queue,
    private readonly dfs: DataForSeoService,
    private readonly planLimit: PlanLimitService,
  ) {}

  async createCampaign(
    projectId: string,
    dto: CreateCampaignDto,
    userId: string,
  ) {
    const campaign = await this.prisma.outreachCampaign.create({
      data: {
        projectId,
        name: dto.name,
        targetUrl: dto.targetUrl,
        anchorText: dto.anchorText ?? null,
        topic: dto.topic ?? null,
        status: 'DRAFT',
        createdByUserId: userId,
      },
    })

    await this.queue.add('find-prospects', { campaignId: campaign.id })

    return campaign
  }

  async startCampaign(campaignId: string) {
    const campaign = await this.prisma.outreachCampaign.update({
      where: { id: campaignId },
      data: { status: 'RUNNING' },
    })

    await this.queue.add('send-emails', { campaignId })

    return campaign
  }

  async generateEmails(campaignId: string) {
    await this.queue.add('generate-emails', { campaignId })
    return { queued: true }
  }

  async getCampaign(campaignId: string) {
    const campaign = await this.prisma.outreachCampaign.findUnique({
      where: { id: campaignId },
      include: {
        prospects: {
          include: {
            emails: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { prospects: true },
        },
      },
    })

    if (!campaign) return null

    const prospects = campaign.prospects

    const found = prospects.length
    const contacted = prospects.filter((p) =>
      ['CONTACTED', 'REPLIED_POSITIVE', 'REPLIED_NEGATIVE', 'WON', 'LOST', 'BOUNCED'].includes(
        p.status,
      ),
    ).length
    const replied = prospects.filter((p) =>
      ['REPLIED_POSITIVE', 'REPLIED_NEGATIVE'].includes(p.status),
    ).length
    const won = prospects.filter((p) => p.status === 'WON').length

    return {
      ...campaign,
      funnel: { found, contacted, replied, won },
    }
  }

  async getWonLinks(projectId: string) {
    return this.prisma.prospect.findMany({
      where: {
        status: 'WON',
        campaign: { projectId },
      },
      include: {
        campaign: {
          select: { id: true, name: true, targetUrl: true },
        },
        emails: {
          where: { status: 'REPLIED' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async listCampaigns(projectId: string) {
    return this.prisma.outreachCampaign.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { prospects: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getBacklinks(projectId: string) {
    const items = await this.prisma.backlink.findMany({
      where: { projectId },
      orderBy: { domainRating: 'desc' },
      take: 1000,
    })

    // Persistent summary derived from stored backlinks so the cards survive
    // page reloads (previously only the transient sync response had them).
    const referringDomains = new Set(items.map((b) => b.sourceDomain)).size
    const dofollow = items.filter((b) => b.isDofollow).length
    const ratings = items.map((b) => b.domainRating ?? 0).filter((r) => r > 0)
    const avgDR = ratings.length
      ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
      : 0

    return {
      summary: {
        total: items.length,
        referringDomains,
        dofollow,
        nofollow: items.length - dofollow,
        avgDR,
      },
      items,
    }
  }

  async syncBacklinks(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { domain: true, organizationId: true },
    })
    if (!project) return { synced: 0, backlinks: [], total: 0 }

    // Plan-limit gate — must run BEFORE any DataForSEO call. Throws
    // ForbiddenException which is intentionally NOT caught here: it should
    // propagate straight to NestJS's exception filter (→ HTTP 403).
    await this.planLimit.assertFeatureWithinLimit(project.organizationId, 'BACKLINK_SYNC')

    const domain = project.domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .split('/')[0]

    this.logger.log(`Syncing backlinks for domain: ${domain}`)

    try {
      // Snapshot the CURRENT set of source URLs before we replace anything —
      // needed to compute gained/lost for the BacklinkHistory velocity row.
      const existing = await this.prisma.backlink.findMany({
        where: { projectId },
        select: { sourceUrl: true },
      })
      const oldUrls = new Set(existing.map((b) => b.sourceUrl))

      const profile = await this.dfs.getBacklinks(domain)
      this.logger.log(`DataForSEO returned ${profile.sample.length} backlinks, total: ${profile.backlinks_num}`)

      const now = new Date()

      const fetchedItems = profile.sample.filter((item) => item.url_from)
      const newUrls = new Set(fetchedItems.map((item) => item.url_from))
      const gained = new Set([...newUrls].filter((u) => !oldUrls.has(u)))
      const lost = new Set([...oldUrls].filter((u) => !newUrls.has(u)))

      // Replace-all: clear THIS project's backlinks then insert the fresh set.
      let deletedCount = 0
      let delOk = true
      try {
        const del = await this.prisma.backlink.deleteMany({ where: { projectId } })
        deletedCount = del.count
      } catch (e) {
        delOk = false
        this.logger.error(`Backlink deleteMany FAILED for ${domain}: ${(e as Error).message}`)
      }

      // Build rows for EVERY backlink the API returned. Do NOT de-dupe by
      // url_from — a single source page can legitimately link multiple times
      // (different anchors), and as_is counts each. De-duping collapsed 27 → 13.
      const rows = fetchedItems.map((item) => {
        let sourceDomain = item.domain_from
        if (!sourceDomain) {
          try { sourceDomain = new URL(item.url_from).hostname } catch { sourceDomain = item.url_from }
        }
        // isEdu/isGov are derived client-side from the real sourceDomain TLD
        // (DataForSEO doesn't flag these directly on this endpoint) — this is
        // a real derivation, not fabricated data.
        const domainLower = (sourceDomain || '').toLowerCase()
        const isEdu = /\.edu(\.[a-z]{2,3})?$/.test(domainLower)
        const isGov = /\.gov(\.[a-z]{2,3})?$/.test(domainLower)
        return {
          projectId,
          sourceDomain,
          sourceUrl: item.url_from,
          sourceTitle: item.title || null,
          targetUrl: item.url_to || `https://${domain}`,
          anchorText: item.anchor ?? null,
          domainRating: item.rank ?? null,
          pageRating: item.page_rating ?? null,
          isDofollow: item.is_dofollow,
          isEdu,
          isGov,
          // country/ipAddress/subnet: DataForSEO's /backlinks/backlinks/live
          // does not return these per-item, so they're left null rather than
          // guessed. toxicScore is populated when backlink_spam_score exists.
          toxicScore: item.toxic_score ?? null,
          firstSeen: now,
          lastSeen: now,
          status: 'ACTIVE' as const,
        }
      })

      let synced = 0
      let createOk = true
      try {
        const res = await this.prisma.backlink.createMany({ data: rows })
        synced = res.count
      } catch (e) {
        createOk = false
        this.logger.error(`Backlink createMany FAILED for ${domain}: ${(e as Error).message}`)
        // Fallback: insert one-by-one so a single bad row doesn't lose all 27.
        for (const row of rows) {
          try { await this.prisma.backlink.create({ data: row }); synced++ } catch (err) {
            this.logger.warn(`backlink row failed ${row.sourceUrl}: ${(err as Error).message}`)
          }
        }
      }

      const dbCount = await this.prisma.backlink.count({ where: { projectId } })
      this.logger.log(
        `Backlink sync ${domain}: API ${profile.sample.length} geldi → deleteMany: ${deletedCount} silindi (${delOk ? 'OK' : 'FAIL'}), createMany: ${synced} yazıldı (${createOk ? 'OK' : 'FALLBACK'}), DB COUNT: ${dbCount} (summary total: ${profile.backlinks_num}), gained=${gained.size} lost=${lost.size}`,
      )

      // Upsert today's BacklinkHistory snapshot for link-velocity tracking.
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        await this.prisma.backlinkHistory.upsert({
          where: { projectId_date: { projectId, date: today } },
          update: {
            totalBacklinks: profile.backlinks_num,
            referringDomains: profile.referring_domains,
            newBacklinks: gained.size,
            lostBacklinks: lost.size,
          },
          create: {
            projectId,
            date: today,
            totalBacklinks: profile.backlinks_num,
            referringDomains: profile.referring_domains,
            newBacklinks: gained.size,
            lostBacklinks: lost.size,
          },
        })
      } catch (e) {
        this.logger.warn(`BacklinkHistory upsert failed for ${projectId}: ${(e as Error).message}`)
      }

      // Record plan usage only once the sync has actually completed.
      try {
        await this.planLimit.recordFeatureUsage(project.organizationId, 'BACKLINK_SYNC', projectId)
      } catch (e) {
        this.logger.warn(`recordFeatureUsage failed for ${projectId}: ${(e as Error).message}`)
      }

      const returnedBacklinks = await this.prisma.backlink.findMany({ where: { projectId }, orderBy: { domainRating: 'desc' } })
      return {
        synced,
        total: profile.backlinks_num,
        referringDomains: profile.referring_domains,
        referringMainDomains: profile.referring_main_domains,
        spamScore: profile.spam_score,
        domainRank: profile.domain_rank,
        backlinks: returnedBacklinks,
        domain,
        newBacklinks: gained.size,
        lostBacklinks: lost.size,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('SUBSCRIPTION_REQUIRED')) {
        this.logger.warn(`Backlinks subscription not active for ${domain}`)
        return {
          synced: 0,
          total: 0,
          backlinks: [],
          domain,
          error: 'SUBSCRIPTION_REQUIRED',
          message: 'Backlink verisi için DataForSEO backlinks aboneliği gerekli',
        }
      }
      this.logger.error('DataForSEO backlinks sync failed', err)
      return { synced: 0, error: 'DataForSEO fetch failed', backlinks: [], total: 0, domain }
    }
  }

  async getBacklinkOrders(projectId: string) {
    return this.prisma.backlinkOrder.findMany({
      where: { projectId },
      include: { listing: { select: { id: true, price: true, drTier: true, publisherSite: { select: { domain: true, domainRating: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ─── Backlink analysis (Ahrefs/Semrush-grade views over stored data) ──────

  /**
   * Domain/page "strength" gauges + headline counters, all derived from the
   * already-synced Backlink rows (no extra DataForSEO calls).
   */
  async getBacklinkGauges(projectId: string) {
    const [project, backlinks] = await Promise.all([
      this.prisma.project.findUnique({ where: { id: projectId }, select: { domain: true } }),
      this.prisma.backlink.findMany({ where: { projectId } }),
    ])

    const drValues = backlinks
      .map((b) => b.domainRating)
      .filter((v): v is number => typeof v === 'number' && v > 0)
    const domainStrength = drValues.length
      ? Math.min(100, Math.round(drValues.reduce((a, b) => a + b, 0) / drValues.length))
      : 0

    const homepageHosts = new Set<string>()
    if (project?.domain) {
      const clean = project.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').split('/')[0]
      homepageHosts.add(clean)
      homepageHosts.add(`www.${clean}`)
    }

    const pageRatings = backlinks
      .filter((b) => typeof b.pageRating === 'number' && (b.pageRating ?? 0) > 0)
      .filter((b) => {
        try {
          const u = new URL(b.targetUrl)
          const isHomepage = u.pathname === '/' || u.pathname === ''
          return isHomepage && (homepageHosts.size === 0 || homepageHosts.has(u.hostname))
        } catch {
          return false
        }
      })
      .map((b) => b.pageRating as number)

    const pageStrength = pageRatings.length
      ? Math.min(100, Math.round(pageRatings.reduce((a, b) => a + b, 0) / pageRatings.length))
      : domainStrength

    const total = backlinks.length
    const referringDomains = new Set(backlinks.map((b) => b.sourceDomain)).size
    const dofollow = backlinks.filter((b) => b.isDofollow).length
    const nofollow = total - dofollow
    const edu = backlinks.filter((b) => b.isEdu).length
    const gov = backlinks.filter((b) => b.isGov).length
    const ipCount = new Set(backlinks.filter((b) => b.ipAddress).map((b) => b.ipAddress)).size
    const subnetCount = new Set(backlinks.filter((b) => b.subnet).map((b) => b.subnet)).size

    return {
      domainStrength,
      pageStrength,
      counters: { total, referringDomains, dofollow, nofollow, edu, gov, ipCount, subnetCount },
    }
  }

  async getTopBacklinks(projectId: string, limit = 50) {
    const items = await this.prisma.backlink.findMany({
      where: { projectId },
      orderBy: { domainRating: 'desc' },
      take: limit,
    })
    return items.map((b) => ({
      domainRating: b.domainRating,
      sourceUrl: b.sourceUrl,
      sourceTitle: b.sourceTitle,
      anchorText: b.anchorText,
      isDofollow: b.isDofollow,
      sourceDomain: b.sourceDomain,
    }))
  }

  async getTopLinkedPages(projectId: string, limit = 20) {
    const grouped = await this.prisma.backlink.groupBy({
      by: ['targetUrl'],
      where: { projectId },
      _count: { targetUrl: true },
      orderBy: { _count: { targetUrl: 'desc' } },
      take: limit,
    })
    return grouped.map((g) => ({ url: g.targetUrl, backlinkCount: g._count.targetUrl }))
  }

  async getTopAnchors(projectId: string, limit = 20) {
    const grouped = await this.prisma.backlink.groupBy({
      by: ['anchorText'],
      where: { projectId, anchorText: { not: null } },
      _count: { anchorText: true },
      orderBy: { _count: { anchorText: 'desc' } },
      take: limit,
    })
    return grouped
      .filter((g) => g.anchorText && g.anchorText.trim().length > 0)
      .map((g) => ({ anchor: g.anchorText as string, count: g._count.anchorText }))
  }

  async getBacklinkGeography(projectId: string) {
    const backlinks = await this.prisma.backlink.findMany({
      where: { projectId },
      select: { sourceDomain: true, country: true },
    })

    const tldCounts = new Map<string, number>()
    for (const b of backlinks) {
      const parts = (b.sourceDomain || '').split('.')
      if (parts.length < 2) continue
      const tld = parts[parts.length - 1]
      if (!tld) continue
      tldCounts.set(tld, (tldCounts.get(tld) ?? 0) + 1)
    }
    const byTld = [...tldCounts.entries()]
      .map(([tld, count]) => ({ tld, count }))
      .sort((a, b) => b.count - a.count)

    const countryCounts = new Map<string, number>()
    for (const b of backlinks) {
      if (b.country) countryCounts.set(b.country, (countryCounts.get(b.country) ?? 0) + 1)
    }
    // country isn't populated by the current DataForSEO endpoint for any row
    // — byCountry stays [] rather than fabricating geography.
    const byCountry = [...countryCounts.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)

    return { byTld, byCountry }
  }

  /**
   * Internal vs external link split for the project's homepage/site. Known
   * gap: CrawledPage does not currently store internal/external link counts
   * (only SeoIssue flags), and this module must not touch crawler.worker.ts
   * or the CrawledPage schema — so this returns nulls with an explanatory
   * note rather than guessing.
   */
  async getInternalExternalLinkSplit(projectId: string) {
    const fallback = { internalLinks: null as number | null, externalDofollow: null as number | null, externalNofollow: null as number | null, note: 'requires a crawl' }
    try {
      const crawlJob = await this.prisma.crawlJob.findFirst({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      })
      if (!crawlJob) return fallback
      // CrawledPage rows exist for this job, but link-count columns don't —
      // nothing further to derive without schema changes we're not allowed
      // to make here.
      return fallback
    } catch (e) {
      this.logger.warn(`getInternalExternalLinkSplit failed for ${projectId}: ${(e as Error).message}`)
      return fallback
    }
  }

  async getToxicBacklinks(projectId: string, threshold = 30) {
    const hasToxicScores = await this.prisma.backlink.count({
      where: { projectId, toxicScore: { not: null } },
    })

    const items = hasToxicScores > 0
      ? await this.prisma.backlink.findMany({
          where: { projectId, toxicScore: { gte: threshold } },
          orderBy: { toxicScore: 'desc' },
        })
      : await this.prisma.backlink.findMany({
          where: { projectId, domainRating: { not: null, lt: 10 } },
          orderBy: { domainRating: 'asc' },
        })

    return items.map((b) => ({ ...b, disavowRecommended: true }))
  }

  async getLinkVelocity(projectId: string, months = 12) {
    return this.prisma.backlinkHistory.findMany({
      where: { projectId },
      orderBy: { date: 'asc' },
      take: months,
    })
  }
}
