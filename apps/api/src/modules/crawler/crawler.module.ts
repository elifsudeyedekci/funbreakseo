import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { CrawlerController } from './crawler.controller'
import { CrawlerService } from './crawler.service'
import { CrawlerWorker } from './crawler.worker'
import { PrismaService } from '../../prisma.service'
import { PlanLimitModule } from '../plan-limit/plan-limit.module'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'crawler',
    }),
    PlanLimitModule,
  ],
  controllers: [CrawlerController],
  providers: [PrismaService, CrawlerService, CrawlerWorker],
  exports: [CrawlerService],
})
export class CrawlerModule {}
