import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Headers,
  Ip,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsArray, IsUUID, IsOptional } from 'class-validator';
import { AuthService, RegisterDto as IRegisterDto } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { User } from '@prisma/client';
import { Request } from 'express';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class RegisterDto implements IRegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(2)
  organizationName!: string;

  @IsString()
  phone?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  tokenHash?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class VerifyEmailDto {
  @IsString()
  token!: string;
}

export class Verify2FADto {
  @IsString()
  code!: string;
}

export class AcceptConsentsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  consentIds!: string[];
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user and organization' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Access and refresh tokens' })
  async login(
    @Body() dto: LoginDto,
    @Req() _req: Request & { user?: User },
  ) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(@CurrentUser() user: User, @Body() dto: LogoutDto) {
    return this.authService.logout(user.id, dto.tokenHash ?? '');
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: User) {
    return this.authService.getMe(user.id);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Enable two-factor authentication' })
  async enable2FA(@CurrentUser() user: User) {
    return this.authService.enable2FA(user.id);
  }

  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA code and activate 2FA' })
  async verify2FA(@CurrentUser() user: User, @Body() dto: Verify2FADto) {
    return this.authService.verify2FA(user.id, dto.code);
  }

  @Get('pending-consents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get list of pending legal consents' })
  async getPendingConsents(@CurrentUser() user: User) {
    return this.authService.getPendingConsents(user.id);
  }

  @Post('accept-consents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept legal consents' })
  async acceptConsents(
    @CurrentUser() user: User,
    @Body() dto: AcceptConsentsDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.acceptConsents(user.id, {
      consentIds: dto.consentIds,
      ip,
      userAgent,
    });
  }
}

// ─── Account Controller (/account/* alias routes) ────────────────────────────

@Controller('account')
@ApiTags('account')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class AccountController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: User) {
    return this.authService.getMe(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(@CurrentUser() user: User, @Body() dto: Record<string, unknown>) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  async changePassword(@CurrentUser() user: User, @Body() dto: Record<string, unknown>) {
    return this.authService.changePassword(user.id, String(dto.currentPassword), String(dto.newPassword));
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable 2FA' })
  async enable2fa(@CurrentUser() user: User) {
    return this.authService.enable2FA(user.id);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable2fa(@CurrentUser() user: User, @Body() dto: Record<string, unknown>) {
    return this.authService.disable2FA(user.id, String(dto.code));
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA code' })
  async verify2fa(@CurrentUser() user: User, @Body() dto: Record<string, unknown>) {
    return this.authService.verify2FACode(user.id, String(dto.code));
  }

  @Get('organization')
  @ApiOperation({ summary: 'Get organization profile' })
  async getOrg(@CurrentUser() user: User) {
    return this.authService.getOrganization(user.organizationId!);
  }

  @Patch('organization')
  @ApiOperation({ summary: 'Update organization profile' })
  async updateOrg(@CurrentUser() user: User, @Body() dto: Record<string, unknown>) {
    return this.authService.updateOrganization(user.organizationId!, dto);
  }

  @Get('integrations')
  @ApiOperation({ summary: 'Get API integrations' })
  async getIntegrations(@CurrentUser() user: User) {
    return this.authService.getIntegrations(user.organizationId!);
  }

  @Post('integrations/gsc')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connect Google Search Console' })
  async connectGsc(@CurrentUser() user: User, @Body() dto: Record<string, unknown>) {
    return this.authService.connectGsc(user.organizationId!, dto);
  }
}
