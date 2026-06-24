import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { MarketController } from './market.controller'
import { MarketService } from './market.service'
import { MarketWorker } from './market.worker'
import { PrismaService } from '../../prisma.service'

@Module({
  imports: [BullModule.registerQueue({ name: 'market' })],
  controllers: [MarketController],
  providers: [MarketService, MarketWorker, PrismaService],
  exports: [MarketService],
})
export class MarketModule {}
