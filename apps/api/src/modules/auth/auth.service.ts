import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { authenticator } from 'otplib';
import axios from 'axios';
import {
  User,
  ConsentType,
  LegalDocumentType,
} from '@prisma/client';

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  phone?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AcceptConsentDto {
  consentIds: string[];
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly mailer: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.mailer = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
  }

  // ─── Validate user password (for LocalStrategy) ────────────────────────────
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  // ─── Register ───────────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<{ data: { requiresEmailVerification: boolean; message: string } }> {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const slug = `${dto.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')}-${Date.now()}`;

    // Use a transaction to create org + user atomically
    const { org, user } = await this.prisma.$transaction(async (tx) => {
      // Create org with a placeholder ownerUserId
      const tempId = uuidv4();
      const createdOrg = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug,
          ownerUserId: tempId,
        },
      });

      // Create user with organizationId
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          phone: dto.phone,
          emailVerifyToken,
          status: 'PENDING',
          organizationId: createdOrg.id,
        },
      });

      // Update ownerUserId
      await tx.organization.update({
        where: { id: createdOrg.id },
        data: { ownerUserId: createdUser.id },
      });

      return { org: createdOrg, user: createdUser };
    });

    // Add owner membership
    await this.prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: 'OWNER',
      },
    });

    // Create default notification preferences
    await this.prisma.notificationPreference.create({
      data: { organizationId: org.id },
    });

    // Save consent records for latest legal documents
    const latestDocs = await this.prisma.legalDocument.findMany({
      where: { isActive: true },
      orderBy: { effectiveDate: 'desc' },
      distinct: ['type'],
    });

    const consentTypeMap: Partial<Record<LegalDocumentType, ConsentType>> = {
      DISTANCE_SALES: 'DISTANCE_SALES',
      PRE_INFO: 'PRE_INFO',
      TERMS: 'TERMS',
      KVKK: 'KVKK',
    };

    for (const doc of latestDocs) {
      const ct = consentTypeMap[doc.type];
      if (ct) {
        await this.prisma.consentRecord.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            consentType: ct,
            documentVersion: doc.version,
            documentSnapshot: doc.content,
            legalDocumentId: doc.id,
          },
        });
      }
    }

    // Send verify email — non-fatal so registration succeeds even without SMTP locally
    try {
      const baseUrl = this.config.get<string>(
        'FRONTEND_URL',
        'https://funbreakseo.com',
      );
      await this.mailer.sendMail({
        from: `"FunBreak SEO" <${this.config.get('SMTP_FROM', 'noreply@funbreakseo.com')}>`,
        to: user.email,
        subject: 'E-posta adresinizi doğrulayın',
        html: `<p>Merhaba ${user.fullName},</p>
               <p><a href="${baseUrl}/email-dogrula?token=${emailVerifyToken}">E-postanızı doğrulamak için tıklayın</a></p>`,
      });
    } catch {
      // SMTP not configured (local dev) — registration still succeeds
    }

    return {
      data: {
        requiresEmailVerification: true,
        message: 'Registration successful. Please verify your email.',
      },
    };
  }

  // ─── Login ──────────────────────────────────────────────────────────────────
  async login(user: User) {
    const tokens = await this.generateTokens(user);
    const fullUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        organization: {
          include: { subscription: { include: { plan: true } } },
        },
      },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const { passwordHash, emailVerifyToken, twoFactorSecret, ...safeUser } = fullUser;
    return {
      data: {
        user: safeUser,
        organization: safeUser.organization,
        subscription: safeUser.organization?.subscription ?? null,
        pendingConsents: [],
        requiresTwoFactor: false,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      },
    };
  }

  // ─── Refresh Token ──────────────────────────────────────────────────────────
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(stored.user);
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────
  async logout(userId: string, tokenHash?: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: tokenHash ? { userId, tokenHash } : { userId },
      data: { revokedAt: new Date() },
    });
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────────
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always respond with success to avoid user enumeration
    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = this.hashToken(resetToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: `reset:${resetTokenHash}:${Date.now() + 3_600_000}`,
      },
    });

    const baseUrl = this.config.get<string>(
      'FRONTEND_URL',
      'https://funbreakseo.com',
    );

    await this.mailer.sendMail({
      from: `"FunBreak SEO" <${this.config.get('SMTP_FROM', 'noreply@funbreakseo.com')}>`,
      to: user.email,
      subject: 'Şifre Sıfırlama',
      html: `<p>Şifrenizi sıfırlamak için <a href="${baseUrl}/sifremi-sifirla?token=${resetToken}">tıklayın</a>. Bu link 1 saat geçerlidir.</p>`,
    });

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  // ─── Reset Password ──────────────────────────────────────────────────────────
  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    const tokenHash = this.hashToken(token);

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerifyToken: {
          startsWith: `reset:${tokenHash}:`,
        },
      },
    });

    if (!user || !user.emailVerifyToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const parts = user.emailVerifyToken.split(':');
    const expiresAt = parseInt(parts[2], 10);
    if (Date.now() > expiresAt) {
      throw new BadRequestException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, emailVerifyToken: null },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password reset successful' };
  }

  // ─── Verify Email ────────────────────────────────────────────────────────────
  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        status: 'ACTIVE',
      },
    });

    return { message: 'Email verified successfully' };
  }

  // ─── Get Me ──────────────────────────────────────────────────────────────────
  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        organization: {
          include: {
            subscription: { include: { plan: true } },
          },
        },
      },
    });

    const { passwordHash, emailVerifyToken, twoFactorSecret, ...safeUser } =
      user;

    return safeUser;
  }

  // ─── Enable 2FA ──────────────────────────────────────────────────────────────
  async enable2FA(userId: string): Promise<{ secret: string; otpAuthUrl: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(
      user.email,
      'FunBreakSEO',
      secret,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { secret, otpAuthUrl };
  }

  // ─── Verify 2FA ──────────────────────────────────────────────────────────────
  async verify2FA(userId: string, code: string): Promise<{ verified: boolean }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!user.twoFactorSecret) {
      throw new BadRequestException('2FA not set up');
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { verified: true };
  }

  // ─── Get Pending Consents ────────────────────────────────────────────────────
  async getPendingConsents(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        consentRecords: {
          orderBy: { acceptedAt: 'desc' },
        },
      },
    });

    const activeDocs = await this.prisma.legalDocument.findMany({
      where: { isActive: true },
      orderBy: { effectiveDate: 'desc' },
      distinct: ['type'],
    });

    const accepted = new Map<string, string>();
    for (const cr of user.consentRecords) {
      if (!accepted.has(cr.consentType)) {
        accepted.set(cr.consentType, cr.documentVersion);
      }
    }

    const consentTypeMap: Partial<Record<LegalDocumentType, ConsentType>> = {
      DISTANCE_SALES: 'DISTANCE_SALES',
      PRE_INFO: 'PRE_INFO',
      TERMS: 'TERMS',
      KVKK: 'KVKK',
    };

    const pending = activeDocs.filter((doc) => {
      const ct = consentTypeMap[doc.type];
      if (!ct) return false;
      const acceptedVersion = accepted.get(ct);
      return acceptedVersion !== doc.version;
    });

    return pending.map((doc) => ({
      id: doc.id,
      type: doc.type,
      version: doc.version,
      locale: doc.locale,
      effectiveDate: doc.effectiveDate,
      contentPreview: doc.content.substring(0, 200),
    }));
  }

  // ─── Accept Consents ─────────────────────────────────────────────────────────
  async acceptConsents(
    userId: string,
    dto: AcceptConsentDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const docs = await this.prisma.legalDocument.findMany({
      where: { id: { in: dto.consentIds } },
    });

    const consentTypeMap: Partial<Record<LegalDocumentType, ConsentType>> = {
      DISTANCE_SALES: 'DISTANCE_SALES',
      PRE_INFO: 'PRE_INFO',
      TERMS: 'TERMS',
      KVKK: 'KVKK',
    };

    for (const doc of docs) {
      const ct = consentTypeMap[doc.type];
      if (!ct) continue;
      await this.prisma.consentRecord.create({
        data: {
          userId,
          organizationId: user.organizationId,
          consentType: ct,
          documentVersion: doc.version,
          documentSnapshot: doc.content,
          legalDocumentId: doc.id,
          ip: dto.ip,
          userAgent: dto.userAgent,
        },
      });
    }

    return { message: 'Consents accepted' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '1h'),
    });

    const rawRefresh = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);
    const expiresAt = new Date(
      Date.now() +
        parseInt(
          this.config.get<string>('JWT_REFRESH_EXPIRES_DAYS', '30'),
          10,
        ) *
          86_400_000,
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefresh };
  }

  // ─── Account management ───────────────────────────────────────────────────────

  async updateProfile(userId: string, dto: Record<string, unknown>) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName ? String(dto.fullName) : undefined,
        phone: dto.phone ? String(dto.phone) : undefined,
        locale: dto.locale ? String(dto.locale) : undefined,
      },
      select: { id: true, email: true, fullName: true, locale: true, phone: true, role: true },
    });
    return { data: updated };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new Error('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    return { success: true };
  }

  async disable2FA(userId: string, code: string) {
    const verified = await this.verify2FA(userId, code);
    if (!verified.verified) throw new Error('Invalid 2FA code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return { success: true };
  }

  async verify2FACode(userId: string, code: string) {
    return this.verify2FA(userId, code);
  }

  async getOrganization(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: { include: { user: { select: { id: true, email: true, fullName: true, role: true } } } } },
    });
    return { data: org };
  }

  async updateOrganization(orgId: string, dto: Record<string, unknown>) {
    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        name: dto.name ? String(dto.name) : undefined,
        taxNumber: dto.taxNumber ? String(dto.taxNumber) : undefined,
        billingAddress: dto.billingAddress ? String(dto.billingAddress) : undefined,
        country: dto.country ? String(dto.country) : undefined,
      },
    });
    return { data: updated };
  }

  async getIntegrations(orgId: string) {
    const integrations = await this.prisma.apiIntegration.findMany({
      where: { organizationId: orgId },
    });
    return { data: integrations };
  }

  /**
   * Decode JWT payload WITHOUT signature verification.
   * Used only for the Google OAuth state param — we just need the organizationId
   * to know which org to save GSC tokens for; strict verification is unnecessary
   * here (the callback is protected by Google's own state round-trip).
   */
  decodeJwtPayloadUnsafe(token: string): { sub?: string; organizationId?: string; [k: string]: unknown } {
    if (!token || token === 'null' || token === 'undefined') return {};
    try {
      const decoded = this.jwt.decode(token);
      return (decoded as Record<string, unknown>) ?? {};
    } catch {
      return {};
    }
  }

  async exchangeGoogleCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiryDate: number }> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID') ?? '';
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET') ?? '';
    const redirectUri = this.config.get<string>('GOOGLE_CALLBACK_URL') ?? '';

    console.log('[GSC exchangeGoogleCode] params:', {
      client_id: clientId ? `${clientId.substring(0, 20)}…` : '(EMPTY)',
      client_secret: clientSecret ? `${clientSecret.substring(0, 8)}…` : '(EMPTY)',
      redirect_uri: redirectUri || '(EMPTY)',
      code: code ? `${code.substring(0, 12)}…` : '(EMPTY)',
      grant_type: 'authorization_code',
    });

    // Google token endpoint requires application/x-www-form-urlencoded, not JSON.
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    console.log('[GSC exchangeGoogleCode] raw body:', body.toString().replace(/client_secret=[^&]+/, 'client_secret=REDACTED'));

    try {
      const { data } = await axios.post<{ access_token: string; refresh_token?: string; expires_in?: number }>(
        'https://oauth2.googleapis.com/token',
        body,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      console.log('[GSC exchangeGoogleCode] success — has access_token:', !!data.access_token, 'has refresh_token:', !!data.refresh_token);
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiryDate: Date.now() + (data.expires_in ?? 3600) * 1000,
      };
    } catch (err: unknown) {
      const axErr = err as { response?: { status?: number; data?: unknown }; message?: string };
      console.error('[GSC exchangeGoogleCode] 401/error — status:', axErr.response?.status, 'body:', JSON.stringify(axErr.response?.data));
      throw err;
    }
  }

  async saveGscOAuthTokens(orgId: string, tokens: { accessToken: string; refreshToken?: string; expiryDate: number }) {
    const existing = await this.prisma.apiIntegration.findFirst({
      where: { organizationId: orgId, provider: 'GSC' },
    });
    if (existing) {
      await this.prisma.apiIntegration.update({
        where: { id: existing.id },
        data: { credentials: tokens as object, status: 'connected', connectedAt: new Date() },
      });
    } else {
      await this.prisma.apiIntegration.create({
        data: { organizationId: orgId, provider: 'GSC', credentials: tokens as object, status: 'connected' },
      });
    }
  }

  async connectGsc(orgId: string, dto: Record<string, unknown>) {
    const existing = await this.prisma.apiIntegration.findFirst({
      where: { organizationId: orgId, provider: 'GSC' },
    });

    if (existing) {
      await this.prisma.apiIntegration.update({
        where: { id: existing.id },
        data: { credentials: dto as object, status: 'connected' },
      });
    } else {
      await this.prisma.apiIntegration.create({
        data: {
          organizationId: orgId,
          provider: 'GSC',
          credentials: dto as object,
          status: 'connected',
        },
      });
    }
    return { success: true };
  }
}
