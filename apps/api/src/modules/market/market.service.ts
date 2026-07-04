import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import axios from 'axios'
import { PrismaService } from '../../prisma.service'

export interface OrderLink {
  url: string
  anchor: string
  type: 'KEYWORD' | 'BRAND'
}

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
  /** Blog konusu — müşteri seçer */
  topic?: string
  /** En fazla 3 link: 2 anahtar kelime + 1 marka/site adı */
  links?: OrderLink[]
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
  private readonly logger = new Logger(MarketService.name)

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

    // Link doğrulaması: en fazla 3 (2 kelime + 1 marka)
    const links = (dto.links ?? []).slice(0, 3)
    if (links.length > 0) {
      const brandCount = links.filter((l) => l.type === 'BRAND').length
      const keywordCount = links.filter((l) => l.type === 'KEYWORD').length
      if (brandCount > 1 || keywordCount > 2) {
        throw new BadRequestException('En fazla 2 anahtar kelime + 1 marka linki seçilebilir')
      }
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.backlinkOrder.create({
        data: {
          organizationId: orgId,
          projectId,
          listingId: dto.listingId,
          targetUrl: dto.targetUrl,
          anchorText: dto.anchorText ?? links[0]?.anchor ?? null,
          contentBrief: dto.contentBrief ?? null,
          topic: dto.topic ?? null,
          links: links.length > 0 ? (links as unknown as object) : undefined,
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

    // Müşterinin sitesine özel blog taslağını arka planda üret
    void this.generateOrderContent(order.id).catch((e) =>
      this.logger.error(`Sipariş içeriği üretilemedi (${order.id}): ${(e as Error).message}`),
    )

    return order
  }

  // ─── Sipariş içeriği: siteye özel AI blog + onay/düzeltme döngüsü ──────────

  /**
   * Müşterinin sitesini okuyup, seçtiği konu ve 3 linki (2 kelime + 1 marka)
   * doğal biçimde yerleştiren blog taslağı üretir. Taslak müşteri onayına düşer;
   * onaylanmadan yayıncıya GİTMEZ.
   */
  async generateOrderContent(orderId: string, revisionNote?: string): Promise<void> {
    const order = await this.prisma.backlinkOrder.findUnique({
      where: { id: orderId },
      include: {
        project: true,
        listing: { include: { publisherSite: true } },
      },
    })
    if (!order) return

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY yok — sipariş içeriği üretilemedi')
      return
    }

    const domain = order.project.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const links = ((order.links as unknown as OrderLink[]) ?? []).slice(0, 3)
    const topic = order.topic ?? order.contentBrief ?? `${domain} hakkında`

    // Müşterinin sitesini canlı oku — blog o işletmeye özel olsun
    let siteContext = ''
    try {
      const res = await axios.get(`https://${domain}`, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FunBreakSEO/1.0)' },
        responseType: 'text',
        transformResponse: [(d) => d],
        validateStatus: (s) => s < 400,
      })
      const html = typeof res.data === 'string' ? res.data : ''
      const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? ''
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1200)
      siteContext = `${metaDesc ? `Site açıklaması: ${metaDesc}\n` : ''}Ana sayfa özeti: ${text}`
    } catch {
      siteContext = ''
    }

    const language = order.project.language === 'tr' ? 'Turkish' : order.project.language
    const linkInstructions = links.length
      ? links
          .map(
            (l, i) =>
              `${i + 1}. [${l.anchor}](${l.url}) — ${l.type === 'BRAND' ? 'marka/site adı linki' : 'anahtar kelime linki'}`,
          )
          .join('\n')
      : `1. [${order.anchorText ?? domain}](${order.targetUrl})`

    const prompt = `You are writing a GUEST POST that will be published on the website "${order.listing.publisherSite?.domain ?? 'a publisher site'}". The post must promote the customer's business naturally.

CUSTOMER BUSINESS:
- Website: ${domain}
${siteContext ? `- ${siteContext}` : ''}

ARTICLE:
- Topic: ${topic}
- Language: ${language}
- Length: 700-1000 words
- Style: informative, natural, editorial (NOT an ad). One H1, 3-4 H2 sections.

LINKS (CRITICAL — insert ALL of these exactly, naturally within sentences, markdown format):
${linkInstructions}

RULES:
- Each link must appear exactly once, inside a natural sentence.
- Do not cluster links; spread them across different sections.
- Write valuable content the publisher's readers would genuinely enjoy.
- No competitor mentions.
${revisionNote ? `\nCUSTOMER REVISION REQUEST (apply these changes):\n${revisionNote}` : ''}

Return ONLY the article in Markdown.`

    const resp = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: process.env.DEFAULT_CONTENT_MODEL ?? 'claude-sonnet-4-6',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 120000,
      },
    )

    const draft: string = resp.data?.content?.[0]?.text ?? ''
    if (!draft) throw new Error('Boş içerik döndü')

    await this.prisma.backlinkOrder.update({
      where: { id: orderId },
      data: { contentDraft: draft, revisionNote: revisionNote ?? null, status: 'CONTENT_READY' },
    })

    // Müşteriye bildir: taslak onayını bekliyor
    const org = await this.prisma.organization.findUnique({
      where: { id: order.organizationId },
      select: { ownerUserId: true },
    })
    if (org) {
      await this.prisma.notification.create({
        data: {
          userId: org.ownerUserId,
          type: 'ORDER_CONTENT_READY',
          title: 'Backlink içeriğiniz hazır — onayınızı bekliyor',
          body: `"${topic}" konulu misafir yazısı hazırlandı. Onaylayın veya düzeltme isteyin; onaysız yayıncıya gönderilmez.`,
          link: '/dashboard/backlinks',
        },
      })
    }
    this.logger.log(`Sipariş içeriği hazır: ${orderId}${revisionNote ? ' (revizyon)' : ''}`)
  }

  async getOrder(orderId: string, orgId: string) {
    const order = await this.prisma.backlinkOrder.findFirst({
      where: { id: orderId, organizationId: orgId },
      include: { listing: { include: { publisherSite: true } }, project: { select: { domain: true } } },
    })
    if (!order) throw new NotFoundException('Order not found')
    return order
  }

  /** Müşteri taslağı beğenmedi — notuyla birlikte yeniden üretilir */
  async requestContentRevision(orderId: string, orgId: string, note: string) {
    const order = await this.prisma.backlinkOrder.findFirst({
      where: { id: orderId, organizationId: orgId },
    })
    if (!order) throw new NotFoundException('Order not found')
    if (order.contentApprovedAt) throw new BadRequestException('İçerik zaten onaylandı')

    await this.prisma.backlinkOrder.update({
      where: { id: orderId },
      data: { revisionNote: note, status: 'ESCROW_HELD' },
    })
    void this.generateOrderContent(orderId, note).catch((e) =>
      this.logger.error(`Revizyon üretilemedi (${orderId}): ${(e as Error).message}`),
    )
    return { message: 'Düzeltme talebiniz alındı — içerik yeniden üretiliyor.' }
  }

  /** Müşteri onayladı → yayıncıya gönderilmek üzere admin'e düşer */
  async approveOrderContent(orderId: string, orgId: string) {
    const order = await this.prisma.backlinkOrder.findFirst({
      where: { id: orderId, organizationId: orgId },
      include: { listing: { include: { publisherSite: true } } },
    })
    if (!order) throw new NotFoundException('Order not found')
    if (!order.contentDraft) throw new BadRequestException('Henüz içerik taslağı yok')

    const updated = await this.prisma.backlinkOrder.update({
      where: { id: orderId },
      data: { contentApprovedAt: new Date() },
    })

    // Admin'e bildir: içerik onaylandı, yayıncıya iletilecek
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true },
    })
    if (admins.length > 0) {
      await this.prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: 'ORDER_CONTENT_APPROVED',
          title: 'Müşteri içeriği onayladı — yayıncıya gönderin',
          body: `Sipariş ${orderId} içeriği onaylandı. Yayıncı: ${order.listing.publisherSite?.domain ?? '?'}`,
          link: `/market`,
        })),
      })
    }

    return updated
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
