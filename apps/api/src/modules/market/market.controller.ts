import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { MarketService } from './market.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'

class CreateOrderDto {
  projectId: string = ''
  listingId: string = ''
  targetUrl: string = ''
  anchorText?: string
  contentBrief?: string
}

class PublisherApplyDto {
  domain: string = ''
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

class ApproveOfferDto {
  salePrice: number = 0
  drTier?: string
}

class RejectOfferDto {
  note: string = ''
}

class DisputeOrderDto {
  reason: string = ''
}

class ListingsQueryDto {
  drTier?: string
  category?: string
  language?: string
  linkType?: string
  minPrice?: string
  maxPrice?: string
  page?: string
  limit?: string
}

class OrdersQueryDto {
  status?: string
}

@ApiTags('Market')
@Controller()
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  // ─── Public / Customer listing browsing ─────────────────────────────────

  @Get('market/listings')
  getListings(@Query() query: ListingsQueryDto) {
    return this.marketService.getListings(query)
  }

  @Get('market/listings/:id')
  getListing(@Param('id') id: string) {
    return this.marketService.getListing(id)
  }

  // ─── Customer orders ─────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('market/orders')
  createOrder(@Body() body: CreateOrderDto, @CurrentUser() user: any) {
    return this.marketService.createOrder(
      user.organizationId,
      body.projectId,
      body,
      user.id,
    )
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('market/orders')
  getOrders(@CurrentUser() user: any) {
    return this.marketService.getOrders(user.organizationId)
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('market/orders/:id/dispute')
  disputeOrder(@Param('id') id: string, @Body() body: DisputeOrderDto) {
    return this.marketService.disputeOrder(id, body.reason)
  }

  // ─── Publisher routes ────────────────────────────────────────────────────

  @Post('market/publisher/apply')
  publisherApply(@Body() body: PublisherApplyDto) {
    return this.marketService.publisherApply(body)
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('market/publisher/orders')
  getPublisherOrders(@CurrentUser() user: any) {
    return this.marketService.getPublisherOrders(user.id)
  }

  // ─── Admin routes ────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/market/offers')
  getPendingOffers() {
    return this.marketService.getPendingOffers()
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('admin/market/offers/:id/approve')
  approveOffer(@Param('id') id: string, @Body() body: ApproveOfferDto) {
    return this.marketService.approveOffer(id, body.salePrice, body.drTier)
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('admin/market/offers/:id/reject')
  rejectOffer(@Param('id') id: string, @Body() body: RejectOfferDto) {
    return this.marketService.rejectOffer(id, body.note)
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/market/listings')
  getAllListings(@Query() query: ListingsQueryDto) {
    return this.marketService.getAllListings(query)
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/market/orders')
  getAllOrders(@Query() query: OrdersQueryDto) {
    return this.marketService.getAllOrders(query)
  }
}
