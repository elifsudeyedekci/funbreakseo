import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CustomerApiService } from './customer-api.service';
import { ApiKeyGuard } from './api-key.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '@prisma/client';

// ---- Developer key management (JWT auth) ----
@Controller('developer/keys')
@UseGuards(JwtAuthGuard)
export class DeveloperKeyController {
  constructor(private readonly customerApiService: CustomerApiService) {}

  @Get()
  getApiKeys(@CurrentUser() user: User) {
    return this.customerApiService.getApiKeys(user.organizationId!);
  }

  @Post()
  createApiKey(@CurrentUser() user: User, @Body('name') name: string) {
    return this.customerApiService.createApiKey(
      user.organizationId!,
      name ?? 'Default Key',
    );
  }

  @Delete(':id')
  revokeApiKey(@Param('id') id: string, @CurrentUser() user: User) {
    return this.customerApiService.revokeApiKey(id, user.organizationId!);
  }
}

// /developer/api-keys — alias used by the web dashboard
@Controller('developer/api-keys')
@UseGuards(JwtAuthGuard)
export class DeveloperApiKeyAliasController {
  constructor(private readonly customerApiService: CustomerApiService) {}

  @Get()
  getApiKeys(@CurrentUser() user: User) {
    return this.customerApiService.getApiKeys(user.organizationId!);
  }

  @Post()
  createApiKey(@CurrentUser() user: User, @Body('name') name: string, @Body() dto: Record<string, unknown>) {
    return this.customerApiService.createApiKey(user.organizationId!, String(dto.name ?? name ?? 'Default Key'));
  }

  @Delete(':id')
  revokeApiKey(@Param('id') id: string, @CurrentUser() user: User) {
    return this.customerApiService.revokeApiKey(id, user.organizationId!);
  }
}

// /developer/webhooks — stub (no DB model yet, returns empty list)
@Controller('developer/webhooks')
@UseGuards(JwtAuthGuard)
export class DeveloperWebhookController {
  @Get()
  listWebhooks() {
    return { data: [], total: 0 };
  }

  @Post()
  createWebhook(@Body() _dto: Record<string, unknown>) {
    return { message: 'Webhook functionality coming soon', data: null };
  }

  @Delete(':id')
  deleteWebhook(@Param('id') _id: string) {
    return { success: false, message: 'Webhook not found' };
  }
}

// /developer/usage — API usage stats from apiUsageLog
@Controller('developer/usage')
@UseGuards(JwtAuthGuard)
export class DeveloperUsageController {
  constructor(private readonly customerApiService: CustomerApiService) {}

  @Get()
  getUsage(@CurrentUser() user: User) {
    return this.customerApiService.getDeveloperUsage(user.organizationId!);
  }
}

// ---- Public API v1 (API key auth) ----
@Controller('v1')
@UseGuards(ApiKeyGuard)
export class CustomerApiV1Controller {
  constructor(private readonly customerApiService: CustomerApiService) {}

  @Get('projects')
  getProjects(@Req() req: Request & { apiOrg?: { id: string } }) {
    return this.customerApiService.getProjects(req.apiOrg!.id);
  }

  @Get('projects/:id/keywords')
  getProjectKeywords(
    @Param('id') projectId: string,
    @Req() req: Request & { apiOrg?: { id: string } },
  ) {
    return this.customerApiService.getProjectKeywords(
      projectId,
      req.apiOrg!.id,
    );
  }

  @Get('projects/:id/ranks')
  getProjectRanks(
    @Param('id') projectId: string,
    @Query('limit') limit = '50',
    @Req() req: Request & { apiOrg?: { id: string } },
  ) {
    return this.customerApiService.getProjectRanks(
      projectId,
      req.apiOrg!.id,
      parseInt(limit),
    );
  }
}
