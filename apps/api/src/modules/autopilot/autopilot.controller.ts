import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AutopilotService } from './autopilot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/autopilot')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AutopilotController {
  constructor(private readonly autopilotService: AutopilotService) {}

  @Get('settings')
  getSettings() {
    return this.autopilotService.getSettings();
  }

  @Patch('settings')
  updateSettings(
    @Body()
    dto: {
      isEnabled?: boolean;
      publishMode?: 'AUTO' | 'SEMI_AUTO';
      weeklyTarget?: number;
      minSeoScore?: number;
      minGeoScore?: number;
      maxRetries?: number;
      locales?: string[];
      nichKeywords?: string[];
    },
  ) {
    return this.autopilotService.updateSettings(dto);
  }

  @Get('dashboard')
  getDashboard() {
    return this.autopilotService.getDashboard();
  }

  @Get('queue')
  getQueue() {
    return this.autopilotService.getQueue();
  }

  @Post('run')
  manualRun() {
    return this.autopilotService.manualRun();
  }

  @Post('discover')
  discoverKeywords(@Query('locale') locale: string) {
    return this.autopilotService.discoverKeywords(locale ?? 'tr');
  }
}
