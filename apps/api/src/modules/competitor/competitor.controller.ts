import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { User } from '@prisma/client';
import { CompetitorService } from './competitor.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

class AddCompetitorDto {
  @IsString()
  domain!: string;
}

class CompareDto {
  @IsString()
  competitorDomain!: string;
}

@ApiTags('Competitors')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/competitors')
export class CompetitorController {
  constructor(private readonly competitorService: CompetitorService) {}

  @Get()
  @ApiOperation({ summary: 'Find and list competitors for project domain' })
  findCompetitors(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
  ) {
    return this.competitorService.findCompetitors(projectId, user.organizationId!);
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare project domain with a competitor domain (keyword intersection)' })
  compare(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Body() body: CompareDto,
  ) {
    return this.competitorService.compareWithCompetitor(projectId, user.organizationId!, body.competitorDomain);
  }

  @Post()
  @ApiOperation({ summary: 'Manually add a competitor domain' })
  addCompetitor(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Body() body: AddCompetitorDto,
  ) {
    return this.competitorService.addCompetitor(projectId, user.organizationId!, body.domain);
  }

  @Get(':competitorId/keywords')
  @ApiOperation({ summary: 'Keywords the competitor domain ranks for' })
  competitorKeywords(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('competitorId') competitorId: string,
  ) {
    return this.competitorService.getCompetitorKeywords(projectId, user.organizationId!, competitorId);
  }

  @Delete(':competitorId')
  @ApiOperation({ summary: 'Remove a competitor' })
  removeCompetitor(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('competitorId') competitorId: string,
  ) {
    return this.competitorService.removeCompetitor(projectId, user.organizationId!, competitorId);
  }
}
