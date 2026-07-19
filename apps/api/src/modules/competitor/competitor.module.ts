import { Module } from '@nestjs/common';
import { CompetitorService } from './competitor.service';
import { CompetitorController } from './competitor.controller';
import { DataForSeoModule } from '../dataforseo/dataforseo.module';
import { PrismaService } from '../../prisma.service';
import { PerformanceModule } from '../performance/performance.module';
import { SiteIntelModule } from '../site-intel/site-intel.module';
import { GeoModule } from '../geo/geo.module';
import { PlanLimitModule } from '../plan-limit/plan-limit.module';

@Module({
  imports: [DataForSeoModule, PerformanceModule, SiteIntelModule, GeoModule, PlanLimitModule],
  controllers: [CompetitorController],
  providers: [CompetitorService, PrismaService],
  exports: [CompetitorService],
})
export class CompetitorModule {}
