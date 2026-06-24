import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { PrismaService } from '../../prisma.service';
import { EmailNotificationModule } from '../email-notification/email-notification.module';

@Module({
  imports: [EmailNotificationModule],
  controllers: [PublicController],
  providers: [PublicService, PrismaService],
  exports: [PublicService],
})
export class PublicModule {}
