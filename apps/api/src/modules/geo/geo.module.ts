import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { GeoController } from './geo.controller'
import { GeoService } from './geo.service'
import { GeoAuditService } from './geo-audit.service'
import { GeoWorker } from './geo.worker'
import { PrismaService } from '../../prisma.service'
import { DataForSeoModule } from '../dataforseo/dataforseo.module'

@Module({
  imports: [BullModule.registerQueue({ name: 'geo' }), DataForSeoModule],
  controllers: [GeoController],
  providers: [GeoService, GeoAuditService, GeoWorker, PrismaService],
  exports: [GeoService, GeoAuditService],
})
export class GeoModule {}
