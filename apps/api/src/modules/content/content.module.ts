import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ContentController } from './content.controller'
import { ContentService } from './content.service'
import { ContentWorker } from './content.worker'
import { PrismaService } from '../../prisma.service'

@Module({
  imports: [BullModule.registerQueue({ name: 'content' })],
  controllers: [ContentController],
  providers: [ContentService, ContentWorker, PrismaService],
  exports: [ContentService],
})
export class ContentModule {}
