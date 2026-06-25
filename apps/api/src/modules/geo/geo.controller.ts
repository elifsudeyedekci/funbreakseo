import {
  Body,
  Controller,
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
import { CurrentUser } from '../auth/current-user.decorator'
import { GeoService } from './geo.service'

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
  constructor(private readonly geoService: GeoService) {}

  // POST /projects/:id/geo/queries
  @Post('projects/:id/geo/queries')
  addGeoQuery(
    @Param('id') id: string,
    @Body() body: AddGeoQueryDto,
    @CurrentUser() _user: User,
  ) {
    return this.geoService.addGeoQuery(id, body)
  }

  // GET /projects/:id/geo/queries
  @Get('projects/:id/geo/queries')
  listGeoQueries(@Param('id') id: string, @CurrentUser() _user: User) {
    return this.geoService.listGeoQueries(id)
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
}
