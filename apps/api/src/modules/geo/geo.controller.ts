import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { IsOptional, IsString, MinLength } from 'class-validator'
import { User } from '@prisma/client'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ActiveSubscriptionGuard } from '../auth/active-subscription.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { GeoService } from './geo.service'
import { GeoAuditService } from './geo-audit.service'
import { PrismaService } from '../../prisma.service'

export class AddGeoQueryDto {
  @IsString() @MinLength(3) prompt: string = ''
  @IsOptional() @IsString() location?: string
  @IsOptional() @IsString() language?: string
}

export class GeoHistoryQueryDto {
  @IsOptional() days?: number
}

@ApiTags('GEO')
@UseGuards(JwtAuthGuard)
@Controller()
export class GeoController {
  constructor(
    private readonly geoService: GeoService,
    private readonly geoAuditService: GeoAuditService,
    private readonly prisma: PrismaService,
  ) {}

  // POST /projects/:id/geo/queries
  @Post('projects/:id/geo/queries')
  @UseGuards(ActiveSubscriptionGuard)
  addGeoQuery(
    @Param('id') id: string,
    @Body() body: AddGeoQueryDto,
    @CurrentUser() _user: User,
  ) {
    return this.geoService.addGeoQuery(id, body)
  }

  // POST /projects/:id/geo/scan
  @Post('projects/:id/geo/scan')
  @UseGuards(ActiveSubscriptionGuard)
  triggerScan(@Param('id') id: string, @CurrentUser() _user: User) {
    return this.geoService.triggerScan(id)
  }

  // GET /projects/:id/geo/queries
  @Get('projects/:id/geo/queries')
  listGeoQueries(@Param('id') id: string, @CurrentUser() _user: User) {
    return this.geoService.listGeoQueries(id)
  }

  // DELETE /projects/:id/geo/queries/:queryId
  @Delete('projects/:id/geo/queries/:queryId')
  deleteGeoQuery(
    @Param('id') id: string,
    @Param('queryId') queryId: string,
    @CurrentUser() _user: User,
  ) {
    return this.geoService.deleteGeoQuery(id, queryId)
  }

  // GET /projects/:id/geo/queries/details
  @Get('projects/:id/geo/queries/details')
  getGeoQueryDetails(@Param('id') id: string, @CurrentUser() _user: User) {
    return this.geoService.getGeoQueryDetails(id)
  }

  // GET /projects/:id/geo/overview
  @Get('projects/:id/geo/overview')
  getGeoOverview(@Param('id') id: string, @CurrentUser() _user: User) {
    return this.geoService.getGeoOverview(id)
  }

  // GET /projects/:id/geo/competitors
  @Get('projects/:id/geo/competitors')
  getGeoCompetitors(@Param('id') id: string, @CurrentUser() _user: User) {
    return this.geoService.getGeoCompetitors(id)
  }

  // GET /projects/:id/geo/recommendations
  @Get('projects/:id/geo/recommendations')
  getGeoRecommendations(@Param('id') id: string, @CurrentUser() _user: User) {
    return this.geoService.getGeoRecommendations(id)
  }

  // GET /projects/:id/geo/history
  @Get('projects/:id/geo/history')
  getGeoHistory(
    @Param('id') id: string,
    @Query() query: GeoHistoryQueryDto,
    @CurrentUser() _user: User,
  ) {
    return this.geoService.getGeoHistory(id, query.days ? Number(query.days) : 30)
  }

  // GET /projects/:id/geo/audit
  @Get('projects/:id/geo/audit')
  async getGeoAudit(@Param('id') id: string, @CurrentUser() _user: User) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { domain: true },
    })
    if (!project) {
      // Preserve existing controller convention of letting the service layer
      // raise NotFoundException where relevant; here there's nothing to
      // delegate to, so surface an empty audit rather than throwing.
      return this.geoAuditService.analyzeGeoAudit(id)
    }

    const latestCrawlJob = await this.prisma.crawlJob.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (latestCrawlJob) {
      return this.geoAuditService.analyzeAndPersistGeoAudit(id, latestCrawlJob.id, project.domain)
    }

    // No crawl exists yet — return a pure preview, nothing persisted.
    return this.geoAuditService.analyzeGeoAudit(project.domain)
  }

  // GET /projects/:id/geo/ai-overview-tracking
  @Get('projects/:id/geo/ai-overview-tracking')
  getAiOverviewTracking(@Param('id') id: string, @CurrentUser() _user: User) {
    return this.geoAuditService.getAiOverviewTracking(id)
  }
}
