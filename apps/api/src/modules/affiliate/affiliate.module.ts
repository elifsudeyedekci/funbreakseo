import { Module } from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import {
  AffiliateController,
  AdminAffiliateController,
} from './affiliate.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [AffiliateController, AdminAffiliateController],
  providers: [AffiliateService, PrismaService],
  exports: [AffiliateService],
})
export class AffiliateModule {}
