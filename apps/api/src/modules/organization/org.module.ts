import { Module } from '@nestjs/common';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [OrgController],
  providers: [OrgService, PrismaService],
  exports: [OrgService],
})
export class OrganizationModule {}
