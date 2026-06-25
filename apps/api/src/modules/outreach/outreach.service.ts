import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../../prisma.service'

interface CreateCampaignDto {
  name: string
  targetUrl: string
  anchorText?: string
  topic?: string
}

@Injectable()
export class OutreachService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('outreach') private readonly queue: Queue,
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
    return this.prisma.backlink.findMany({
      where: { projectId },
      orderBy: { firstSeen: 'desc' },
      take: 100,
    })
  }

  async getBacklinkOrders(projectId: string) {
    return this.prisma.backlinkOrder.findMany({
      where: { projectId },
      include: { listing: { select: { id: true, price: true, drTier: true, publisherSite: { select: { domain: true, domainRating: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
  }
}
