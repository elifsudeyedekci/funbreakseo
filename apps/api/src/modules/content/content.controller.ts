import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ContentStatus, ContentType } from '@prisma/client'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { ContentService } from './content.service'

export class GenerateContentDto {
  title: string = ''
  focusKeyword: string = ''
  type: ContentType = 'BLOG'
  secondaryKeywords?: string[]
  language?: string
  tone?: string
}

export class UpdateContentDto {
  title?: string
  bodyMarkdown?: string
  metaTitle?: string
  metaDescription?: string
}

@ApiTags('Content')
@UseGuards(JwtAuthGuard)
@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // POST /projects/:id/content/generate
  @Post('projects/:id/content/generate')
  async generateContent(
    @Param('id') projectId: string,
    @Body() dto: GenerateContentDto,
    @CurrentUser() user: any,
  ) {
    return this.contentService.generateContent(projectId, dto, user.id)
  }

  // GET /projects/:id/content
  @Get('projects/:id/content')
  async listContent(
    @Param('id') projectId: string,
    @Query('status') status?: ContentStatus,
    @Query('type') type?: ContentType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contentService.listContent(projectId, {
      status,
      type,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  // GET /content/:id
  @Get('content/:id')
  async getContent(@Param('id') contentId: string) {
    return this.contentService.getContent(contentId)
  }

  // PATCH /content/:id
  @Patch('content/:id')
  async updateContent(
    @Param('id') contentId: string,
    @Body() dto: UpdateContentDto,
    @CurrentUser() user: any,
  ) {
    return this.contentService.updateContent(contentId, dto, user.id)
  }

  // POST /content/:id/approve
  @Post('content/:id/approve')
  async approveContent(
    @Param('id') contentId: string,
    @CurrentUser() user: any,
  ) {
    return this.contentService.approveContent(contentId, user.id)
  }

  // POST /content/:id/reject
  @Post('content/:id/reject')
  async rejectContent(
    @Param('id') contentId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: any,
  ) {
    return this.contentService.rejectContent(contentId, user.id, body.reason)
  }

  // POST /content/:id/publish
  @Post('content/:id/publish')
  async publishContent(
    @Param('id') contentId: string,
    @Body() body: { publishedUrl?: string },
    @CurrentUser() user: any,
  ) {
    return this.contentService.publishContent(contentId, user.id, body.publishedUrl)
  }

  // POST /content/:id/regenerate-section
  @Post('content/:id/regenerate-section')
  async regenerateSection(
    @Param('id') contentId: string,
    @Body() body: { section: string; instructions?: string },
  ) {
    return this.contentService.regenerateSection(contentId, body.section, body.instructions)
  }

  // GET /content/:id/seo-geo-report
  @Get('content/:id/seo-geo-report')
  async getSeoGeoReport(@Param('id') contentId: string) {
    return this.contentService.getSeoGeoReport(contentId)
  }
}
