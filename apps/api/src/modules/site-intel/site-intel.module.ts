import { Module } from '@nestjs/common'
import { SiteIntelController } from './site-intel.controller'
import { SiteIntelService } from './site-intel.service'
import { UsabilityService } from './usability.service'
import { SocialService } from './social.service'
import { TechnologyService } from './technology.service'
import { LocalSeoService } from './local-seo.service'
import { PrismaService } from '../../prisma.service'

@Module({
  controllers: [SiteIntelController],
  providers: [PrismaService, SiteIntelService, UsabilityService, SocialService, TechnologyService, LocalSeoService],
  exports: [SiteIntelService],
})
export class SiteIntelModule {}
