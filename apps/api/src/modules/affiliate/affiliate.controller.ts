import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { User, UserRole } from '@prisma/client';

// ---- Customer routes ----
@Controller('affiliate')
@UseGuards(JwtAuthGuard)
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Get('me')
  getMyAffiliate(@CurrentUser() user: User) {
    return this.affiliateService.getMyAffiliate(user.organizationId!);
  }

  @Get('referrals')
  getReferrals(@CurrentUser() user: User) {
    return this.affiliateService.getReferrals(user.organizationId!);
  }

  @Get('payouts')
  getPayouts(@CurrentUser() user: User) {
    return this.affiliateService.getPayouts(user.organizationId!);
  }

  @Post('payout')
  requestPayout(
    @Body('affiliateId') affiliateId: string,
    @Body('amount') amount: number,
  ) {
    return this.affiliateService.requestPayout(affiliateId, amount);
  }

  @Post('payouts')
  requestPayoutAlias(
    @Body('amount') amount: number,
    @CurrentUser() user: User,
  ) {
    return this.affiliateService.requestPayoutByOrg(user.organizationId!, amount);
  }
}

// ---- Admin routes ----
@Controller('admin/affiliate')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminAffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Get()
  getAllAffiliates() {
    return this.affiliateService.getAllAffiliates();
  }

  @Post(':id/approve-commission')
  approveCommission(
    @Param('id') affiliateId: string,
    @Body('amount') amount: number,
  ) {
    return this.affiliateService.approveCommission(affiliateId, amount);
  }

  @Post('commission-rate')
  setCommissionRate(@Body('rate') rate: number) {
    return this.affiliateService.setCommissionRate(rate);
  }
}
