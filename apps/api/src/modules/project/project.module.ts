import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { PrismaService } from '../../prisma.service';
import { CrawlerModule } from '../crawler/crawler.module';
import { DataForSeoModule } from '../dataforseo/dataforseo.module';
import { CompetitorModule } from '../competitor/competitor.module';
import { GeoModule } from '../geo/geo.module';
import { OutreachModule } from '../outreach/outreach.module';
import { KeywordModule } from '../keyword/keyword.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'crawler' }),
    BullModule.registerQueue({ name: 'rank-tracking' }),
    CrawlerModule,
    DataForSeoModule,
    CompetitorModule,
    GeoModule,
    OutreachModule,
    KeywordModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService, PrismaService],
  exports: [ProjectService],
})
export class ProjectModule {}
