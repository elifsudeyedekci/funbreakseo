import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportService, ReportType } from './report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('projects/:id/reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  listReports(@Param('id') projectId: string) {
    return this.reportService.listReports(projectId);
  }

  // Static routes BEFORE :reportId param to avoid swallowing
  @Get('scheduled')
  getScheduledReports(@Param('id') projectId: string) {
    return this.reportService.getScheduledReports(projectId);
  }

  @Get('generate')
  generateReport(
    @Param('id') projectId: string,
    @Query('format') format: 'PDF' | 'HTML' | 'JSON' = 'JSON',
    @Query('type') type: ReportType = 'ALL',
  ) {
    return this.reportService.generateReport(projectId, format, type);
  }

  @Post('generate')
  generateReportPost(
    @Param('id') projectId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    const format = (dto.format as 'PDF' | 'HTML' | 'JSON') ?? 'JSON';
    const type = (dto.type as ReportType) ?? 'ALL';
    return this.reportService.generateReport(projectId, format, type);
  }

  // Accepts both /scheduled and /schedules paths via two separate handlers
  @Post('scheduled')
  createScheduledReport(
    @Param('id') projectId: string,
    @Body()
    dto: {
      format: 'PDF' | 'HTML' | 'JSON';
      schedule: string;
      recipients: string[];
    },
  ) {
    return this.reportService.createScheduledReport(projectId, dto);
  }

  @Post('schedules')
  createScheduledReportAlias(
    @Param('id') projectId: string,
    @Body()
    dto: {
      format: 'PDF' | 'HTML' | 'JSON';
      schedule: string;
      recipients: string[];
    },
  ) {
    return this.reportService.createScheduledReport(projectId, dto);
  }

  @Delete('scheduled/:reportId')
  deleteScheduledReport(@Param('reportId') reportId: string) {
    return this.reportService.deleteScheduledReport(reportId);
  }

  @Delete('schedules/:reportId')
  deleteScheduledReportAlias(@Param('reportId') reportId: string) {
    return this.reportService.deleteScheduledReport(reportId);
  }

  @Get(':reportId')
  getReport(@Param('id') projectId: string, @Param('reportId') reportId: string) {
    return this.reportService.getReport(projectId, reportId);
  }
}
