import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  IsHexColor,
  IsBoolean,
  MinLength,
} from 'class-validator';
import { TrackingDepth, User } from '@prisma/client';
import { KeywordService } from './keyword.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class AddKeywordsDto {
  @IsArray()
  @IsString({ each: true })
  phrases!: string[];

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsEnum(TrackingDepth)
  trackingDepth?: TrackingDepth;

  @IsOptional()
  @IsBoolean()
  skipLimit?: boolean;

  @IsOptional()
  @IsString()
  tagId?: string;
}

export class KeywordResearchDto {
  @IsArray()
  @IsString({ each: true })
  seedKeywords!: string[];

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  language?: string;
}

export class CreateTagDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Keywords')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller()
export class KeywordController {
  constructor(private readonly keywordService: KeywordService) {}

  @Get('projects/:projectId/keywords')
  @ApiOperation({ summary: 'List keywords for a project' })
  async findAll(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
  ) {
    return this.keywordService.findAll(projectId, user.organizationId!);
  }

  @Post('projects/:projectId/keywords')
  @ApiOperation({ summary: 'Bulk add keywords to a project' })
  async addKeywords(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Body() dto: AddKeywordsDto,
  ) {
    return this.keywordService.addKeywords(projectId, user.organizationId!, dto);
  }

  @Delete('projects/:projectId/keywords/:id')
  @ApiOperation({ summary: 'Delete a keyword' })
  async remove(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.keywordService.remove(id, projectId, user.organizationId!);
  }

  @Get('keywords/:id/history')
  @ApiOperation({ summary: 'Get rank history for a keyword' })
  async getHistory(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.keywordService.getHistory(id, user.organizationId!);
  }

  @Post('keywords/research')
  @ApiOperation({ summary: 'Research keywords with DataForSEO suggestions' })
  async research(
    @CurrentUser() user: User,
    @Body() dto: KeywordResearchDto,
  ) {
    return this.keywordService.research(
      dto.seedKeywords,
      dto.location ?? 'Turkey',
      dto.language ?? 'tr',
      user.organizationId!,
    );
  }

  @Get('projects/:projectId/keywords/summary')
  @ApiOperation({ summary: 'Get keyword position distribution and visibility score' })
  async getSummary(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
  ) {
    return this.keywordService.getSummary(projectId, user.organizationId!);
  }

  @Post('keywords/:id/refresh-rank')
  @ApiOperation({ summary: 'Queue an immediate rank check for a keyword' })
  async refreshRank(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.keywordService.refreshRank(id, user.organizationId!);
  }

  @Post('projects/:projectId/keywords/refresh-metrics')
  @ApiOperation({ summary: 'Refresh DataForSEO metrics for all keywords in project' })
  async refreshMetrics(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
  ) {
    return this.keywordService.refreshAllKeywordMetrics(projectId, user.organizationId!);
  }

  @Post('projects/:projectId/keywords/refresh-ranks')
  @ApiOperation({ summary: 'Queue SERP position checks for all keywords in project' })
  async refreshRanks(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
  ) {
    return this.keywordService.refreshAllRanks(projectId, user.organizationId!);
  }

  @Get('projects/:projectId/keywords/suggestions')
  @ApiOperation({ summary: 'Get AI-powered keyword suggestions for project domain' })
  async getSuggestions(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
  ) {
    return this.keywordService.suggestKeywordsForDomain(projectId, user.organizationId!);
  }

  @Get('projects/:projectId/keywords/discover')
  @ApiOperation({ summary: 'Discover keywords from project domain via DataForSEO Labs (no seed required)' })
  async discoverKeywords(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
  ) {
    return this.keywordService.discoverKeywordsForDomain(projectId, user.organizationId!);
  }

  @Get('projects/:projectId/keywords/ranked')
  @ApiOperation({ summary: 'All keywords the project domain ranks for on Google (with positions)' })
  async rankedKeywords(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Query('maxPosition') maxPosition?: string,
  ) {
    return this.keywordService.getRankedKeywordsForProject(projectId, user.organizationId!, {
      maxPosition: maxPosition ? parseInt(maxPosition, 10) : undefined,
    });
  }

  // ─── Keyword Tags ─────────────────────────────────────────────────────────────

  @Get('projects/:projectId/keyword-tags')
  @ApiOperation({ summary: 'List keyword tags for a project' })
  async getTags(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
  ) {
    return this.keywordService.getTags(projectId, user.organizationId!);
  }

  @Post('projects/:projectId/keyword-tags')
  @ApiOperation({ summary: 'Create a keyword tag' })
  async createTag(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTagDto,
  ) {
    return this.keywordService.createTag(projectId, user.organizationId!, dto);
  }

  @Patch('projects/:projectId/keyword-tags/:tagId')
  @ApiOperation({ summary: 'Update a keyword tag' })
  async updateTag(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('tagId') tagId: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.keywordService.updateTag(
      tagId,
      projectId,
      user.organizationId!,
      dto,
    );
  }

  @Delete('projects/:projectId/keyword-tags/:tagId')
  @ApiOperation({ summary: 'Delete a keyword tag' })
  async deleteTag(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.keywordService.deleteTag(tagId, projectId, user.organizationId!);
  }
}
