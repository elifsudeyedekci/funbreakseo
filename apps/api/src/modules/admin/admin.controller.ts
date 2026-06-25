import {
  Controller,
  Get,
  Post,
  Put,
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
    @CurrentUser() admin: User,
  ) {
    return this.adminService.impersonateByOrg(admin.id, targetOrgId);
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
    @Body('frequency') frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'OFF',
  ) {
    return this.adminService.setDigestFrequency(orgId, frequency);
  }

  // Consents
  @Get('admin/customers/:id/subscription')
  getCustomerSubscription(@Param('id') orgId: string) {
    return this.adminService.getCustomerSubscription(orgId);
  }

  @Get('admin/customers/:id/invoices')
  getCustomerInvoices(@Param('id') orgId: string) {
    return this.adminService.getCustomerInvoices(orgId);
  }

  @Get('admin/customers/:id/usage')
  getCustomerUsage(@Param('id') orgId: string) {
    return this.adminService.getCustomerUsage(orgId);
  }

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

  // ─── System health aliases (short paths used by admin pages) ────────────────

  @Get('admin/system-health')
  getSystemHealth() {
    return this.adminService.getSystemHealthStatus();
  }

  @Get('admin/queue-health')
  getQueueHealth() {
    return this.adminService.getSystemQueues();
  }

  @Post('admin/queue-health/:name/retry')
  retryQueueJobs(@Param('name') name: string) {
    return this.adminService.retryQueueJobs(name);
  }

  @Post('admin/queue-health/:name/clean')
  cleanQueueJobs(@Param('name') name: string) {
    return this.adminService.cleanQueueJobs(name);
  }

  @Get('admin/settings')
  getSettings() {
    return this.adminService.getSystemSettings();
  }

  // Must be BEFORE /:key to avoid NestJS treating "api-keys" as a :key param
  @Get('admin/settings/api-keys')
  getApiKeys() {
    return this.adminService.getApiKeyStatus();
  }

  @Patch('admin/settings/:key')
  updateSettings(@Param('key') key: string, @Body('value') value: string) {
    return this.adminService.updateSystemSetting(key, value);
  }

  @Post('admin/integrations/:provider/test')
  testIntegration(@Param('provider') provider: string) {
    return this.adminService.testIntegration(provider);
  }

  @Get('admin/api-usage')
  getApiUsageAlias() {
    return this.adminService.getApiUsage();
  }

  // ─── Revenue / Finance ───────────────────────────────────────────────────────

  @Get('admin/revenue')
  getRevenue() {
    return this.adminService.getRevenue();
  }

  @Put('admin/finance/settings')
  updateFinanceSettings(@Body() dto: Record<string, unknown>) {
    return this.adminService.updateFinanceSettings(dto);
  }

  @Get('admin/invoices')
  getAllInvoices(
    @Query('page') page = '1',
    @Query('limit') limit = '100',
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllInvoices(parseInt(page), parseInt(limit), status);
  }

  @Post('admin/invoices/:id/refund')
  refundAdminInvoice(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    const amount = Number(dto.amount ?? 0);
    const type: 'FULL' | 'PARTIAL' = dto.partial ? 'PARTIAL' : 'FULL';
    return this.adminService.refundInvoice(id, amount, type);
  }

  // ─── Coupons ─────────────────────────────────────────────────────────────────

  @Get('admin/coupons')
  getCoupons() {
    return this.adminService.getCoupons();
  }

  @Post('admin/coupons')
  createCoupon(@Body() dto: Record<string, unknown>) {
    return this.adminService.createCoupon(dto);
  }

  @Delete('admin/coupons/:id')
  deleteCoupon(@Param('id') id: string) {
    return this.adminService.deleteCoupon(id);
  }

  // ─── Subscriptions (admin view) ───────────────────────────────────────────────

  @Get('admin/subscriptions')
  getAllSubscriptions(@Query('page') page = '1', @Query('limit') limit = '50') {
    return this.adminService.getAllSubscriptions(parseInt(page), parseInt(limit));
  }

  @Post('admin/subscriptions/:id/suspend')
  suspendSubscription(@Param('id') id: string) {
    return this.adminService.suspendSubscription(id);
  }

  // ─── Staff management ─────────────────────────────────────────────────────────

  @Get('admin/staff')
  getStaff() {
    return this.adminService.getStaff();
  }

  @Post('admin/staff')
  createStaff(@Body() dto: Record<string, unknown>) {
    return this.adminService.createStaff(dto);
  }

  @Put('admin/staff/:id')
  updateStaff(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.adminService.updateStaff(id, dto);
  }

  // ─── Affiliates (admin view) ──────────────────────────────────────────────────

  @Get('admin/affiliates')
  getAffiliates() {
    return this.adminService.getAffiliates();
  }

  @Get('admin/affiliates/payouts')
  getAffiliatePendingPayouts() {
    return this.adminService.getAffiliatePendingPayouts();
  }

  @Post('admin/affiliates/payouts/:id/approve')
  approveAffiliatePayout(@Param('id') id: string) {
    return this.adminService.approveAffiliatePayout(id);
  }

  // ─── Testimonials ─────────────────────────────────────────────────────────────

  @Get('admin/testimonials')
  getTestimonials() {
    return this.adminService.getTestimonials();
  }

  @Post('admin/testimonials/:id/approve')
  approveTestimonial(@Param('id') id: string) {
    return this.adminService.approveTestimonial(id);
  }

  @Post('admin/testimonials/:id/feature')
  featureTestimonial(@Param('id') id: string) {
    return this.adminService.featureTestimonial(id);
  }

  // ─── Marketing ────────────────────────────────────────────────────────────────

  @Get('admin/marketing/campaigns')
  getEmailCampaigns() {
    return this.adminService.getEmailCampaigns();
  }

  @Post('admin/marketing/campaigns')
  createEmailCampaign(@Body() dto: Record<string, unknown>) {
    return this.adminService.createEmailCampaign(dto);
  }

  @Get('admin/marketing/case-studies')
  getCaseStudies() {
    return this.adminService.getCaseStudies();
  }

  // ─── Cost control ─────────────────────────────────────────────────────────────

  @Get('admin/cost-control')
  getCostControl() {
    return this.adminService.getCostControl();
  }

  @Patch('admin/cost-control/:id')
  updateCostControl(
    @Param('id') id: string,
    @Body('limit') limit: number,
    @Body('behavior') behavior: string,
  ) {
    return this.adminService.updateCostControl(id, limit, behavior);
  }

  @Put('admin/cost-control/kill-switch')
  toggleKillSwitch(@Body() dto: Record<string, unknown>) {
    return this.adminService.toggleKillSwitch(dto);
  }

  // ─── Legal documents ─────────────────────────────────────────────────────────

  @Get('admin/legal-docs')
  getLegalDocs() {
    return this.adminService.getLegalDocs();
  }

  @Patch('admin/legal-docs/:id')
  updateLegalDoc(@Param('id') id: string, @Body('content') content: string) {
    return this.adminService.updateLegalDoc(id, content);
  }

  // ─── Blog (admin CRUD) ────────────────────────────────────────────────────────

  @Get('admin/blog')
  getBlogPosts(@Query() params: Record<string, string>) {
    return this.adminService.getBlogPosts(params);
  }

  @Post('admin/blog')
  createBlogPost(@Body() dto: Record<string, unknown>) {
    return this.adminService.createBlogPost(dto);
  }

  @Put('admin/blog/:id')
  updateBlogPost(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.adminService.updateBlogPost(id, dto);
  }

  @Patch('admin/blog/:id')
  patchBlogPost(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.adminService.updateBlogPost(id, dto);
  }

  @Delete('admin/blog/:id')
  deleteBlogPost(@Param('id') id: string) {
    return this.adminService.deleteBlogPost(id);
  }

  // ─── Market listings approve/reject ──────────────────────────────────────────

  @Post('admin/market/listings/:id/approve')
  approveListing(@Param('id') id: string) {
    return this.adminService.approveListing(id);
  }

  @Post('admin/market/listings/:id/reject')
  rejectListing(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.adminService.rejectListing(id, reason);
  }

  @Get('admin/market/orders')
  getBacklinkOrders() {
    return this.adminService.getBacklinkOrders();
  }

  @Post('admin/market/orders/:id/verify')
  verifyBacklinkOrder(@Param('id') id: string) {
    return this.adminService.verifyBacklinkOrder(id);
  }

  @Get('admin/market/listings')
  getMarketListings() {
    return this.adminService.getMarketListings();
  }

  // ─── Support (admin overrides)  ───────────────────────────────────────────────

  @Get('admin/support/tickets')
  getSupportTickets(@Query() params: Record<string, string>) {
    return this.adminService.getSupportTickets(params);
  }

  @Get('admin/support/tickets/:id')
  getSupportTicket(@Param('id') id: string) {
    return this.adminService.getSupportTicket(id);
  }

  @Patch('admin/support/tickets/:id')
  updateSupportTicket(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.adminService.updateSupportTicket(id, dto);
  }

  @Post('admin/support/tickets/:id/reply')
  replySupportTicket(@Param('id') id: string, @Body('message') message: string) {
    return this.adminService.replySupportTicket(id, message);
  }

  // ─── Analytics ────────────────────────────────────────────────────────────────

  @Get('admin/analytics')
  getAnalytics() {
    return this.adminService.getAnalytics();
  }

  // ─── Customers audit log ──────────────────────────────────────────────────────

  @Get('admin/customers/:id/audit-log')
  getCustomerAuditLog(@Param('id') orgId: string) {
    return this.adminService.getAuditLogs({ orgId });
  }
}
