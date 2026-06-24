import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { RankTrackingService } from './rank-tracking.service'
import { RankTrackingWorker } from './rank-tracking.worker'
import { PrismaService } from '../../prisma.service'

@Module({
  imports: [BullModule.registerQueue({ name: 'rank-tracking' })],
  providers: [RankTrackingService, RankTrackingWorker, PrismaService],
  exports: [RankTrackingService],
})
export class RankTrackingModule {}
