import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { User, UserRole } from '@prisma/client';

// ---- Customer routes ----
@Controller('support/tickets')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  getTickets(
    @CurrentUser() user: User,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.supportService.getTickets(user.organizationId!, {
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  @Post()
  createTicket(
    @CurrentUser() user: User,
    @Body()
    dto: {
      subject: string;
      body: string;
      priority?: string;
      category?: string;
    },
  ) {
    return this.supportService.createTicket(user.organizationId!, user.id, dto);
  }

  @Get(':id')
  getTicket(@Param('id') id: string) {
    return this.supportService.getTicket(id);
  }

  @Post(':id/messages')
  addMessage(
    @Param('id') ticketId: string,
    @Body('body') body: string,
    @Body('attachments') attachments: string[],
    @CurrentUser() user: User,
  ) {
    return this.supportService.addMessage(
      ticketId,
      user.id,
      body,
      attachments,
      false,
    );
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.supportService.updateStatus(id, status);
  }
}

// ---- Admin routes ----
@Controller('admin/support/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  getAllTickets(
    @Query('status') status?: string,
    @Query('orgId') orgId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.supportService.getAllTickets(
      { status, orgId, assignedToId },
      { page: parseInt(page), limit: parseInt(limit) },
    );
  }

  @Post(':id/assign')
  assignTicket(
    @Param('id') ticketId: string,
    @Body('staffUserId') staffUserId: string,
  ) {
    return this.supportService.assignTicket(ticketId, staffUserId);
  }

  @Post(':id/reply')
  adminReply(
    @Param('id') ticketId: string,
    @Body('body') body: string,
    @Body('attachments') attachments: string[],
    @CurrentUser() user: User,
  ) {
    return this.supportService.addMessage(
      ticketId,
      user.id,
      body,
      attachments,
      true,
    );
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.supportService.updateStatus(id, status);
  }
}
