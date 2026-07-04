import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import { OutreachService } from './outreach.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { PrismaService } from '../../prisma.service'

class CreatePlatformCampaignDto {
  name: string = ''
  targetUrl: string = ''
  anchorText?: string
  topic?: string
  projectId?: string
}

/**
 * PLATFORM outreach — backlink havuzunu besleyen merkezi kampanyalar.
 * Mailleri SİSTEM atar; olumlu dönüşler PublisherOffer olarak admin onayına
 * düşer, admin fiyat belirler, havuza girer. Müşteri bu akışı hiç görmez.
 */
@ApiTags('Admin Outreach')
@ApiBearerAuth()
@Controller('admin/outreach')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminOutreachController {
  constructor(
    private readonly outreachService: OutreachService,
    private readonly prisma: PrismaService,
  ) {}

  /** Tüm kampanyalar (tüm projeler) — funnel istatistikleriyle */
  @Get('campaigns')
  async listAllCampaigns() {
    return this.prisma.outreachCampaign.findMany({
      include: { project: { select: { domain: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  /** Platform kampanyası oluştur (projectId verilmezse ilk proje kullanılır) */
  @Post('campaigns')
  async createPlatformCampaign(@Body() dto: CreatePlatformCampaignDto) {
    let projectId = dto.projectId
    if (!projectId) {
      const anyProject = await this.prisma.project.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
      if (!anyProject) throw new Error('Kampanya bağlanacak proje bulunamadı')
      projectId = anyProject.id
    }
    const admin = await this.prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true },
    })
    return this.outreachService.createCampaign(
      projectId,
      { name: dto.name, targetUrl: dto.targetUrl, anchorText: dto.anchorText, topic: dto.topic },
      admin?.id ?? 'system',
    )
  }

  @Get('campaigns/:id')
  getCampaign(@Param('id') id: string) {
    return this.outreachService.getCampaign(id)
  }

  @Post('campaigns/:id/generate-emails')
  generateEmails(@Param('id') id: string) {
    return this.outreachService.generateEmails(id)
  }

  @Post('campaigns/:id/start')
  startCampaign(@Param('id') id: string) {
    return this.outreachService.startCampaign(id)
  }
}
