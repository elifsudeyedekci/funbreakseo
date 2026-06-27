import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { PrismaService } from '../../prisma.service';
import { CrawlerModule } from '../crawler/crawler.module';
import { DataForSeoModule } from '../dataforseo/dataforseo.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'crawler' }),
    BullModule.registerQueue({ name: 'rank-tracking' }),
    CrawlerModule,
    DataForSeoModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService, PrismaService],
  exports: [ProjectService],
})
export class ProjectModule {}
