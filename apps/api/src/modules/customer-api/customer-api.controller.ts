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
    return this.customerApiService.getApiKeys(user.organizationId);
  }

  @Post()
  createApiKey(@CurrentUser() user: User, @Body('name') name: string) {
    return this.customerApiService.createApiKey(
      user.organizationId,
      name ?? 'Default Key',
    );
  }

  @Delete(':id')
  revokeApiKey(@Param('id') id: string, @CurrentUser() user: User) {
    return this.customerApiService.revokeApiKey(id, user.organizationId);
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
