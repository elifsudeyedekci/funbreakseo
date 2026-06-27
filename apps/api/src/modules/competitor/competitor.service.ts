import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DataForSeoService } from '../dataforseo/dataforseo.service';

@Injectable()
export class CompetitorService {
  private readonly logger = new Logger(CompetitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dfs: DataForSeoService,
  ) {}

  private cleanDomain(url: string): string {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').split('/')[0];
  }

  private async getProject(projectId: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async findCompetitors(projectId: string, organizationId: string) {
    const project = await this.getProject(projectId, organizationId);
    const domain = this.cleanDomain(project.domain);

    // Get from DataForSEO
    const fromDfs = await this.dfs.getCompetitorDomains(domain, 10);

    // Upsert into DB
    for (const c of fromDfs) {
      if (!c.domain) continue;
      try {
        await this.prisma.competitor.upsert({
          where: { projectId_domain: { projectId, domain: c.domain } },
          update: {
            avgPosition: c.avgPosition ?? undefined,
            commonKeywords: c.intersections ?? 0,
            isAuto: true,
          },
          create: {
            projectId,
            domain: c.domain,
            avgPosition: c.avgPosition ?? undefined,
            commonKeywords: c.intersections ?? 0,
            isAuto: true,
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to upsert competitor ${c.domain}`, err);
      }
    }

    // Return merged list (DB + fresh DFS data)
    const dbCompetitors = await this.prisma.competitor.findMany({
      where: { projectId },
      orderBy: { commonKeywords: 'desc' },
    });

    const dfsMap = new Map(fromDfs.map((c) => [c.domain, c]));
    return dbCompetitors.map((c) => ({
      ...c,
      etv: dfsMap.get(c.domain)?.etv ?? null,
    }));
  }

  async compareWithCompetitor(projectId: string, organizationId: string, competitorDomain: string) {
    const project = await this.getProject(projectId, organizationId);
    const domain = this.cleanDomain(project.domain);
    const cleanCompetitor = this.cleanDomain(competitorDomain);

    return this.dfs.getDomainIntersection(domain, cleanCompetitor, 50);
  }

  async addCompetitor(projectId: string, organizationId: string, domain: string) {
    await this.getProject(projectId, organizationId);
    const cleanDomain = this.cleanDomain(domain);
    return this.prisma.competitor.upsert({
      where: { projectId_domain: { projectId, domain: cleanDomain } },
      update: {},
      create: { projectId, domain: cleanDomain, isAuto: false },
    });
  }

  async removeCompetitor(projectId: string, organizationId: string, competitorId: string) {
    await this.getProject(projectId, organizationId);
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: competitorId, projectId },
    });
    if (!competitor) throw new NotFoundException('Competitor not found');
    await this.prisma.competitor.delete({ where: { id: competitorId } });
    return { message: 'Competitor removed' };
  }
}
