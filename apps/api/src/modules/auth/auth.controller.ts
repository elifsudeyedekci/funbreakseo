import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  Res,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  Ip,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
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
  private readonly logger = new Logger(AuthController.name);
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
    const tokens = await this.authService.refreshToken(dto.refreshToken);
    return { data: tokens };
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

  // ─── Google OAuth for GSC ────────────────────────────────────────────────────

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth for Search Console access' })
  async googleOAuth(
    @Query('jwt') jwt: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL ?? 'https://funbreakseo.com';
    const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL ?? '';

    process.stdout.write(`[GSC] /auth/google called — jwt present: ${!!jwt && jwt !== 'null'}, clientId present: ${!!clientId}, callbackUrl: ${callbackUrl}\n`);

    if (!clientId) {
      process.stderr.write('[GSC] GOOGLE_CLIENT_ID is not set in env\n');
      return void res.redirect(`${frontendUrl}/tr/dashboard/account?tab=integrations&gsc=error`);
    }

    const payload = this.authService.decodeJwtPayloadUnsafe(jwt);
    const orgId = (payload.organizationId as string | undefined) ?? '';

    process.stdout.write(`[GSC] Decoded JWT — sub: ${payload.sub ?? '?'}, orgId: ${orgId || '(empty)'}, keys: ${Object.keys(payload).join(',')}\n`);

    if (!orgId) {
      process.stderr.write(`[GSC] organizationId missing from token payload: ${JSON.stringify(payload)}\n`);
      return void res.redirect(`${frontendUrl}/tr/dashboard/account?tab=integrations&gsc=error`);
    }

    const state = Buffer.from(JSON.stringify({ orgId })).toString('base64url');
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'profile email https://www.googleapis.com/auth/webmasters.readonly');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('include_granted_scopes', 'false');
    url.searchParams.set('state', state);

    process.stdout.write(`[GSC] Redirecting to Google: ${url.toString().substring(0, 160)}\n`);
    res.redirect(url.toString());
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback — exchanges code and saves GSC tokens' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') oauthError: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL ?? 'https://funbreakseo.com';
    const errorUrl = `${frontendUrl}/tr/dashboard/account?tab=integrations&gsc=error`;

    process.stdout.write(`[GSC callback] code present: ${!!code}, state present: ${!!state}, oauth_error: ${oauthError ?? 'none'}\n`);

    if (oauthError) {
      process.stderr.write(`[GSC callback] Google returned error: ${oauthError}\n`);
      return void res.redirect(errorUrl);
    }

    if (!code || !state) {
      process.stderr.write(`[GSC callback] Missing code or state\n`);
      return void res.redirect(errorUrl);
    }

    // 1. Decode state → orgId
    let orgId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8')) as { orgId?: string };
      orgId = decoded.orgId ?? '';
      process.stdout.write(`[GSC callback] Decoded state orgId: ${orgId || '(empty)'}\n`);
      if (!orgId) throw new Error('orgId missing from state');
    } catch (err) {
      process.stderr.write(`[GSC callback] Failed to decode state: ${(err as Error).message}\n`);
      return void res.redirect(errorUrl);
    }

    // 2. Exchange code for tokens
    let tokens: { accessToken: string; refreshToken?: string; expiryDate: number };
    try {
      tokens = await this.authService.exchangeGoogleCode(code);
      process.stdout.write(`[GSC callback] Token exchange successful — has_refresh_token: ${!!tokens.refreshToken}\n`);
    } catch (err) {
      const msg = (err as { response?: { data?: unknown }; message?: string });
      process.stderr.write(`[GSC callback] Token exchange failed: ${msg.message ?? ''} — body: ${JSON.stringify(msg.response?.data ?? {}).substring(0, 300)}\n`);
      return void res.redirect(errorUrl);
    }

    // 3. Save tokens to DB
    try {
      await this.authService.saveGscOAuthTokens(orgId, tokens);
      process.stdout.write(`[GSC callback] Tokens saved for org ${orgId}\n`);
    } catch (err) {
      process.stderr.write(`[GSC callback] DB save failed for org ${orgId}: ${(err as Error).message}\n`);
      return void res.redirect(errorUrl);
    }

    // 4. Redirect to success
    const successUrl = `${frontendUrl}/tr/dashboard/account?tab=integrations&gsc=success`;
    process.stdout.write(`[GSC callback] Success — redirecting to ${successUrl}
`);
    res.redirect(successUrl);
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
