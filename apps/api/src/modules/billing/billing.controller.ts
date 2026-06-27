import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  IsObject,
  IsArray,
  IsEmail,
} from 'class-validator';
import { BillingCycle, CancellationReason, User } from '@prisma/client';
import { BillingService, BillingProfileDto } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CardData } from './vakifbank.service';
import { Response, Request } from 'express';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class CardDto implements CardData {
  @IsString()
  pan!: string;

  @IsString()
  expireMonth!: string;

  @IsString()
  expireYear!: string;

  @IsString()
  cvv!: string;

  @IsString()
  cardHolderName!: string;
}

export class BillingProfileInputDto implements BillingProfileDto {
  @IsEnum(['INDIVIDUAL', 'CORPORATE'])
  invoiceType!: 'INDIVIDUAL' | 'CORPORATE';

  @IsOptional()
  @IsString()
  companyTitle?: string;

  @IsOptional()
  @IsString()
  taxOffice?: string;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  @IsOptional()
  @IsString()
  tckn?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class SubscribeDto {
  @IsString()
  planId!: string;

  @IsEnum(BillingCycle)
  cycle!: BillingCycle;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @ValidateNested()
  @Type(() => BillingProfileInputDto)
  billingProfile!: BillingProfileInputDto;

  @ValidateNested()
  @Type(() => CardDto)
  card!: CardDto;

  @IsArray()
  @IsString({ each: true })
  consents!: string[];
}

export class ChangePlanDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  planKey?: string;

  @IsOptional()
  @IsString()
  billingCycle?: string;
}

export class CancelDto {
  @IsOptional()
  @IsEnum(CancellationReason)
  reason?: CancellationReason;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class ApplyCouponDto {
  @IsString()
  code!: string;

  @IsString()
  planId!: string;

  @IsEnum(BillingCycle)
  cycle!: BillingCycle;
}

export class WalletTopupDto {
  @IsNumber()
  @Min(10)
  amount!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CardDto)
  card?: CardDto;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Billing')
@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List available plans' })
  async getPlans(
    @Query('locale') locale?: string,
    @Query('currency') currency?: string,
  ) {
    return this.billingService.getPlans(locale ?? 'tr', currency ?? 'TRY');
  }

  @Post('billing/subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Subscribe to a plan (initiates 3D Secure)' })
  async subscribe(@CurrentUser() user: User, @Body() dto: SubscribeDto) {
    return this.billingService.subscribe(user.organizationId!, {
      planId: dto.planId,
      cycle: dto.cycle,
      couponCode: dto.couponCode,
      billingProfile: dto.billingProfile,
      card: dto.card,
      consents: dto.consents,
    });
  }

  @Post('billing/change-plan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change subscription plan' })
  async changePlan(@CurrentUser() user: User, @Body() dto: ChangePlanDto) {
    const planId = dto.planId ?? await this.billingService.resolvePlanId(dto.planKey);
    if (!planId) throw new BadRequestException('planId or planKey required');
    return this.billingService.changePlan(user.organizationId!, planId);
  }

  @Post('billing/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  async cancelSubscription(@CurrentUser() user: User, @Body() dto: CancelDto) {
    return this.billingService.cancelSubscription(
      user.organizationId!,
      dto.reason ?? CancellationReason.OTHER,
      dto.feedback,
    );
  }

  @Post('billing/apply-coupon')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate and apply a coupon code' })
  async applyCoupon(@Body() dto: ApplyCouponDto) {
    return this.billingService.applyCoupon(dto.code, dto.planId, dto.cycle);
  }

  @Get('billing/invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List invoices for current organization' })
  async getInvoices(@CurrentUser() user: User) {
    return this.billingService.getInvoices(user.organizationId!);
  }

  @Get('billing/invoices/:id/pdf')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get PDF URL for an invoice' })
  async getInvoicePdf(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    const url = await this.billingService.getInvoicePdf(id, user.organizationId!);
    return { pdfUrl: url };
  }

  @Post('billing/wallet/topup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Top up wallet balance (initiates 3D Secure)' })
  async walletTopup(@CurrentUser() user: User, @Body() dto: WalletTopupDto) {
    return this.billingService.walletTopup(
      user.organizationId!,
      dto.amount,
      dto.card,
    );
  }

  @Get('billing/wallet/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List wallet transactions' })
  async getWalletTransactions(@CurrentUser() user: User) {
    return this.billingService.getWalletTransactions(user.organizationId!);
  }

  @Get('billing/subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current subscription' })
  async getSubscription(@CurrentUser() user: User) {
    return this.billingService.getSubscription(user.organizationId!);
  }

  @Get('billing/usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current usage' })
  async getUsage(@CurrentUser() user: User) {
    return this.billingService.getUsage(user.organizationId!);
  }

  @Get('billing/wallet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get wallet balance' })
  async getWallet(@CurrentUser() user: User) {
    return this.billingService.getWallet(user.organizationId!);
  }

  @Post('webhooks/vakifbank')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'VakıfBank payment webhook (signature required)' })
  async vakifbankWebhook(@Body() payload: Record<string, string>) {
    return this.billingService.handleVakifbankWebhook(payload);
  }
}
