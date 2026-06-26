import { Module } from '@nestjs/common';
import { CustomerApiService } from './customer-api.service';
import {
  DeveloperKeyController,
  DeveloperApiKeyAliasController,
  DeveloperWebhookController,
  DeveloperUsageController,
  CustomerApiV1Controller,
} from './customer-api.controller';
import { ApiKeyGuard } from './api-key.guard';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [
    DeveloperKeyController,
    DeveloperApiKeyAliasController,
    DeveloperWebhookController,
    DeveloperUsageController,
    CustomerApiV1Controller,
  ],
  providers: [CustomerApiService, ApiKeyGuard, PrismaService],
  exports: [CustomerApiService],
})
export class CustomerApiModule {}
