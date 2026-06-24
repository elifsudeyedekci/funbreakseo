import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class CustomerApiService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Developer API Key management
  // -------------------------------------------------------------------------
  async getApiKeys(orgId: string) {
    return this.prisma.developerApiKey.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        key: true,
        isActive: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  }

  async createApiKey(orgId: string, name: string) {
    const key = `fbs_${randomBytes(32).toString('hex')}`;

    return this.prisma.developerApiKey.create({
      data: {
        organizationId: orgId,
        name,
        key,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        key: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async revokeApiKey(keyId: string, orgId: string) {
    await this.prisma.developerApiKey.updateMany({
      where: { id: keyId, organizationId: orgId },
      data: { isActive: false },
    });
    return { success: true };
  }

  // -------------------------------------------------------------------------
  // V1 API endpoints
  // -------------------------------------------------------------------------
  async getProjects(orgId: string) {
    return this.prisma.project.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        domain: true,
        createdAt: true,
      },
    });
  }

  async getProjectKeywords(projectId: string, orgId: string) {
    // Verify ownership
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.keyword.findMany({
      where: { projectId },
      select: {
        id: true,
        keyword: true,
        locale: true,
        searchVolume: true,
        difficulty: true,
      },
    });
  }

  async getProjectRanks(
    projectId: string,
    orgId: string,
    limit = 50,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.rankHistory.findMany({
      where: { keyword: { projectId } },
      orderBy: { checkedAt: 'desc' },
      take: limit,
      include: {
        keyword: { select: { keyword: true, locale: true } },
      },
    });
  }
}
