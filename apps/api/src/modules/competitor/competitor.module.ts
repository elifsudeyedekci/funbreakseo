import { Module } from '@nestjs/common';
import { CompetitorService } from './competitor.service';
import { CompetitorController } from './competitor.controller';
import { DataForSeoModule } from '../dataforseo/dataforseo.module';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [DataForSeoModule],
  controllers: [CompetitorController],
  providers: [CompetitorService, PrismaService],
  exports: [CompetitorService],
})
export class CompetitorModule {}
