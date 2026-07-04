import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { IssueCategory, IssueSeverity } from '@prisma/client'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ActiveSubscriptionGuard } from '../auth/active-subscription.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { CrawlerService } from './crawler.service'

@ApiTags('Crawler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Post('projects/:id/crawl')
  @UseGuards(ActiveSubscriptionGuard)
  @ApiOperation({ summary: 'Start a manual crawl for a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  startCrawl(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.crawlerService.startCrawl(id, 'MANUAL', currentUser)
  }

  @Get('projects/:id/crawls')
  @ApiOperation({ summary: 'Get crawl history for a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  getCrawlHistory(@Param('id') id: string) {
    return this.crawlerService.getCrawlHistory(id)
  }

  @Get('crawls/:id')
  @ApiOperation({ summary: 'Get a crawl result by crawl job ID' })
  @ApiParam({ name: 'id', description: 'Crawl Job ID' })
  getCrawlResult(@Param('id') id: string) {
    return this.crawlerService.getCrawlResult(id)
  }

  @Get('crawls/:id/issues')
  @ApiOperation({ summary: 'Get SEO issues for a crawl job' })
  @ApiParam({ name: 'id', description: 'Crawl Job ID' })
  @ApiQuery({ name: 'severity', required: false, enum: IssueSeverity })
  @ApiQuery({ name: 'category', required: false, enum: IssueCategory })
  getCrawlIssues(
    @Param('id') id: string,
    @Query('severity') severity?: IssueSeverity,
    @Query('category') category?: IssueCategory,
  ) {
    return this.crawlerService.getCrawlIssues(id, { severity, category })
  }

  @Get('crawls/:id/pages')
  @ApiOperation({ summary: 'Get crawled pages for a crawl job' })
  @ApiParam({ name: 'id', description: 'Crawl Job ID' })
  getCrawledPages(@Param('id') id: string) {
    return this.crawlerService.getCrawledPages(id)
  }

  @Post('issues/:id/mark-fixed')
  @ApiOperation({ summary: 'Mark an SEO issue as fixed' })
  @ApiParam({ name: 'id', description: 'SEO Issue ID' })
  markIssueFixed(@Param('id') id: string) {
    return this.crawlerService.markIssueFixed(id)
  }

  @Get('issues/:id/guide')
  @ApiOperation({ summary: 'Get remediation guide for an SEO issue' })
  @ApiParam({ name: 'id', description: 'SEO Issue ID' })
  getIssueGuide(@Param('id') id: string) {
    return this.crawlerService.getIssueGuide(id)
  }

  // Audit aliases — web dashboard calls /projects/:id/audit instead of /projects/:id/crawl
  @Get('projects/:id/audit')
  @ApiOperation({ summary: 'Get latest audit result for project' })
  getAudit(@Param('id') id: string) {
    return this.crawlerService.getLatestAudit(id)
  }

  @Post('projects/:id/audit/start')
  @UseGuards(ActiveSubscriptionGuard)
  @ApiOperation({ summary: 'Start an audit crawl for project' })
  startAudit(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.crawlerService.startCrawl(id, 'MANUAL', currentUser)
  }

  @Get('projects/:id/audit/history')
  @ApiOperation({ summary: 'Get audit history for project' })
  getAuditHistory(@Param('id') id: string) {
    return this.crawlerService.getCrawlHistory(id)
  }
}
