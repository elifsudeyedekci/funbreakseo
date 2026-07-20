import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ContentService } from '../content/content.service';

export interface ActionPlan {
  crawlId: string | null;
  healthScore: number | null;
  /**
   * Sistemin platformdan gerçekten otomatik yapabildikleri — şu an tek gerçek
   * karşılığı içerik üretimidir (blog/GEO odaklı yazı). Title/meta/canonical/
   * viewport gibi HTML düzenlemeleri müşterinin kendi sitesinde yapması
   * gereken şeylerdir (bkz. manualActions) — burada YER ALMAZ, çünkü bunları
   * fiilen otomatik uygulayan bir entegrasyon (ör. WordPress connector) yok.
   */
  autoActions: Array<{
    kind: 'CONTENT';
    title: string;
    detail: string;
    suggestedKeyword?: string;
  }>;
  /** Sistemin yapamayacakları — "bunları sizin yapmanız gerekiyor" */
  manualActions: Array<{ category: string; title: string; detail: string; count: number }>;
  /** Üretilmesi önerilen içerikler (kelime açığına göre) */
  contentSuggestions: Array<{ keyword: string; volume: number; suggestedTitle: string }>;
  summary: { autoCount: number; manualCount: number; contentCount: number };
}

/**
 * Her IssueCategory için "bunu neden/nasıl siz düzeltmelisiniz" açıklaması.
 * Platform hiçbir SeoIssue kategorisini fiilen otomatik düzeltmiyor — hepsi
 * müşterinin kendi sitesinde (HTML/CMS/sunucu seviyesinde) yapması gereken
 * değişikliklerdir. Yalnızca içerik ÜRETİMİ (blog/GEO yazısı) platformdan
 * gerçekten otomatik yapılabilir.
 */
const MANUAL_HINTS: Record<string, string> = {
  TITLE: 'Sayfa başlığı (title) etiketini sitenizin HTML/CMS\'inde 50-60 karakter arasında, benzersiz ve açıklayıcı olacak şekilde düzenleyin.',
  META: 'Meta açıklamayı (description) 120-160 karakter arasında, tıklanmayı teşvik edecek şekilde sitenizde düzenleyin.',
  HEADING: 'Sayfada tek bir H1 ve mantıklı bir H2-H6 hiyerarşisi olacak şekilde başlık yapısını düzenleyin.',
  CONTENT: 'İçerik miktarını ve kalitesini (görsellerde alt metin, kelime sayısı) sitenizde artırın.',
  TECHNICAL: 'Bu teknik SEO sorunu (canonical, sitemap, robots.txt, yönlendirme vb.) sitenizin sunucu/CMS ayarlarından düzeltilmelidir.',
  SCHEMA: 'Sayfa tipine uygun Schema.org (JSON-LD) yapılandırılmış verisini sitenize ekleyin.',
  LINKS: 'Bozuk bağlantıları düzeltin, iç bağlantı yapısını ve yönlendirmeleri sitenizde gözden geçirin.',
  MOBILE: 'Mobil uyum sorunları tema/tasarım değişikliği gerektirir: responsive tema kullanın, viewport ayarını ve dokunma hedeflerini düzeltin.',
  SECURITY: 'Güvenlik sorunları hosting/sunucu ayarı gerektirir: SSL sertifikası, HTTPS yönlendirmesi ve güvenlik başlıklarını sunucu yapılandırmanızda düzeltin.',
  SPEED: 'Sayfa hızı sorunları sunucu/tema seviyesinde çözülür: görselleri sıkıştırın, önbellekleme ve CDN kurun, kullanılmayan eklenti/scriptleri kaldırın.',
  PERFORMANCE: 'Performans sorunları (yavaş yükleme, büyük dosya boyutu, sıkıştırma eksikliği) sunucu/hosting ve tema seviyesinde çözülmelidir.',
  USABILITY: 'Kullanılabilirlik sorunlarını (font boyutu, dokunma hedefi, favicon) sitenizin tasarımında düzeltin.',
  SOCIAL: 'Open Graph/Twitter Card etiketlerini ve sosyal medya profil bağlantılarını sitenize ekleyin.',
  TECHNOLOGY: 'DNS/DMARC/SPF kayıtlarını alan adı sağlayıcınızın (domain/DNS yönetim panelinin) ayarlarından düzenleyin.',
  LOCAL_SEO: 'LocalBusiness yapılandırılmış verisini ve NAP (ad/adres/telefon) tutarlılığını sitenizde sağlayın.',
};
const DEFAULT_MANUAL_HINT = 'Bu sorun sitenizde manuel müdahale gerektirir.';

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
    // Every unresolved SeoIssue is something the CUSTOMER must fix on their
    // own site — grouped by category (not by exact message, so "Title too
    // short" and "Title missing" both roll up under one TITLE bucket).
    const manualBuckets = new Map<string, { count: number; sample: string }>();

    if (latestCrawl) {
      const issues = await this.prisma.seoIssue.findMany({
        where: { crawlJobId: latestCrawl.id, fixed: false },
        select: { category: true, message: true },
        take: 2000,
      });

      for (const issue of issues) {
        const bucket = manualBuckets.get(issue.category) ?? { count: 0, sample: issue.message };
        bucket.count++;
        manualBuckets.set(issue.category, bucket);
      }
    }

    const manualActions: ActionPlan['manualActions'] = [...manualBuckets.entries()]
      .map(([category, { count, sample }]) => ({
        category,
        title: sample,
        detail: MANUAL_HINTS[category] ?? DEFAULT_MANUAL_HINT,
        count,
      }))
      .sort((a, b) => b.count - a.count);

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
