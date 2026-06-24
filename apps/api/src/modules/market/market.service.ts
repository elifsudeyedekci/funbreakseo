import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { PrismaService } from '../../prisma.service'

interface ListingsFilters {
  drTier?: string
  category?: string
  language?: string
  linkType?: string
  minPrice?: string
  maxPrice?: string
  page?: string
  limit?: string
}

interface CreateOrderDto {
  projectId: string
  listingId: string
  targetUrl: string
  anchorText?: string
  contentBrief?: string
}

interface PublisherApplyDto {
  domain: string
  domainRating?: number
  organicTraffic?: number
  category?: string
  language?: string
  country?: string
  linkType?: string
  publisherAskingPrice?: number
  turnaroundDays?: number
  sampleUrl?: string
  contactEmail?: string
}

@Injectable()
export class MarketService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('market') private readonly queue: Queue,
  ) {}

  // ─── Listings ─────────────────────────────────────────────────────────────

  async getListings(filters: ListingsFilters) {
    const where: any = { isActive: true }

    if (filters.drTier) where.drTier = filters.drTier
    if (filters.linkType) where.linkType = filters.linkType

    if (filters.minPrice || filters.maxPrice) {
      where.price = {}
      if (filters.minPrice) where.price.gte = parseFloat(filters.minPrice)
      if (filters.maxPrice) where.price.lte = parseFloat(filters.maxPrice)
    }

    if (filters.category || filters.language) {
      where.publisherSite = {}
      if (filters.category) where.publisherSite.category = filters.category
      if (filters.language) where.publisherSite.language = filters.language
    }

    const page = parseInt(filters.page ?? '1', 10)
    const limit = parseInt(filters.limit ?? '20', 10)

    const [items, total] = await Promise.all([
      this.prisma.marketListing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          publisherSite: {
            select: {
              domain: true,
              domainRating: true,
              organicTraffic: true,
              category: true,
              language: true,
              country: true,
              isVerified: true,
            },
          },
        },
        orderBy: { price: 'asc' },
      }),
      this.prisma.marketListing.count({ where }),
    ])

    return { items, total, page, limit }
  }

  async getListing(listingId: string) {
    return this.prisma.marketListing.findUnique({
      where: { id: listingId },
      include: {
        publisherSite: true,
      },
    })
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async createOrder(
    orgId: string,
    projectId: string,
    dto: CreateOrderDto,
    userId: string,
  ) {
    const listing = await this.prisma.marketListing.findUnique({
      where: { id: dto.listingId },
    })
    if (!listing) throw new BadRequestException('Listing not found')

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    })
    if (!org) throw new BadRequestException('Organization not found')

    if (Number(org.walletBalance) < Number(listing.price)) {
      throw new BadRequestException('Insufficient wallet balance')
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.backlinkOrder.create({
        data: {
          organizationId: orgId,
          projectId,
          listingId: dto.listingId,
          targetUrl: dto.targetUrl,
          anchorText: dto.anchorText ?? null,
          contentBrief: dto.contentBrief ?? null,
          status: 'ESCROW_HELD',
          price: listing.price,
        },
      })

      const newBalance = Number(org.walletBalance) - Number(listing.price)

      await tx.organization.update({
        where: { id: orgId },
        data: { walletBalance: newBalance },
      })

      await tx.walletTransaction.create({
        data: {
          organizationId: orgId,
          type: 'ESCROW_HOLD',
          amount: listing.price,
          balanceAfter: newBalance,
          refType: 'BacklinkOrder',
          refId: newOrder.id,
          description: `Escrow held for order ${newOrder.id}`,
        },
      })

      return newOrder
    })

    await this.queue.add(
      'verify-backlink',
      { orderId: order.id },
      { delay: 7 * 24 * 60 * 60 * 1000 },
    )

    return order
  }

  async getOrders(orgId: string) {
    return this.prisma.backlinkOrder.findMany({
      where: { organizationId: orgId },
      include: {
        listing: {
          include: { publisherSite: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async disputeOrder(orderId: string, reason: string) {
    const order = await this.prisma.backlinkOrder.update({
      where: { id: orderId },
      data: { status: 'DISPUTED' },
    })

    // Notify admin users of the dispute
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true },
    })

    if (admins.length > 0) {
      await this.prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: 'ORDER_DISPUTED',
          title: 'Order Disputed',
          body: `Order ${orderId} has been disputed. Reason: ${reason}`,
          link: `/admin/market/orders/${orderId}`,
        })),
      })
    }

    return order
  }

  // ─── Publisher ────────────────────────────────────────────────────────────

  async publisherApply(dto: PublisherApplyDto) {
    const offer = await this.prisma.publisherOffer.create({
      data: {
        domain: dto.domain,
        domainRating: dto.domainRating ?? null,
        organicTraffic: dto.organicTraffic ?? null,
        category: dto.category ?? null,
        language: dto.language ?? null,
        country: dto.country ?? null,
        linkType: (dto.linkType as any) ?? 'GUEST_POST',
        publisherAskingPrice: dto.publisherAskingPrice ?? null,
        turnaroundDays: dto.turnaroundDays ?? null,
        sampleUrl: dto.sampleUrl ?? null,
        status: 'PENDING_ADMIN_REVIEW',
      },
    })

    // Notify admin users
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true },
    })

    if (admins.length > 0) {
      await this.prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: 'PUBLISHER_OFFER',
          title: 'New Publisher Application',
          body: `A new publisher has applied: ${dto.domain}`,
          link: `/admin/market/offers/${offer.id}`,
        })),
      })
    }

    return offer
  }

  async getPublisherOrders(userId: string) {
    // Publisher orders: BacklinkOrders tied to listings owned by this user's PublisherSites
    return this.prisma.backlinkOrder.findMany({
      where: {
        listing: {
          publisherSite: {
            ownerUserId: userId,
          },
        },
      },
      include: {
        listing: {
          include: { publisherSite: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async getPendingOffers() {
    return this.prisma.publisherOffer.findMany({
      where: { status: 'PENDING_ADMIN_REVIEW' },
      include: {
        listing: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async approveOffer(offerId: string, salePrice: number, drTier?: string) {
    const offer = await this.prisma.publisherOffer.findUnique({
      where: { id: offerId },
    })
    if (!offer) throw new BadRequestException('Offer not found')

    return this.prisma.$transaction(async (tx) => {
      const updatedOffer = await tx.publisherOffer.update({
        where: { id: offerId },
        data: {
          status: 'APPROVED',
          salePrice,
        },
      })

      // Upsert PublisherSite
      const publisherSite = await tx.publisherSite.upsert({
        where: { domain: offer.domain },
        create: {
          domain: offer.domain,
          domainRating: offer.domainRating ?? null,
          organicTraffic: offer.organicTraffic ?? null,
          category: offer.category ?? null,
          language: offer.language ?? null,
          country: offer.country ?? null,
          priceMin: offer.publisherAskingPrice ?? null,
          priceMax: salePrice,
          turnaroundDays: offer.turnaroundDays ?? null,
          isVerified: false,
          status: 'APPROVED',
          addedVia: 'OUTREACH_AUTO',
          offerId,
        },
        update: {
          domainRating: offer.domainRating ?? undefined,
          organicTraffic: offer.organicTraffic ?? undefined,
          priceMax: salePrice,
          status: 'APPROVED',
        },
      })

      const publisherCost = offer.publisherAskingPrice ?? 0
      const margin = salePrice - Number(publisherCost)

      await tx.marketListing.create({
        data: {
          publisherSiteId: publisherSite.id,
          offerId,
          linkType: offer.linkType as any,
          publisherCost: publisherCost,
          price: salePrice,
          margin,
          drTier: drTier ?? null,
          isDofollow: true,
          sampleUrl: offer.sampleUrl ?? null,
          isActive: true,
        },
      })

      return updatedOffer
    })
  }

  async rejectOffer(offerId: string, note: string) {
    return this.prisma.publisherOffer.update({
      where: { id: offerId },
      data: {
        status: 'REJECTED',
        adminNote: note,
      },
    })
  }

  async getAllListings(filters: ListingsFilters) {
    const where: any = {}

    if (filters.drTier) where.drTier = filters.drTier
    if (filters.linkType) where.linkType = filters.linkType

    if (filters.minPrice || filters.maxPrice) {
      where.price = {}
      if (filters.minPrice) where.price.gte = parseFloat(filters.minPrice)
      if (filters.maxPrice) where.price.lte = parseFloat(filters.maxPrice)
    }

    if (filters.category || filters.language) {
      where.publisherSite = {}
      if (filters.category) where.publisherSite.category = filters.category
      if (filters.language) where.publisherSite.language = filters.language
    }

    const page = parseInt(filters.page ?? '1', 10)
    const limit = parseInt(filters.limit ?? '20', 10)

    const [items, total] = await Promise.all([
      this.prisma.marketListing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          publisherSite: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.marketListing.count({ where }),
    ])

    return { items, total, page, limit }
  }

  async getAllOrders(filters: { status?: string }) {
    const where: any = {}
    if (filters.status) where.status = filters.status

    return this.prisma.backlinkOrder.findMany({
      where,
      include: {
        listing: {
          include: { publisherSite: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}
