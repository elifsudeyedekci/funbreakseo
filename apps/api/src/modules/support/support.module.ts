import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import {
  SupportController,
  AdminSupportController,
} from './support.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService, PrismaService],
  exports: [SupportService],
})
export class SupportModule {}
