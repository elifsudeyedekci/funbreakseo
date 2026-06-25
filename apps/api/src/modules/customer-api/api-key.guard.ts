import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Request } from 'express';
import { createHash } from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & { apiOrg?: { id: string; planSlug: string } }
    >();

    const apiKey =
      request.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      throw new UnauthorizedException('X-API-Key header is required');
    }

    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    const keyRecord = await this.prisma.developerApiKey.findFirst({
      where: { keyHash, revokedAt: null },
      include: {
        organization: {
          include: { subscription: { include: { plan: true } } },
        },
      },
    });

    if (!keyRecord) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    // Check rate limit
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const requestsToday = await this.prisma.apiKeyUsage.count({
      where: {
        developerApiKeyId: keyRecord.id,
        createdAt: { gte: startOfDay },
      },
    });

    const planSlug = keyRecord.organization.subscription?.plan?.slug ?? 'free';
    const dailyLimit = this.getDailyLimit(planSlug);

    if (requestsToday >= dailyLimit) {
      throw new ForbiddenException(
        `Daily rate limit exceeded: ${dailyLimit} requests/day on your plan`,
      );
    }

    // Log usage
    await this.prisma.apiKeyUsage.create({
      data: {
        developerApiKeyId: keyRecord.id,
        endpoint: request.path,
        method: request.method,
      },
    });

    // Update lastUsedAt
    await this.prisma.developerApiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: now },
    });

    // Attach org to request
    request.apiOrg = {
      id: keyRecord.organizationId,
      planSlug,
    };

    return true;
  }

  private getDailyLimit(planSlug: string): number {
    const limits: Record<string, number> = {
      free: 100,
      starter: 500,
      pro: 1000,
      agency: 5000,
      enterprise: 50000,
    };
    return limits[planSlug] ?? 100;
  }
}
