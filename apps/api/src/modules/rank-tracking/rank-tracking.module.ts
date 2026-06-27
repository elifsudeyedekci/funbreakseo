import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { RankTrackingService } from './rank-tracking.service'
import { RankTrackingWorker } from './rank-tracking.worker'
import { PrismaService } from '../../prisma.service'

@Module({
  imports: [BullModule.registerQueue({
    name: 'rank-tracking',
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'fixed', delay: 30 * 60 * 1000 }, // 30 min between job retries
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  })],
  providers: [RankTrackingService, RankTrackingWorker, PrismaService],
  exports: [RankTrackingService],
})
export class RankTrackingModule {}
