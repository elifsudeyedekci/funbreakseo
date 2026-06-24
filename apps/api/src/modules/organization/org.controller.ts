import {
  Controller,
  Get,
  Patch,
  Post,
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
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
} from 'class-validator';
import { OrgMemberRole, User } from '@prisma/client';
import { OrgService, UpdateOrgDto as IUpdateOrgDto } from './org.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class UpdateOrgDto implements IUpdateOrgDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  @IsOptional()
  @IsString()
  taxOffice?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(OrgMemberRole)
  role!: OrgMemberRole;
}

export class UpdateMemberRoleDto {
  @IsEnum(OrgMemberRole)
  role!: OrgMemberRole;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Organization')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current organization' })
  @ApiResponse({ status: 200 })
  async getOrg(@CurrentUser() user: User) {
    return this.orgService.getOrg(user.organizationId!);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current organization' })
  async updateOrg(@CurrentUser() user: User, @Body() dto: UpdateOrgDto) {
    return this.orgService.updateOrg(user.organizationId!, dto);
  }

  @Get('me/members')
  @ApiOperation({ summary: 'List organization members' })
  async getMembers(@CurrentUser() user: User) {
    return this.orgService.getMembers(user.organizationId!);
  }

  @Post('me/members/invite')
  @ApiOperation({ summary: 'Invite a member to the organization' })
  async inviteMember(@CurrentUser() user: User, @Body() dto: InviteMemberDto) {
    return this.orgService.inviteMember(user.organizationId!, dto);
  }

  @Delete('me/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from the organization' })
  async removeMember(
    @CurrentUser() user: User,
    @Param('memberId') memberId: string,
  ) {
    return this.orgService.removeMember(user.organizationId!, memberId, user.id);
  }

  @Patch('me/members/:memberId/role')
  @ApiOperation({ summary: 'Update a member role' })
  async updateMemberRole(
    @CurrentUser() user: User,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.orgService.updateMemberRole(
      user.organizationId!,
      memberId,
      dto.role,
    );
  }

  @Get('me/usage')
  @ApiOperation({ summary: 'Get current organization quota usage' })
  async getUsage(@CurrentUser() user: User) {
    return this.orgService.getUsage(user.organizationId!);
  }
}
