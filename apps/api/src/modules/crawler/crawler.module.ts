import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { CrawlerController } from './crawler.controller'
import { CrawlerService } from './crawler.service'
import { CrawlerWorker } from './crawler.worker'
import { PrismaService } from '../../prisma.service'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'crawler',
    }),
  ],
  controllers: [CrawlerController],
  providers: [PrismaService, CrawlerService, CrawlerWorker],
  exports: [CrawlerService],
})
export class CrawlerModule {}
