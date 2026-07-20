import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionStatus } from '@prisma/client';
import { APP_URL } from '@funbreakseo/shared';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../email-notification/email.service';

interface RecommendationItem {
  title: string;
  category: string;
  priority: 'CRITICAL' | 'MEDIUM' | 'LOW';
  howToFix: string;
  affectedCount?: number;
}

/**
 * Haftalık "Bu Hafta Düzeltilecek 3 Şey" e-postası — her Pazartesi 09:00 (TR
 * saati), her projenin en son tamamlanmış SiteAuditReport'undaki en kritik 3
 * CRITICAL öneriyi proje sahibine gönderir. Kritik öneri sayısı 3'ten azsa
 * (yetersiz sinyal) mail atlanır — boş/dolgu içerik gönderilmez.
 *
 * report.module.ts'deki mevcut cron servislerinin (monthly-report.service.ts)
 * desenini birebir izler: aktif/deneme aboneliği kontrolü, proje bazlı
 * try/catch (bir projenin hatası döngüyü durdurmaz), ve NotificationPreference
 * üzerinden opt-out kontrolü.
 */
@Injectable()
export class WeeklyDigestService {
  private readonly logger = new Logger(WeeklyDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  private buildEmailHtml(domain: string, projectId: string, items: RecommendationItem[]): string {
    const auditUrl = `${APP_URL}/tr/dashboard/projects/${projectId}/audit`;
    const rows = items
      .map(
        (it) => `<div style="padding:12px 16px;border:1px solid #dbe4f0;border-radius:10px;margin-bottom:10px;background:#f8fafc">
          <p style="margin:0;font-weight:700;color:#1e293b;font-size:13px">${escapeHtml(it.title)}</p>
          <p style="margin:6px 0 0;color:#475569;font-size:12px">${escapeHtml(it.howToFix)}</p>
        </div>`,
      )
      .join('');

    return `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
      <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;padding:24px 28px;border-radius:12px 12px 0 0">
        <p style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.8;margin:0 0 6px">Haftalık Öncelik Listesi</p>
        <h1 style="font-size:20px;margin:0">${escapeHtml(domain)}</h1>
        <p style="font-size:12px;opacity:.85;margin:8px 0 0">Bu hafta düzeltmeniz gereken en kritik 3 konu</p>
      </div>
      <div style="border:1px solid #dbe4f0;border-top:0;border-radius:0 0 12px 12px;padding:20px 24px">
        ${rows}
        <p style="text-align:center;margin:20px 0 4px">
          <a href="${auditUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600">Denetim Raporunu Aç</a>
        </p>
        <p style="text-align:center;color:#94a3b8;font-size:11px">FunBreak SEO · Bu maili panel bildirim tercihlerinden kapatabilirsiniz.</p>
      </div>
    </div>`;
  }

  // ── Cron: her Pazartesi 09:00 (TR saati) — haftalık öncelik maili ───────────

  @Cron('0 9 * * 1', { timeZone: 'Europe/Istanbul' })
  async sendWeeklyDigest(): Promise<void> {
    const projects = await this.prisma.project.findMany({
      where: {
        status: 'ACTIVE',
        organization: {
          subscription: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] } },
        },
      },
      include: { createdBy: { select: { email: true } } },
    });

    let sent = 0;
    for (const project of projects) {
      try {
        // Tercih kontrolü: mevcut cronlarla aynı desen (NotificationPreference.eventEmails)
        const pref = await this.prisma.notificationPreference.findFirst({
          where: { organizationId: project.organizationId },
        });
        const events = (pref?.eventEmails as Record<string, boolean> | null) ?? {};
        if (events['weeklyDigest'] === false) continue;

        const latestCrawl = await this.prisma.crawlJob.findFirst({
          where: { projectId: project.id, status: 'DONE' },
          orderBy: { createdAt: 'desc' },
        });
        if (!latestCrawl) continue;

        const report = await this.prisma.siteAuditReport.findUnique({
          where: { crawlJobId: latestCrawl.id },
          select: { recommendations: true },
        });
        const allRecs = (report?.recommendations as RecommendationItem[] | null) ?? [];
        const critical = allRecs.filter((r) => r.priority === 'CRITICAL').slice(0, 3);
        // Yetersiz sinyal (0-2 kritik öneri) varsa boş/dolgu mail atma — atla.
        if (critical.length < 3) continue;

        const ownerEmail = project.createdBy?.email;
        if (!ownerEmail) continue;

        const html = this.buildEmailHtml(project.domain, project.id, critical);
        await this.email.sendMail(ownerEmail, `${project.domain} — Bu Hafta Düzeltilecek 3 Şey`, html);
        sent++;
      } catch (e) {
        this.logger.warn(`Haftalık özet maili gönderilemedi (${project.id}): ${(e as Error).message}`);
      }
    }
    this.logger.log(`Haftalık özet mailleri işlendi: ${sent}/${projects.length} proje`);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
