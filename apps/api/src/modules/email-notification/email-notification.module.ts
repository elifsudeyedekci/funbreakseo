import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { DigestService } from './digest.service';
import { PrismaService } from '../../prisma.service';

@Module({
  providers: [EmailService, DigestService, PrismaService],
  exports: [EmailService, DigestService],
})
export class EmailNotificationModule {}
