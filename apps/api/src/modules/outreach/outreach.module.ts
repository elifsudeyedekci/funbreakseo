import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { OutreachController } from './outreach.controller'
import { OutreachService } from './outreach.service'
import { OutreachWorker } from './outreach.worker'
import { PrismaService } from '../../prisma.service'

@Module({
  imports: [BullModule.registerQueue({ name: 'outreach' })],
  controllers: [OutreachController],
  providers: [OutreachService, OutreachWorker, PrismaService],
  exports: [OutreachService],
})
export class OutreachModule {}
