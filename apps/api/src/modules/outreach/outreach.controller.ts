import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { OutreachService } from './outreach.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ActiveSubscriptionGuard } from '../auth/active-subscription.guard'
import { CurrentUser } from '../auth/current-user.decorator'

class CreateCampaignDto {
  name: string = ''
  targetUrl: string = ''
  anchorText?: string
  topic?: string
}

@ApiTags('Outreach')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class OutreachController {
  constructor(private readonly outreachService: OutreachService) {}

  @Post('projects/:id/outreach/campaigns')
  @UseGuards(ActiveSubscriptionGuard)
  createCampaign(
    @Param('id') id: string,
    @Body() body: CreateCampaignDto,
    @CurrentUser() user: any,
  ) {
    return this.outreachService.createCampaign(id, body, user.id)
  }

  @Get('projects/:id/outreach/campaigns')
  listCampaigns(@Param('id') id: string) {
    return this.outreachService.listCampaigns(id)
  }

  @Get('campaigns/:id')
  getCampaign(@Param('id') id: string) {
    return this.outreachService.getCampaign(id)
  }

  @Post('campaigns/:id/generate-emails')
  @UseGuards(ActiveSubscriptionGuard)
  generateEmails(@Param('id') id: string) {
    return this.outreachService.generateEmails(id)
  }

  @Post('campaigns/:id/start')
  @UseGuards(ActiveSubscriptionGuard)
  startCampaign(@Param('id') id: string) {
    return this.outreachService.startCampaign(id)
  }

  @Get('projects/:id/outreach/won-links')
  getWonLinks(@Param('id') id: string) {
    return this.outreachService.getWonLinks(id)
  }

  @Get('projects/:id/backlinks')
  getBacklinks(@Param('id') id: string) {
    return this.outreachService.getBacklinks(id)
  }

  @Post('projects/:id/backlinks/sync')
  @UseGuards(ActiveSubscriptionGuard)
  syncBacklinks(@Param('id') id: string) {
    return this.outreachService.syncBacklinks(id)
  }

  @Get('projects/:id/backlink-orders')
  getBacklinkOrders(@Param('id') id: string) {
    return this.outreachService.getBacklinkOrders(id)
  }
}
