import { Injectable, Logger } from '@nestjs/common'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { InjectQueue } from '@nestjs/bullmq'
import { Job, Queue } from 'bullmq'
import axios from 'axios'
import { PrismaService } from '../../prisma.service'

@Injectable()
@Processor('market')
export class MarketWorker extends WorkerHost {
  private readonly logger = new Logger(MarketWorker.name)

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('market') private readonly queue: Queue,
  ) {
    super()
  }

  async process(job: Job<{ orderId: string }>): Promise<void> {
    switch (job.name) {
      case 'verify-backlink':
        return this.verifyBacklink(job.data.orderId)
      default:
        this.logger.warn(`Unknown job name: ${job.name}`)
    }
  }

  private async verifyBacklink(orderId: string): Promise<void> {
    const order = await this.prisma.backlinkOrder.findUnique({
      where: { id: orderId },
      include: {
        listing: {
          include: { publisherSite: true },
        },
      },
    })

    if (!order || order.status === 'COMPLETED' || order.status === 'REFUNDED') return

    const attempt =
      (await this.prisma.backlinkVerification.count({ where: { orderId } })) + 1

    let found = false
    let isDofollow = false
    let anchorMatched = false
    let httpStatus = 0

    try {
      const targetUrl =
        order.publishedUrl ??
        `https://${(order as any).listing.publisherSite.domain}`

      const response = await axios.get(targetUrl, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FunBreakSEOBot/1.0)' },
        maxRedirects: 5,
      })

      httpStatus = response.status
      const html = response.data as string

      // Search for the target URL in the HTML
      const targetDomain = new URL(order.targetUrl).hostname
      const escapedDomain = targetDomain.replace(/\./g, '\\.')
      const linkPattern = new RegExp(
        `href=["']([^"']*${escapedDomain}[^"']*)["']`,
        'gi',
      )
      const linkMatches = html.match(linkPattern) ?? []
      found = linkMatches.length > 0

      if (found) {
        // Check dofollow (absence of rel="nofollow")
        const linkContextPattern = new RegExp(
          `<a[^>]*${escapedDomain}[^>]*>([^<]*)<\\/a>`,
          'gi',
        )
        const linkContext = html.match(linkContextPattern) ?? []
        isDofollow =
          linkContext.length > 0 && !linkContext[0].includes('nofollow')

        // Check anchor text
        if (order.anchorText && linkContext.length > 0) {
          anchorMatched = linkContext[0]
            .toLowerCase()
            .includes(order.anchorText.toLowerCase())
        } else {
          anchorMatched = true // No anchor requirement
        }
      }
    } catch (err) {
      this.logger.warn(
        `Verification fetch failed for order ${orderId}: ${err.message}`,
      )
      httpStatus = 0
    }

    // Persist verification record
    await this.prisma.backlinkVerification.create({
      data: {
        orderId,
        attempt,
        found,
        httpStatus,
        isDofollow,
        anchorMatched,
      },
    })

    if (found && isDofollow && anchorMatched) {
      // VERIFIED → COMPLETED
      await this.prisma.$transaction(async (tx) => {
        await tx.backlinkOrder.update({
          where: { id: orderId },
          data: { status: 'COMPLETED', verifiedAt: new Date() },
        })

        const org = await tx.organization.findUnique({
          where: { id: order.organizationId },
        })

        // Record the escrow release (balance unchanged; funds stay with platform)
        await tx.walletTransaction.create({
          data: {
            organizationId: order.organizationId,
            type: 'ESCROW_RELEASE',
            amount: order.price,
            balanceAfter: Number(org!.walletBalance),
            refType: 'BacklinkOrder',
            refId: orderId,
            description: `Link verified and completed for order ${orderId}`,
          },
        })
      })

      this.logger.log(`Order ${orderId} verified and completed`)
    } else if (attempt >= 3) {
      // After 3 failed attempts, flag for review
      this.logger.warn(
        `Order ${orderId} failed verification after ${attempt} attempts — manual review required`,
      )
    } else {
      // Retry in 3 days
      await this.queue.add(
        'verify-backlink',
        { orderId },
        { delay: 3 * 24 * 60 * 60 * 1000 },
      )
      this.logger.log(
        `Order ${orderId} verification attempt ${attempt} failed — retry scheduled in 3 days`,
      )
    }
  }
}
