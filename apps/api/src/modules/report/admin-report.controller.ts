import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MonthlyReportService } from './monthly-report.service';

/**
 * Admin: istediği müşterinin aylık raporunu ANLIK verilerle üretir/indirir.
 */
@Controller('admin/reports')
@UseGuards(JwtAuthGuard)
export class AdminReportController {
  constructor(private readonly monthlyReport: MonthlyReportService) {}

  private assertAdmin(user: User): void {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'STAFF') {
      throw new ForbiddenException('Yalnızca yöneticiler erişebilir');
    }
  }

  @Get(':projectId/monthly-pdf')
  async downloadMonthlyPdf(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    this.assertAdmin(user);
    const data = await this.monthlyReport.buildReportData(projectId);
    const html = this.monthlyReport.renderHtml(data);
    const pdf = await this.monthlyReport.generatePdf(html);

    if (pdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="funbreakseo-rapor-${data.project.domain}-${data.period.start.slice(0, 7)}.pdf"`,
      );
      res.send(pdf);
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    }
  }

  @Get(':projectId/monthly-data')
  async getMonthlyData(@Param('projectId') projectId: string, @CurrentUser() user: User) {
    this.assertAdmin(user);
    return this.monthlyReport.buildReportData(projectId);
  }
}
