import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../../prisma.service'
import { DataForSeoService } from '../dataforseo/dataforseo.service'

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
      select: { domain: true },
    })
    if (!project) return { synced: 0, backlinks: [], total: 0 }

    const domain = project.domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .split('/')[0]

    this.logger.log(`Syncing backlinks for domain: ${domain}`)

    try {
      const profile = await this.dfs.getBacklinks(domain)
      this.logger.log(`DataForSEO returned ${profile.sample.length} backlinks, total: ${profile.backlinks_num}`)

      const now = new Date()

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
      const rows = profile.sample
        .filter((item) => item.url_from)
        .map((item) => {
          let sourceDomain = item.domain_from
          if (!sourceDomain) {
            try { sourceDomain = new URL(item.url_from).hostname } catch { sourceDomain = item.url_from }
          }
          return {
            projectId,
            sourceDomain,
            sourceUrl: item.url_from,
            targetUrl: item.url_to || `https://${domain}`,
            anchorText: item.anchor ?? null,
            domainRating: item.rank ?? null,
            isDofollow: item.is_dofollow,
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
        `Backlink sync ${domain}: API ${profile.sample.length} geldi → deleteMany: ${deletedCount} silindi (${delOk ? 'OK' : 'FAIL'}), createMany: ${synced} yazıldı (${createOk ? 'OK' : 'FALLBACK'}), DB COUNT: ${dbCount} (summary total: ${profile.backlinks_num})`,
      )
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
}
