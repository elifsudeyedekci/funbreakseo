import { Module } from '@nestjs/common';
import { AbTestService } from './ab-test.service';
import { AbTestController } from './ab-test.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [AbTestController],
  providers: [AbTestService, PrismaService],
  exports: [AbTestService],
})
export class AbTestModule {}
