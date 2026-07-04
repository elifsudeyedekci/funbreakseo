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
import { IsArray, IsIn, IsNumber, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { MarketService } from './market.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'

class OrderLinkDto {
  @IsString() url: string = ''
  @IsString() anchor: string = ''
  @IsIn(['KEYWORD', 'BRAND']) type: 'KEYWORD' | 'BRAND' = 'KEYWORD'
}

class CreateOrderDto {
  @IsString() projectId: string = ''
  @IsString() listingId: string = ''
  @IsString() targetUrl: string = ''
  @IsOptional() @IsString() anchorText?: string
  @IsOptional() @IsString() contentBrief?: string
  @IsOptional() @IsString() topic?: string
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OrderLinkDto) links?: OrderLinkDto[]
}

class RevisionDto {
  @IsString() @MinLength(3) note: string = ''
}

class PublisherApplyDto {
  @IsString() @MinLength(3) domain: string = ''
  @IsOptional() @IsNumber() @Type(() => Number) domainRating?: number
  @IsOptional() @IsNumber() @Type(() => Number) organicTraffic?: number
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsString() language?: string
  @IsOptional() @IsString() country?: string
  @IsOptional() @IsString() linkType?: string
  @IsOptional() @IsNumber() @Type(() => Number) publisherAskingPrice?: number
  @IsOptional() @IsNumber() @Type(() => Number) turnaroundDays?: number
  @IsOptional() @IsString() sampleUrl?: string
  @IsOptional() @IsString() contactEmail?: string
}

class ApproveOfferDto {
  @IsNumber() @Type(() => Number) salePrice: number = 0
  @IsOptional() @IsString() drTier?: string
}

class RejectOfferDto {
  @IsString() note: string = ''
}

class DisputeOrderDto {
  @IsString() reason: string = ''
}

class ListingsQueryDto {
  @IsOptional() @IsString() drTier?: string
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsString() language?: string
  @IsOptional() @IsString() linkType?: string
  @IsOptional() @IsString() minPrice?: string
  @IsOptional() @IsString() maxPrice?: string
  @IsOptional() @IsString() page?: string
  @IsOptional() @IsString() limit?: string
}

class OrdersQueryDto {
  @IsOptional() @IsString() status?: string
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
  @Get('market/orders/:id')
  getOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.marketService.getOrder(id, user.organizationId)
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('market/orders/:id/approve-content')
  approveOrderContent(@Param('id') id: string, @CurrentUser() user: any) {
    return this.marketService.approveOrderContent(id, user.organizationId)
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('market/orders/:id/request-revision')
  requestRevision(@Param('id') id: string, @Body() body: RevisionDto, @CurrentUser() user: any) {
    return this.marketService.requestContentRevision(id, user.organizationId, body.note)
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
