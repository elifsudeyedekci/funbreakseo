import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { OrgMemberRole, UsageMetric } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface UpdateOrgDto {
  name?: string;
  taxNumber?: string;
  taxOffice?: string;
  billingAddress?: string;
  country?: string;
}

export interface InviteMemberDto {
  email: string;
  role: OrgMemberRole;
}

export interface UpdateMemberRoleDto {
  memberId: string;
  role: OrgMemberRole;
}

@Injectable()
export class OrgService {
  private readonly mailer: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.mailer = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
  }

  async getOrg(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: { include: { plan: true } },
        billingProfile: true,
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async updateOrg(organizationId: string, dto: UpdateOrgDto) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: dto,
    });
  }

  async getMembers(organizationId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            status: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteMember(organizationId: string, dto: InviteMemberDto) {
    // Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Create placeholder user and send invite
      const inviteToken = crypto.randomBytes(32).toString('hex');
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          fullName: dto.email.split('@')[0],
          passwordHash: '',
          emailVerifyToken: `invite:${inviteToken}`,
          status: 'PENDING',
          organizationId,
        },
      });
    }

    // Check if already a member
    const existing = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: user.id },
      },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    // Check membership limit from plan
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { subscription: { include: { plan: true } } },
    });

    const memberCount = await this.prisma.organizationMember.count({
      where: { organizationId },
    });

    const limits = org.subscription?.plan?.limits as Record<string, number> | null;
    const memberLimit = limits?.['members'] ?? 5;

    if (memberCount >= memberLimit) {
      throw new ForbiddenException(
        `Member limit (${memberLimit}) reached for your plan`,
      );
    }

    const member = await this.prisma.organizationMember.create({
      data: { organizationId, userId: user.id, role: dto.role },
      include: { user: true },
    });

    // Send invite email
    const baseUrl = this.config.get<string>(
      'APP_BASE_URL',
      'https://app.funbreakseo.com',
    );
    await this.mailer.sendMail({
      from: `"FunBreak SEO" <${this.config.get('SMTP_FROM', 'noreply@funbreakseo.com')}>`,
      to: dto.email,
      subject: `${org.name} sizi davet ediyor`,
      html: `<p>${org.name} organizasyonuna katılmak için <a href="${baseUrl}/accept-invite">buraya tıklayın</a>.</p>`,
    });

    return member;
  }

  async removeMember(organizationId: string, memberId: string, requestorId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
      include: { user: true },
    });

    if (!member) throw new NotFoundException('Member not found');

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });

    if (org.ownerUserId === member.userId) {
      throw new ForbiddenException('Cannot remove the organization owner');
    }

    if (member.userId === requestorId) {
      throw new BadRequestException('Cannot remove yourself');
    }

    await this.prisma.organizationMember.delete({ where: { id: memberId } });

    // Remove user's org association if they have no other membership
    const otherMemberships = await this.prisma.organizationMember.count({
      where: { userId: member.userId },
    });

    if (otherMemberships === 0) {
      await this.prisma.user.update({
        where: { id: member.userId },
        data: { organizationId: null },
      });
    }

    return { message: 'Member removed' };
  }

  async updateMemberRole(
    organizationId: string,
    memberId: string,
    role: OrgMemberRole,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
    });

    if (!member) throw new NotFoundException('Member not found');

    if (member.role === 'OWNER') {
      throw new ForbiddenException('Cannot change role of owner');
    }

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role },
    });
  }

  async getUsage(organizationId: string) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { subscription: { include: { plan: true } } },
    });

    const limits = (org.subscription?.plan?.limits as Record<string, number>) ?? {};

    const metrics = Object.values(UsageMetric);
    const result: Record<string, { used: number; limit: number; percent: number }> = {};

    for (const metric of metrics) {
      const record = await this.prisma.usageRecord.findFirst({
        where: {
          organizationId,
          metric,
          periodStart: { gte: periodStart },
        },
        orderBy: { createdAt: 'desc' },
      });

      const used = record?.value ?? 0;
      const limit = limits[metric.toLowerCase()] ?? 0;
      const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;

      result[metric] = { used, limit, percent };
    }

    // Projects count
    const projectCount = await this.prisma.project.count({
      where: { organizationId, deletedAt: null },
    });

    const projectLimit = limits['projects'] ?? 0;

    result['PROJECTS'] = {
      used: projectCount,
      limit: projectLimit,
      percent: projectLimit > 0 ? Math.round((projectCount / projectLimit) * 100) : 0,
    };

    return result;
  }
}
