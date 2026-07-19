import { Module } from '@nestjs/common';
import { PlanLimitService } from './plan-limit.service';
import { PrismaService } from '../../prisma.service';

@Module({
  providers: [PlanLimitService, PrismaService],
  exports: [PlanLimitService],
})
export class PlanLimitModule {}
