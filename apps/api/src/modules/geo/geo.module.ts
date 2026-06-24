import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { GeoController } from './geo.controller'
import { GeoService } from './geo.service'
import { GeoWorker } from './geo.worker'
import { PrismaService } from '../../prisma.service'

@Module({
  imports: [BullModule.registerQueue({ name: 'geo' })],
  controllers: [GeoController],
  providers: [GeoService, GeoWorker, PrismaService],
  exports: [GeoService],
})
export class GeoModule {}
