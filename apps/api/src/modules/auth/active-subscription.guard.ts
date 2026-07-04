import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

/**
 * Maliyet koruması: yalnızca ACTIVE veya TRIALING (süresi dolmamış) aboneliği
 * olan hesaplar masraf üreten işlem başlatabilir (tarama, içerik üretimi,
 * GEO sorgusu, kelime araştırması, outreach).
 * PAST_DUE / SUSPENDED hesaplar verilerini GÖREBİLİR ama yeni maliyet üretemez.
 * JwtAuthGuard'dan SONRA kullanılmalıdır (req.user gerekir).
 */
@Injectable()
export class ActiveSubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: User }>();
    const user = req.user;
    if (!user?.organizationId) return true; // auth guard zaten reddeder

    // Adminler her zaman geçer (destek/inceleme amaçlı)
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;

    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
      select: { status: true, trialEndsAt: true },
    });

    if (!sub) {
      throw new ForbiddenException(
        'SUBSCRIPTION_REQUIRED: Bu işlem için aktif bir abonelik gerekir.',
      );
    }

    if (sub.status === 'ACTIVE') return true;

    if (sub.status === 'TRIALING') {
      if (!sub.trialEndsAt || sub.trialEndsAt.getTime() > Date.now()) return true;
      throw new ForbiddenException(
        'TRIAL_EXPIRED: Deneme süreniz bitti. Devam etmek için bir plan seçin.',
      );
    }

    if (sub.status === 'PAST_DUE') {
      throw new ForbiddenException(
        'PAYMENT_REQUIRED: Ödemeniz alınamadı. Yeni işlem başlatmak için ödemenizi tamamlayın.',
      );
    }

    throw new ForbiddenException(
      'SUBSCRIPTION_INACTIVE: Aboneliğiniz aktif değil. Devam etmek için bir plan seçin.',
    );
  }
}
