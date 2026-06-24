import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard
  @Get('admin/dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // Customers
  @Get('admin/customers')
  getCustomers(
    @Query('search') search?: string,
    @Query('plan') plan?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getCustomers(
      { search, plan, status },
      { page: parseInt(page), limit: parseInt(limit) },
    );
  }

  @Get('admin/customers/:id')
  getCustomer(@Param('id') id: string) {
    return this.adminService.getCustomer(id);
  }

  @Post('admin/customers/:id/suspend')
  suspendAccount(
    @Param('id') orgId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    return this.adminService.suspendAccount(orgId, user.id, reason);
  }

  @Post('admin/customers/:id/activate')
  activateAccount(@Param('id') orgId: string) {
    return this.adminService.activateAccount(orgId);
  }

  @Post('admin/customers/:id/cancel-subscription')
  cancelSubscription(
    @Param('id') orgId: string,
    @Body('immediately') immediately: boolean,
  ) {
    return this.adminService.cancelSubscription(orgId, immediately ?? false);
  }

  @Post('admin/customers/:id/refund')
  refundInvoice(
    @Param('id') _orgId: string,
    @Body('invoiceId') invoiceId: string,
    @Body('amount') amount: number,
    @Body('type') type: 'FULL' | 'PARTIAL',
  ) {
    return this.adminService.refundInvoice(invoiceId, amount, type);
  }

  @Post('admin/customers/:id/change-plan')
  changePlan(
    @Param('id') orgId: string,
    @Body('planId') planId: string,
    @Body('isComplimentary') isComplimentary: boolean,
    @Body('reason') reason: string,
    @Body('until') until?: string,
  ) {
    return this.adminService.changePlan(
      orgId,
      planId,
      isComplimentary,
      reason,
      until ? new Date(until) : undefined,
    );
  }

  @Post('admin/customers/:id/add-credit')
  addCredit(
    @Param('id') orgId: string,
    @Body('amount') amount: number,
    @Body('description') description: string,
  ) {
    return this.adminService.addCredit(orgId, amount, description);
  }

  @Post('admin/customers/:id/set-quota')
  setQuotaOverride(
    @Param('id') orgId: string,
    @Body('metric') metric: string,
    @Body('value') value: number,
  ) {
    return this.adminService.setQuotaOverride(orgId, metric, value);
  }

  @Post('admin/customers/:id/impersonate')
  impersonateUser(
    @Param('id') targetOrgId: string,
    @Body('targetUserId') targetUserId: string,
    @CurrentUser() admin: User,
  ) {
    void targetOrgId;
    return this.adminService.impersonateUser(admin.id, targetUserId);
  }

  @Post('admin/customers/:id/send-email')
  sendCustomEmail(
    @Param('id') orgId: string,
    @Body('subject') subject: string,
    @Body('body') body: string,
  ) {
    return this.adminService.sendCustomEmail(orgId, subject, body);
  }

  @Post('admin/customers/:id/set-digest-frequency')
  setDigestFrequency(
    @Param('id') orgId: string,
    @Body('frequency') frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NONE',
  ) {
    return this.adminService.setDigestFrequency(orgId, frequency);
  }

  // Consents
  @Get('admin/customers/:id/consents')
  getConsentRecords(
    @Param('id') orgId: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.getConsentRecords(orgId, {
      type,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('admin/customers/:id/consents/:consentId/pdf')
  exportConsentPdf(
    @Param('id') orgId: string,
    @Param('consentId') consentId: string,
  ) {
    return this.adminService.exportConsentsPdf(orgId, consentId);
  }

  @Get('admin/consents')
  getAllConsents(
    @Query('orgId') orgId?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.getConsentRecords(orgId ?? '', { type });
  }

  @Get('admin/consents/export-csv')
  async exportConsentsCsv(
    @Query('orgId') orgId?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const result = await this.adminService.exportConsentsCsv({
      orgId,
      type,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });

    if (res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=consents.csv');
      res.send(result.csv);
    }
    return result;
  }

  // Content / Outreach Review
  @Get('admin/content-review')
  getPendingContentReview() {
    return this.adminService.getPendingContentReview();
  }

  @Get('admin/outreach-review')
  getPendingOutreachReview() {
    return this.adminService.getPendingOutreachReview();
  }

  // Market
  @Get('admin/market/disputes')
  getMarketDisputes() {
    return this.adminService.getMarketDisputes();
  }

  // System
  @Get('admin/system/queues')
  getSystemQueues() {
    return this.adminService.getSystemQueues();
  }

  @Get('admin/system/api-usage')
  getApiUsage() {
    return this.adminService.getApiUsage();
  }

  @Get('admin/system/settings')
  getSystemSettings() {
    return this.adminService.getSystemSettings();
  }

  @Post('admin/system/settings')
  createSystemSetting(
    @Body('key') key: string,
    @Body('value') value: string,
  ) {
    return this.adminService.updateSystemSetting(key, value);
  }

  @Patch('admin/system/settings/:key')
  updateSystemSetting(
    @Param('key') key: string,
    @Body('value') value: string,
  ) {
    return this.adminService.updateSystemSetting(key, value);
  }

  // Audit logs
  @Get('admin/audit-logs')
  getAuditLogs(
    @Query('orgId') orgId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.adminService.getAuditLogs({
      orgId,
      action,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  // Plans CRUD
  @Get('admin/plans')
  getPlans() {
    return this.adminService.getPlans();
  }

  @Post('admin/plans')
  createPlan(@Body() dto: Parameters<AdminService['createPlan']>[0]) {
    return this.adminService.createPlan(dto);
  }

  @Patch('admin/plans/:id')
  updatePlan(
    @Param('id') id: string,
    @Body() dto: Parameters<AdminService['updatePlan']>[1],
  ) {
    return this.adminService.updatePlan(id, dto);
  }

  @Delete('admin/plans/:id')
  deletePlan(@Param('id') id: string) {
    return this.adminService.deletePlan(id);
  }

  // Customer health
  @Get('admin/customer-health')
  getCustomerHealth() {
    return this.adminService.getCustomerHealth();
  }
}
