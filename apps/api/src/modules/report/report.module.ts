import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { MonthlyReportService } from './monthly-report.service';
import { ReportController } from './report.controller';
import { AdminReportController } from './admin-report.controller';
import { PrismaService } from '../../prisma.service';
import { EmailNotificationModule } from '../email-notification/email-notification.module';

@Module({
  imports: [EmailNotificationModule],
  controllers: [ReportController, AdminReportController],
  providers: [ReportService, MonthlyReportService, PrismaService],
  exports: [ReportService, MonthlyReportService],
})
export class ReportModule {}
