import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../email-notification/email.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Abonelik yaşam döngüsü — maliyet koruma akışı:
 * 1. Dönem bitmeden 7/3/1 gün önce yenileme hatırlatması
 * 2. Dönem bitti + ödeme yok → PAST_DUE (masraf üreten işlemler durur)
 * 3. PAST_DUE 7 günü aşınca → SUSPENDED (erişim kapanır, veri saklanır)
 * 4. Trial bitişi: 3/1 gün önce hatırlatma + bitince "plan seçin" maili
 * Ödeme gelirse webhook (handleVakifbankWebhook) aboneliği tekrar ACTIVE yapar.
 */
@Injectable()
export class SubscriptionLifecycleService {
  private readonly logger = new Logger(SubscriptionLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  @Cron('30 1 * * *') // her gün 01:30
  async runDailyLifecycle(): Promise<void> {
    this.logger.log('Abonelik yaşam döngüsü kontrolü başladı');
    await this.safe(() => this.sendRenewalReminders());
    await this.safe(() => this.markOverdueAsPastDue());
    await this.safe(() => this.suspendLongOverdue());
    await this.safe(() => this.handleTrials());
    this.logger.log('Abonelik yaşam döngüsü kontrolü bitti');
  }

  private async safe(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (e) {
      this.logger.error(`Yaşam döngüsü adımı hata verdi: ${(e as Error).message}`);
    }
  }

  private async ownerEmail(organizationId: string): Promise<{ email: string; name: string } | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { ownerUserId: true, name: true },
    });
    if (!org) return null;
    const owner = await this.prisma.user.findUnique({
      where: { id: org.ownerUserId },
      select: { email: true, fullName: true },
    });
    return owner ? { email: owner.email, name: owner.fullName ?? org.name } : null;
  }

  private async notifyOwner(organizationId: string, title: string, body: string, link = '/dashboard/billing') {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { ownerUserId: true },
    });
    if (!org) return;
    await this.prisma.notification.create({
      data: { userId: org.ownerUserId, type: 'BILLING', title, body, link },
    });
  }

  /** Dönem bitmeden 7/3/1 gün önce hatırlatma maili */
  private async sendRenewalReminders(): Promise<void> {
    const now = Date.now();
    const subs = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        isComplimentary: false,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: { gte: new Date(now), lte: new Date(now + 7 * DAY_MS) },
      },
      include: { plan: true },
    });

    for (const sub of subs) {
      const daysLeft = Math.ceil((sub.currentPeriodEnd.getTime() - now) / DAY_MS);
      if (![7, 3, 1].includes(daysLeft)) continue;

      const owner = await this.ownerEmail(sub.organizationId);
      if (!owner) continue;

      await this.emailService.sendMail(
        owner.email,
        `Aboneliğiniz ${daysLeft} gün içinde yenilenecek — FunBreak SEO`,
        `<p>Merhaba ${owner.name},</p>
         <p><strong>${sub.plan.name}</strong> planınızın dönemi ${sub.currentPeriodEnd.toLocaleDateString('tr-TR')} tarihinde sona eriyor.</p>
         <p>Kesintisiz hizmet için ödemenizi panelden tamamlayabilirsiniz.</p>
         <p><a href="https://funbreakseo.com/tr/dashboard/billing">Faturalama sayfasına git</a></p>
         <p>FunBreak SEO Ekibi</p>`,
      );
    }
  }

  /** Dönemi geçmiş ACTIVE abonelikleri PAST_DUE yap */
  private async markOverdueAsPastDue(): Promise<void> {
    const overdue = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        isComplimentary: false,
        currentPeriodEnd: { lt: new Date() },
      },
      include: { plan: true },
    });

    for (const sub of overdue) {
      // İptali dönem sonunda planlanmışsa doğrudan iptal et
      if (sub.cancelAtPeriodEnd) {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
        });
        continue;
      }

      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: SubscriptionStatus.PAST_DUE, pastDueSince: sub.currentPeriodEnd },
      });

      const owner = await this.ownerEmail(sub.organizationId);
      if (owner) {
        await this.emailService.sendMail(
          owner.email,
          'Ödemeniz alınamadı — hizmetiniz duraklatılmak üzere',
          `<p>Merhaba ${owner.name},</p>
           <p><strong>${sub.plan.name}</strong> planınızın dönemi doldu ve ödeme alınamadı.</p>
           <p>7 gün içinde ödeme yapılmazsa hesabınız askıya alınacak. Verileriniz güvende kalır; ödeme sonrası her şey kaldığı yerden devam eder.</p>
           <p><a href="https://funbreakseo.com/tr/dashboard/billing">Şimdi öde</a></p>
           <p>FunBreak SEO Ekibi</p>`,
        );
      }
      await this.notifyOwner(
        sub.organizationId,
        'Ödemeniz alınamadı',
        'Hizmete devam için ödemenizi tamamlayın. 7 gün içinde ödeme yapılmazsa hesap askıya alınır.',
      );
      this.logger.warn(`Abonelik PAST_DUE: org=${sub.organizationId}`);
    }
  }

  /** 7 günü aşan PAST_DUE abonelikleri askıya al */
  private async suspendLongOverdue(): Promise<void> {
    const suspendDaysSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'pastDueSuspendDays' },
    });
    const suspendDays = Number((suspendDaysSetting?.value as { days?: number } | null)?.days ?? 7);
    const cutoff = new Date(Date.now() - suspendDays * DAY_MS);

    const toSuspend = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.PAST_DUE,
        pastDueSince: { lt: cutoff },
      },
      include: { plan: true },
    });

    const adminEmail = this.config.get<string>('ADMIN_EMAIL', 'doganizzetcan@gmail.com');

    for (const sub of toSuspend) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: SubscriptionStatus.SUSPENDED },
      });

      const owner = await this.ownerEmail(sub.organizationId);
      if (owner) {
        await this.emailService.sendMail(
          owner.email,
          'Hesabınız askıya alındı — FunBreak SEO',
          `<p>Merhaba ${owner.name},</p>
           <p>Ödeme alınamadığı için hesabınız askıya alındı. Verileriniz silinmedi.</p>
           <p>Ödemenizi tamamladığınızda hesabınız anında yeniden aktifleşir.</p>
           <p><a href="https://funbreakseo.com/tr/dashboard/billing">Ödeme yap</a></p>
           <p>FunBreak SEO Ekibi</p>`,
        );
      }

      await this.emailService.sendMail(
        adminEmail,
        `Hesap askıya alındı: ${sub.organizationId}`,
        `<p>${suspendDays} gün ödenmeyen abonelik askıya alındı.<br>Org: ${sub.organizationId}<br>Plan: ${sub.plan.name}</p>`,
      );
      this.logger.warn(`Abonelik SUSPENDED: org=${sub.organizationId}`);
    }
  }

  /** Trial hatırlatmaları (3/1 gün) + bitiş maili */
  private async handleTrials(): Promise<void> {
    const now = Date.now();

    // Yaklaşan trial bitişi
    const upcoming = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIALING,
        trialEndsAt: { gte: new Date(now), lte: new Date(now + 3 * DAY_MS) },
      },
    });
    for (const sub of upcoming) {
      const daysLeft = Math.ceil(((sub.trialEndsAt?.getTime() ?? now) - now) / DAY_MS);
      if (![3, 1].includes(daysLeft)) continue;
      const owner = await this.ownerEmail(sub.organizationId);
      if (!owner) continue;
      await this.emailService.sendMail(
        owner.email,
        `Deneme süreniz ${daysLeft} gün içinde bitiyor — FunBreak SEO`,
        `<p>Merhaba ${owner.name},</p>
         <p>Ücretsiz deneme süreniz ${daysLeft} gün içinde sona eriyor. Kaldığınız yerden devam etmek için bir plan seçin.</p>
         <p><a href="https://funbreakseo.com/tr/fiyatlandirma">Planları incele</a></p>
         <p>FunBreak SEO Ekibi</p>`,
      );
    }

    // Son 24 saatte biten trial'lar
    const expired = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIALING,
        trialEndsAt: { gte: new Date(now - DAY_MS), lt: new Date(now) },
      },
    });
    for (const sub of expired) {
      const owner = await this.ownerEmail(sub.organizationId);
      if (owner) {
        await this.emailService.sendMail(
          owner.email,
          'Deneme süreniz bitti — verileriniz sizi bekliyor',
          `<p>Merhaba ${owner.name},</p>
           <p>14 günlük ücretsiz deneme süreniz sona erdi. Hesabınız salt-okunur moda geçti; verileriniz güvende.</p>
           <p>Tüm özellikleri kullanmaya devam etmek için bir plan seçin.</p>
           <p><a href="https://funbreakseo.com/tr/fiyatlandirma">Plan seç</a></p>
           <p>FunBreak SEO Ekibi</p>`,
        );
      }
      await this.notifyOwner(
        sub.organizationId,
        'Deneme süreniz bitti',
        'Devam etmek için bir plan seçin — verileriniz güvende.',
        '/fiyatlandirma',
      );
    }
  }
}
