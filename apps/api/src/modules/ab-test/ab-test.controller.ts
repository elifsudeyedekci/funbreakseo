import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AbTestService, CreateAbTestDto } from './ab-test.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '@prisma/client';

@Controller('ab-tests')
@UseGuards(JwtAuthGuard)
export class AbTestController {
  constructor(private readonly abTestService: AbTestService) {}

  /** List A/B tests for a project */
  @Get()
  listTests(@Query('projectId') projectId: string) {
    return this.abTestService.listTests(projectId);
  }

  /** Create a new A/B test */
  @Post()
  createTest(@CurrentUser() user: User, @Body() dto: CreateAbTestDto) {
    return this.abTestService.createTest(user.id, dto);
  }

  /** Get a single A/B test */
  @Get(':id')
  getTest(@Param('id') id: string) {
    return this.abTestService.getTest(id);
  }

  /** Activate (start) a test */
  @Patch(':id/activate')
  activateTest(@Param('id') id: string) {
    return this.abTestService.activateTest(id);
  }

  /** Stop a test, optionally declaring a winner */
  @Patch(':id/stop')
  stopTest(@Param('id') id: string, @Body() body: { winnerVariantId?: string }) {
    return this.abTestService.stopTest(id, body.winnerVariantId);
  }

  /** Get test results */
  @Get(':id/results')
  getResults(@Param('id') id: string) {
    return this.abTestService.getResults(id);
  }

  /** Record an impression (called from frontend) */
  @Post(':id/impression')
  recordImpression(
    @Param('id') id: string,
    @Body() body: { variantId: string; sessionId: string },
  ) {
    return this.abTestService.recordImpression(id, body.variantId, body.sessionId);
  }

  /** Record a conversion */
  @Post(':id/conversion')
  recordConversion(
    @Param('id') id: string,
    @Body() body: { variantId: string; sessionId: string; conversionType: string },
  ) {
    return this.abTestService.recordConversion(
      id,
      body.variantId,
      body.sessionId,
      body.conversionType,
    );
  }

  /** Assign a variant to a session (for client-side bucketing) */
  @Post(':id/assign')
  async assignVariant(@Param('id') id: string, @Body() body: { sessionId: string }) {
    const test = (await this.abTestService.getTest(id)) as Record<string, unknown> | null;
    if (!test) return { variant: null };
    const variants = (test['variants'] as import('./ab-test.service').AbTestVariant[]) ?? [];
    const variant = this.abTestService.assignVariant(variants, body.sessionId);
    return { variant };
  }
}
