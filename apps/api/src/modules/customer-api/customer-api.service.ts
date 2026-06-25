import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { randomBytes, createHash } from 'crypto';

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
        revokedAt: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  }

  async createApiKey(orgId: string, name: string) {
    const rawKey = `fbs_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const record = await this.prisma.developerApiKey.create({
      data: {
        organizationId: orgId,
        name,
        keyHash,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    // Return the raw key only on creation – never stored again
    return { ...record, key: rawKey };
  }

  async revokeApiKey(keyId: string, orgId: string) {
    await this.prisma.developerApiKey.updateMany({
      where: { id: keyId, organizationId: orgId },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  // -------------------------------------------------------------------------
  // V1 API endpoints
  // -------------------------------------------------------------------------
  async getProjects(orgId: string) {
    return this.prisma.project.findMany({
      where: { organizationId: orgId },
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
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.keyword.findMany({
      where: { projectId },
      select: {
        id: true,
        phrase: true,
        language: true,
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
      where: { id: projectId, organizationId: orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.keywordRank.findMany({
      where: { keyword: { projectId } },
      orderBy: { checkedAt: 'desc' },
      take: limit,
      include: {
        keyword: { select: { phrase: true, language: true } },
      },
    });
  }
}
