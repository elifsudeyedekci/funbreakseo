import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { OnboardingService, OnboardingStep } from './onboarding.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '@prisma/client';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  getStatus(@CurrentUser() user: User) {
    return this.onboardingService.getStatus(user.organizationId!);
  }

  @Post('step/:step/complete')
  completeStep(
    @Param('step') step: OnboardingStep,
    @CurrentUser() user: User,
  ) {
    return this.onboardingService.completeStep(user.organizationId!, step);
  }
}
