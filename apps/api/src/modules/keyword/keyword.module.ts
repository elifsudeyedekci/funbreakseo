import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { KeywordService } from './keyword.service';
import { KeywordController } from './keyword.controller';
import { PrismaService } from '../../prisma.service';
import { DataForSeoModule } from '../dataforseo/dataforseo.module';

@Module({
  imports: [
    DataForSeoModule,
    BullModule.registerQueue({
      name: 'keyword-rank',
    }),
  ],
  controllers: [KeywordController],
  providers: [KeywordService, PrismaService],
  exports: [KeywordService],
})
export class KeywordModule {}
