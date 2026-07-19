import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ActiveSubscriptionGuard } from '../auth/active-subscription.guard'
import { PrismaService } from '../../prisma.service'
import { PerformanceService } from './performance.service'

@ApiTags('Performance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PerformanceController {
  constructor(
    private readonly performanceService: PerformanceService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('projects/:id/performance')
  @UseGuards(ActiveSubscriptionGuard)
  @ApiOperation({ summary: 'Run (and persist, if a crawl exists) a PageSpeed-grade performance audit for a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  async getPerformance(@Param('id') id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } })
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`)
    }

    const latestCrawlJob = await this.prisma.crawlJob.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    })

    if (!latestCrawlJob) {
      // No crawl to attach to yet — return a best-effort report without persisting.
      return this.performanceService.analyze(project.domain)
    }

    return this.performanceService.analyzeAndPersist(id, latestCrawlJob.id, project.domain)
  }
}
