import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(
    orgId: string,
    userId: string,
    dto: { subject: string; body: string; priority?: string; category?: string },
  ) {
    return this.prisma.supportTicket.create({
      data: {
        orgId,
        createdById: userId,
        subject: dto.subject,
        status: 'OPEN',
        priority: dto.priority ?? 'NORMAL',
        category: dto.category ?? 'GENERAL',
        messages: {
          create: {
            userId,
            body: dto.body,
            isStaff: false,
          },
        },
      },
      include: { messages: true },
    });
  }

  async addMessage(
    ticketId: string,
    userId: string,
    body: string,
    attachments?: string[],
    isStaff = false,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        userId,
        body,
        attachments: attachments ?? [],
        isStaff,
      },
    });

    // Reopen ticket if customer replied to a closed ticket
    if (!isStaff && ticket.status === 'CLOSED') {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'OPEN' },
      });
    }

    // Update ticket to waiting for reply (on staff message)
    if (isStaff) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'WAITING_CUSTOMER' },
      });
    }

    return message;
  }

  async getTickets(
    orgId: string,
    filters: { status?: string; page?: number; limit?: number },
  ) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { orgId };
    if (filters.status) where.status = filters.status;

    const [total, tickets] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return { total, page, limit, data: tickets };
  }

  async getTicket(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        organization: true,
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async updateStatus(ticketId: string, status: string) {
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status, ...(status === 'CLOSED' ? { closedAt: new Date() } : {}) },
    });
  }

  async assignTicket(ticketId: string, staffUserId: string) {
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedToId: staffUserId,
        status: 'IN_PROGRESS',
        assignedAt: new Date(),
      },
    });
  }

  async getAllTickets(
    filters: { status?: string; orgId?: string; assignedToId?: string },
    pagination: { page: number; limit: number },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (filters.status) where.status = filters.status;
    if (filters.orgId) where.orgId = filters.orgId;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;

    const [total, tickets] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
    ]);

    return { total, page, limit, data: tickets };
  }
}
