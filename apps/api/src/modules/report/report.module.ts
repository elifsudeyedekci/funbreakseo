import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { MonthlyReportService } from './monthly-report.service';
import { SiteAuditReportService } from './site-audit-report.service';
import { WeeklyDigestService } from './weekly-digest.service';
import { ReportController } from './report.controller';
import { AdminReportController } from './admin-report.controller';
import { PrismaService } from '../../prisma.service';
import { EmailNotificationModule } from '../email-notification/email-notification.module';
import { OutreachModule } from '../outreach/outreach.module';

@Module({
  imports: [EmailNotificationModule, OutreachModule],
  controllers: [ReportController, AdminReportController],
  providers: [ReportService, MonthlyReportService, SiteAuditReportService, PrismaService, WeeklyDigestService],
  exports: [ReportService, MonthlyReportService, SiteAuditReportService, WeeklyDigestService],
})
export class ReportModule {}
