import { Module } from '@nestjs/common'
import { PerformanceController } from './performance.controller'
import { PerformanceService } from './performance.service'
import { PrismaService } from '../../prisma.service'

@Module({
  controllers: [PerformanceController],
  providers: [PrismaService, PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}
