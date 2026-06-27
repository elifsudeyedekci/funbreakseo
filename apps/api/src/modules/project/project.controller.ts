import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
  IsOptional,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ProjectStatus, User } from '@prisma/client';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  domain!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  searchEngine?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  searchEngine?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Projects')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects for current organization' })
  async findAll(@CurrentUser() user: User) {
    return this.projectService.findAll(user.organizationId!);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201 })
  async create(@CurrentUser() user: User, @Body() dto: CreateProjectDto) {
    return this.projectService.create(user.organizationId!, user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.projectService.findOne(id, user.organizationId!);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.update(id, user.organizationId!, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a project' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.projectService.remove(id, user.organizationId!);
  }

  @Get(':id/overview')
  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get project dashboard overview' })
  async getOverview(@CurrentUser() user: User, @Param('id') id: string) {
    return this.projectService.getOverview(id, user.organizationId!);
  }

  @Post(':id/connect-gsc')
  @ApiOperation({ summary: 'Initiate Google Search Console OAuth connection' })
  async connectGsc(@CurrentUser() user: User, @Param('id') id: string) {
    return this.projectService.connectGsc(id, user.organizationId!);
  }

  @Get(':id/gsc-data')
  @ApiOperation({ summary: 'Fetch data from Google Search Console' })
  async getGscData(@CurrentUser() user: User, @Param('id') id: string) {
    return this.projectService.getGscData(id, user.organizationId!);
  }

  @Post(':id/full-scan')
  @ApiOperation({ summary: 'Start a comprehensive full scan (crawl + keywords + backlinks + GEO + competitors)' })
  async fullScan(@CurrentUser() user: User, @Param('id') id: string) {
    return this.projectService.fullScan(id, user.organizationId!);
  }
}
