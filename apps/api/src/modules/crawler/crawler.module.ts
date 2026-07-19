import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { CrawlerController } from './crawler.controller'
import { CrawlerService } from './crawler.service'
import { CrawlerWorker } from './crawler.worker'
import { AuditAggregatorService } from './audit-aggregator.service'
import { PrismaService } from '../../prisma.service'
import { PlanLimitModule } from '../plan-limit/plan-limit.module'
import { PerformanceModule } from '../performance/performance.module'
import { SiteIntelModule } from '../site-intel/site-intel.module'
import { GeoModule } from '../geo/geo.module'
import { OutreachModule } from '../outreach/outreach.module'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'crawler',
    }),
    PlanLimitModule,
    PerformanceModule,
    SiteIntelModule,
    GeoModule,
    OutreachModule,
  ],
  controllers: [CrawlerController],
  providers: [PrismaService, CrawlerService, CrawlerWorker, AuditAggregatorService],
  exports: [CrawlerService],
})
export class CrawlerModule {}
