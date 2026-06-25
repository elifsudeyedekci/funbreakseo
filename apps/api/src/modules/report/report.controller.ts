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
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('projects/:id/reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  listReports(@Param('id') projectId: string) {
    return this.reportService.listReports(projectId);
  }

  @Post('generate')
  generateReportPost(
    @Param('id') projectId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    const format = (dto.format as 'PDF' | 'HTML' | 'JSON') ?? 'JSON';
    return this.reportService.generateReport(projectId, format);
  }

  @Get('generate')
  generateReport(
    @Param('id') projectId: string,
    @Query('format') format: 'PDF' | 'HTML' | 'JSON' = 'JSON',
  ) {
    return this.reportService.generateReport(projectId, format);
  }

  @Get(':reportId')
  getReport(@Param('id') projectId: string, @Param('reportId') reportId: string) {
    return this.reportService.getReport(projectId, reportId);
  }

  @Get('scheduled')
  getScheduledReports(@Param('id') projectId: string) {
    return this.reportService.getScheduledReports(projectId);
  }

  @Post('scheduled')
  @Post('schedules')
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

  @Delete('scheduled/:reportId')
  @Delete('schedules/:reportId')
  deleteScheduledReport(@Param('reportId') reportId: string) {
    return this.reportService.deleteScheduledReport(reportId);
  }
}
