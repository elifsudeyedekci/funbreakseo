import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { User } from '@prisma/client';
import { ReportService, ReportType } from './report.service';
import { MonthlyReportService } from './monthly-report.service';
import { SiteAuditReportService } from './site-audit-report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrismaService } from '../../prisma.service';

@Controller('projects/:id/reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly monthlyReport: MonthlyReportService,
    private readonly siteAuditReport: SiteAuditReportService,
    private readonly prisma: PrismaService,
  ) {}

  /** Proje bu kullanıcının organizasyonuna ait mi? (org izolasyonu) */
  private async assertAccess(projectId: string, user: User): Promise<void> {
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return;
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: user.organizationId ?? '__none__' },
      select: { id: true },
    });
    if (!project) throw new ForbiddenException('Bu projeye erişim yetkiniz yok');
  }

  /** Aylık profesyonel PDF rapor — "Rapor İndir" butonu */
  @Get('monthly-pdf')
  async downloadMonthlyPdf(
    @Param('id') projectId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    await this.assertAccess(projectId, user);
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
      // Sunucuda PDF motoru kullanılamıyorsa raporu yazdırılabilir HTML olarak ver
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    }
  }

  /** Tam site denetimi PDF'i — audit sayfasındaki "PDF Olarak İndir" butonu */
  @Get('site-audit-pdf')
  async downloadSiteAuditPdf(
    @Param('id') projectId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    await this.assertAccess(projectId, user);
    const data = await this.siteAuditReport.buildData(projectId);
    const html = this.siteAuditReport.renderHtml(data);
    const pdf = await this.siteAuditReport.generatePdf(html);

    if (pdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="site-denetimi-${data.project.domain}-${new Date().toISOString().slice(0, 10)}.pdf"`,
      );
      res.send(pdf);
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    }
  }

  /** Günlük kelime raporu PDF'i — panelden istek üzerine */
  @Get('keywords-pdf')
  async downloadKeywordPdf(
    @Param('id') projectId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    await this.assertAccess(projectId, user);
    const data = await this.monthlyReport.buildReportData(projectId);
    const emailHtml = this.monthlyReport.buildKeywordEmailHtml(data.project.domain, data.keywords.movers, {
      total: data.keywords.total,
      inTop10: data.keywords.inTop10,
      avg: data.keywords.avgPosition,
    });
    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/></head><body style="margin:0;padding:24px;background:#fff">${emailHtml}</body></html>`;
    const pdf = await this.monthlyReport.generatePdf(html);

    if (pdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="funbreakseo-kelime-raporu-${data.project.domain}-${new Date().toISOString().slice(0, 10)}.pdf"`,
      );
      res.send(pdf);
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    }
  }

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
