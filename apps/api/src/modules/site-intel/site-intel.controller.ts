import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ActiveSubscriptionGuard } from '../auth/active-subscription.guard'
import { PrismaService } from '../../prisma.service'
import { SiteIntelService } from './site-intel.service'

@ApiTags('Site Intel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActiveSubscriptionGuard)
@Controller()
export class SiteIntelController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteIntelService: SiteIntelService,
  ) {}

  @Get('projects/:id/site-intel')
  @ApiOperation({
    summary: 'Get site intelligence report (usability, social, technology, local SEO) for a project',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  async getSiteIntel(@Param('id') id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } })
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`)
    }

    const crawlJob = await this.prisma.crawlJob.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    })

    if (crawlJob) {
      return this.siteIntelService.analyzeAndPersist(id, crawlJob.id, project.domain)
    }

    return this.siteIntelService.analyze(project.domain)
  }
}
