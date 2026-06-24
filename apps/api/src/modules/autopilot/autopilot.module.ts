import { Module } from '@nestjs/common';
import { AutopilotService } from './autopilot.service';
import { AutopilotController } from './autopilot.controller';
import { AutopilotWorker } from './autopilot.worker';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [AutopilotController],
  providers: [AutopilotService, AutopilotWorker, PrismaService],
  exports: [AutopilotService],
})
export class AutopilotModule {}
