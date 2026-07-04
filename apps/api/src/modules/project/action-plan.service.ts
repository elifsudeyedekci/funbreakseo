import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ContentService } from '../content/content.service';

export interface ActionPlan {
  crawlId: string | null;
  healthScore: number | null;
  /** Sistemin otomatik çözebildikleri (tek tıkla başlatılır) */
  autoActions: Array<{
    kind: 'CONTENT' | 'FIXABLE_ISSUE';
    title: string;
    detail: string;
    issueId?: string;
    suggestedKeyword?: string;
  }>;
  /** Sistemin yapamayacakları — "bunları sizin yapmanız gerekiyor" */
  manualActions: Array<{ category: string; title: string; detail: string; count: number }>;
  /** Üretilmesi önerilen içerikler (kelime açığına göre) */
  contentSuggestions: Array<{ keyword: string; volume: number; suggestedTitle: string }>;
  summary: { autoCount: number; manualCount: number; contentCount: number };
}

/** Sunucu/altyapı seviyesinde olduğu için bizim otomatik düzeltemeyeceğimiz kategoriler */
const MANUAL_CATEGORIES = new Set(['SPEED', 'SECURITY', 'MOBILE']);
const MANUAL_HINTS: Record<string, string> = {
  SPEED:
    'Sayfa hızı sorunları sunucu/tema seviyesinde çözülür: görselleri sıkıştırın, önbellekleme ve CDN kurun, kullanılmayan eklenti/scriptleri kaldırın.',
  SECURITY:
    'Güvenlik sorunları hosting/sunucu ayarı gerektirir: SSL sertifikası, HTTPS yönlendirmesi ve güvenlik başlıklarını sunucu yapılandırmanızda düzeltin.',
  MOBILE:
    'Mobil uyum sorunları tema/tasarım değişikliği gerektirir: responsive tema kullanın, viewport ayarını ve dokunma hedeflerini düzeltin.',
};

@Injectable()
export class ActionPlanService {
  private readonly logger = new Logger(ActionPlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contentService: ContentService,
  ) {}

  async getActionPlan(projectId: string, organizationId: string): Promise<ActionPlan> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const latestCrawl = await this.prisma.crawlJob.findFirst({
      where: { projectId, status: 'DONE' },
      orderBy: { createdAt: 'desc' },
    });

    const autoActions: ActionPlan['autoActions'] = [];
    const manualBuckets = new Map<string, { count: number; sample: string }>();

    if (latestCrawl) {
      const issues = await this.prisma.seoIssue.findMany({
        where: { crawlJobId: latestCrawl.id, fixed: false },
        select: { id: true, category: true, severity: true, message: true, autoFixable: true },
        take: 500,
      });

      for (const issue of issues) {
        if (issue.autoFixable) {
          if (autoActions.filter((a) => a.kind === 'FIXABLE_ISSUE').length < 25) {
            autoActions.push({
              kind: 'FIXABLE_ISSUE',
              title: issue.message,
              detail: 'WordPress Connector veya JS Pixel bağlıysa tek tıkla uygulanır; değilse öneri olarak işaretlenir.',
              issueId: issue.id,
            });
          }
        } else if (MANUAL_CATEGORIES.has(issue.category)) {
          const bucket = manualBuckets.get(issue.category) ?? { count: 0, sample: issue.message };
          bucket.count++;
          manualBuckets.set(issue.category, bucket);
        }
      }
    }

    const manualActions: ActionPlan['manualActions'] = [...manualBuckets.entries()].map(
      ([category, { count, sample }]) => ({
        category,
        title: sample,
        detail: MANUAL_HINTS[category] ?? 'Bu sorun sitenizde manuel müdahale gerektirir.',
        count,
      }),
    );

    // İçerik açığı: takip edilen kelimelerden içeriği olmayanlar (hacme göre)
    const [keywords, contentItems] = await Promise.all([
      this.prisma.keyword.findMany({
        where: { projectId },
        select: { phrase: true, searchVolume: true },
        orderBy: { searchVolume: 'desc' },
        take: 100,
      }),
      this.prisma.contentItem.findMany({
        where: { projectId },
        select: { focusKeyword: true, title: true },
      }),
    ]);

    const covered = new Set(
      contentItems.flatMap((c) => [c.focusKeyword?.toLowerCase() ?? '', c.title.toLowerCase()]),
    );
    const contentSuggestions: ActionPlan['contentSuggestions'] = keywords
      .filter((k) => {
        const p = k.phrase.toLowerCase();
        return ![...covered].some((c) => c && (c.includes(p) || p.includes(c)));
      })
      .slice(0, 8)
      .map((k) => ({
        keyword: k.phrase,
        volume: k.searchVolume ?? 0,
        suggestedTitle: this.suggestTitle(k.phrase),
      }));

    for (const s of contentSuggestions.slice(0, 5)) {
      autoActions.push({
        kind: 'CONTENT',
        title: `"${s.suggestedTitle}" yazısını üret`,
        detail: `"${s.keyword}" kelimesi takipte ama sitenizde bu konuyu hedefleyen içerik yok. Sistem, sitenizi okuyarak işinize özel SEO+GEO uyumlu bir yazı üretir.`,
        suggestedKeyword: s.keyword,
      });
    }

    return {
      crawlId: latestCrawl?.id ?? null,
      healthScore: latestCrawl ? Number(latestCrawl.healthScore ?? 0) : null,
      autoActions,
      manualActions,
      contentSuggestions,
      summary: {
        autoCount: autoActions.length,
        manualCount: manualActions.reduce((s, m) => s + m.count, 0),
        contentCount: contentSuggestions.length,
      },
    };
  }

  /**
   * Tek tık: önerilen içerikleri üretim kuyruğuna atar.
   * (Kota kontrolü ContentService içinde — plan limiti aşılırsa orada durur.)
   */
  async executeActionPlan(
    projectId: string,
    organizationId: string,
    userId: string,
    options?: { maxContent?: number },
  ) {
    const plan = await this.getActionPlan(projectId, organizationId);
    const maxContent = Math.min(options?.maxContent ?? 3, 5);

    const queued: Array<{ keyword: string; title: string; contentId?: string; error?: string }> = [];
    const toGenerate = plan.contentSuggestions.slice(0, maxContent);

    for (const suggestion of toGenerate) {
      try {
        const item = (await this.contentService.generateContent(
          projectId,
          {
            title: suggestion.suggestedTitle,
            focusKeyword: suggestion.keyword,
            type: 'BLOG',
            tone: 'informative',
          },
          userId,
        )) as { id?: string };
        queued.push({ keyword: suggestion.keyword, title: suggestion.suggestedTitle, contentId: item?.id });
      } catch (e) {
        queued.push({
          keyword: suggestion.keyword,
          title: suggestion.suggestedTitle,
          error: (e as Error).message,
        });
        // Kota dolduysa devam etme
        if ((e as Error).message?.toLowerCase().includes('limit')) break;
      }
    }

    // Kullanıcıya bildirim
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'ACTION_PLAN',
          title: 'Aksiyon planı başlatıldı',
          body: `${queued.filter((q) => q.contentId).length} içerik üretim kuyruğuna alındı. ${plan.manualActions.length > 0 ? `${plan.summary.manualCount} sorun manuel müdahale gerektiriyor — detaylar aksiyon planında.` : ''}`,
          link: '/dashboard/content',
        },
      });
    } catch (e) {
      this.logger.warn(`Aksiyon planı bildirimi yazılamadı: ${(e as Error).message}`);
    }

    return {
      queuedContent: queued,
      manualActions: plan.manualActions,
      message:
        queued.filter((q) => q.contentId).length > 0
          ? 'İçerik üretimi başladı — İçerik sayfasından takip edebilirsiniz. Manuel maddeler için aksiyon planına bakın.'
          : 'Kuyruğa alınacak yeni içerik bulunamadı veya plan kotanız doldu.',
    };
  }

  private suggestTitle(keyword: string): string {
    const k = keyword.trim();
    const capitalized = k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1);
    if (/nedir|nasıl|neden|ne işe/i.test(k)) return `${capitalized}? Kapsamlı Rehber`;
    return `${capitalized}: Bilmeniz Gereken Her Şey (${new Date().getFullYear()} Rehberi)`;
  }
}
