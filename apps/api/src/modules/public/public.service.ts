import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../email-notification/email.service';
import { ConfigService } from '@nestjs/config';
import { DataForSeoService } from '../dataforseo/dataforseo.service';
import { scoreToLetterGrade } from '@funbreakseo/shared';

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly dataForSeo: DataForSeoService,
  ) {}

  async getPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        monthlyPrice: true,
        yearlyPrice: true,
        limits: true,
      },
    });
  }

  async getBlogList(locale?: string, page = 1, limit = 12) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { status: 'PUBLISHED' };
    if (locale) where.locale = locale;

    const [total, posts] = await Promise.all([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          locale: true,
          publishedAt: true,
          seoScore: true,
          geoScore: true,
        },
      }),
    ]);

    return { total, page, limit, data: posts };
  }

  async getBlogBySlug(slug: string) {
    return this.prisma.blogPost.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        bodyHtml: true,
        content: true,
        locale: true,
        publishedAt: true,
        updatedAt: true,
        readingMinutes: true,
        authorName: true,
        faqSection: true,
        jsonLd: true,
        metaTitle: true,
        metaDescription: true,
        focusKeyword: true,
        seoScore: true,
        geoScore: true,
      },
    });
  }

  async handleContact(dto: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    const adminEmail = this.config.get<string>(
      'ADMIN_EMAIL',
      'doganizzetcan@gmail.com',
    );

    await this.emailService.sendMail(
      adminEmail,
      `İletişim Formu: ${dto.subject}`,
      `<p><strong>Ad:</strong> ${dto.name}</p>
       <p><strong>Email:</strong> ${dto.email}</p>
       <p><strong>Konu:</strong> ${dto.subject}</p>
       <p><strong>Mesaj:</strong><br>${dto.message}</p>`,
    );

    // Auto-reply
    await this.emailService.sendMail(
      dto.email,
      'Mesajınızı Aldık — FunBreakSEO',
      `<p>Merhaba ${dto.name},</p>
       <p>Mesajınızı aldık. En kısa sürede size döneceğiz.</p>
       <p>FunBreakSEO Ekibi</p>`,
    );

    return { success: true };
  }

  async handleLead(dto: {
    email: string;
    name: string;
    domain?: string;
    phone?: string;
  }) {
    // Save lead
    await this.prisma.lead.create({
      data: {
        email: dto.email,
        name: dto.name,
        domain: dto.domain,
        phone: dto.phone,
        source: 'LANDING_PAGE',
      },
    });

    const adminEmail = this.config.get<string>(
      'ADMIN_EMAIL',
      'doganizzetcan@gmail.com',
    );

    await this.emailService.sendMail(
      adminEmail,
      `Yeni Lead: ${dto.email}`,
      `<p>Yeni ücretsiz analiz talebi:</p>
       <p>Ad: ${dto.name}</p>
       <p>Email: ${dto.email}</p>
       <p>Domain: ${dto.domain ?? 'Belirtilmedi'}</p>`,
    );

    return { success: true };
  }

  async handleFreeAudit(dto: { domain: string; email?: string }) {
    const domain = dto.domain
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '')
      .toLowerCase();

    // SSRF koruması: IP literal, localhost ve geçersiz alan adlarını reddet
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(domain) || domain.includes(':');
    const isInternal = domain === 'localhost' || domain.endsWith('.local') || domain.endsWith('.internal');
    const isValidDomain = /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain);
    if (isIp || isInternal || !isValidDomain) {
      return {
        domain,
        healthScore: 0,
        overallGrade: 'F-',
        categoryScores: this.emptyCategoryScores(),
        criticalIssues: [{ message: 'Geçerli bir alan adı girin (örn. example.com)', category: 'TECHNICAL' }],
        keywordIdeas: [],
        geoScore: 0,
        summary: 'Geçersiz alan adı.',
        serpPreview: null,
      };
    }

    const result = await this.runQuickAudit(domain);

    // İz bırak (admin görünürlüğü + lead sinyali) — hata analizi engellemesin
    try {
      await this.prisma.queueJob.create({
        data: {
          queueName: 'free-audit',
          jobName: 'audit:quick',
          payload: { domain, email: dto.email, result: JSON.parse(JSON.stringify(result)) },
          status: 'COMPLETED',
        },
      });
    } catch (e) {
      this.logger.warn(`free-audit kaydı yazılamadı: ${(e as Error).message}`);
    }

    return result;
  }

  private emptyCategoryScores() {
    return {
      onPage: { score: 0, grade: 'F-' },
      geo: { score: 0, grade: 'F-' },
      performance: { score: 0, grade: 'F-' },
      usability: { score: 0, grade: 'F-' },
      backlink: { locked: true },
    };
  }

  /**
   * Kayıt gerektirmeyen, 10-15 sn içinde dönen gerçek hızlı analiz.
   * Ana sayfayı çeker, temel on-page SEO kurallarını uygular,
   * DataForSEO'dan (varsa) kelime fikirleri getirir.
   */
  private async runQuickAudit(domain: string) {
    const criticalIssues: Array<{ message: string; category: string }> = [];
    let score = 100;
    let html = '';
    let usedHttps = true;
    let loadTimeMs = 0;

    const fetchPage = async (proto: 'https' | 'http') => {
      const start = Date.now();
      const res = await axios.get(`${proto}://${domain}`, {
        timeout: 10000,
        maxRedirects: 5,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FunBreakSEO-Audit/1.0; +https://funbreakseo.com)' },
        validateStatus: (s) => s < 500,
        responseType: 'text',
        transformResponse: [(d) => d],
      });
      loadTimeMs = Date.now() - start;
      return res;
    };

    try {
      const res = await fetchPage('https');
      if (res.status >= 400) {
        criticalIssues.push({ message: `Ana sayfa ${res.status} durum kodu döndürüyor`, category: 'TECHNICAL' });
        score -= 25;
      }
      html = typeof res.data === 'string' ? res.data : '';
    } catch {
      usedHttps = false;
      try {
        const res = await fetchPage('http');
        html = typeof res.data === 'string' ? res.data : '';
        criticalIssues.push({ message: 'HTTPS bağlantısı kurulamadı — SSL sertifikası eksik veya hatalı', category: 'SECURITY' });
        score -= 20;
      } catch {
        return {
          domain,
          healthScore: 0,
          overallGrade: 'F-',
          categoryScores: this.emptyCategoryScores(),
          criticalIssues: [
            { message: 'Siteye erişilemedi — sunucu yanıt vermiyor veya alan adı hatalı', category: 'TECHNICAL' },
          ],
          keywordIdeas: [],
          geoScore: 0,
          summary: 'Siteye erişilemedi. Alan adını kontrol edip tekrar deneyin.',
          serpPreview: null,
        };
      }
    }

    const lowerHtml = html.toLowerCase();

    // Title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.trim() ?? '';
    if (!title) {
      criticalIssues.push({ message: 'Sayfa başlığı (title) eksik', category: 'TITLE' });
      score -= 12;
    } else if (title.length < 20 || title.length > 65) {
      criticalIssues.push({ message: `Title uzunluğu ideal değil (${title.length} karakter, ideal 20-65)`, category: 'TITLE' });
      score -= 5;
    }

    // Meta description
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const description = metaDesc?.[1]?.trim() ?? '';
    if (!description) {
      criticalIssues.push({ message: 'Meta açıklama (description) eksik', category: 'META' });
      score -= 10;
    } else if (description.length < 70 || description.length > 165) {
      criticalIssues.push({ message: `Meta açıklama uzunluğu ideal değil (${description.length} karakter, ideal 70-160)`, category: 'META' });
      score -= 4;
    }

    // H1
    const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
    if (h1Count === 0) {
      criticalIssues.push({ message: 'Sayfada H1 başlığı yok', category: 'HEADING' });
      score -= 10;
    } else if (h1Count > 1) {
      criticalIssues.push({ message: `Birden fazla H1 var (${h1Count} adet) — tek H1 olmalı`, category: 'HEADING' });
      score -= 5;
    }

    // Canonical
    if (!/rel=["']canonical["']/i.test(html)) {
      criticalIssues.push({ message: 'Canonical etiketi eksik', category: 'TECHNICAL' });
      score -= 5;
    }

    // Viewport (mobil)
    const hasViewport = /name=["']viewport["']/i.test(html);
    if (!hasViewport) {
      criticalIssues.push({ message: 'Viewport meta etiketi yok — mobil uyum sorunu', category: 'MOBILE' });
      score -= 8;
    }

    // Schema / JSON-LD
    const hasSchema = /application\/ld\+json/i.test(html);
    if (!hasSchema) {
      criticalIssues.push({ message: 'Yapılandırılmış veri (Schema/JSON-LD) yok — zengin sonuç ve AI görünürlüğü için kritik', category: 'SCHEMA' });
      score -= 8;
    }

    // Open Graph
    const hasOg = /property=["']og:/i.test(html);
    if (!hasOg) {
      criticalIssues.push({ message: 'Open Graph etiketleri eksik — sosyal paylaşım görünümü zayıf', category: 'META' });
      score -= 3;
    }

    // Alt eksik görseller
    const imgTags = html.match(/<img[^>]*>/gi) ?? [];
    const imgsWithoutAlt = imgTags.filter((tag) => !/alt=["'][^"']+["']/i.test(tag)).length;
    if (imgTags.length > 0 && imgsWithoutAlt > 0) {
      criticalIssues.push({ message: `${imgsWithoutAlt} görselde alt etiketi eksik`, category: 'CONTENT' });
      score -= Math.min(6, imgsWithoutAlt);
    }

    // İçerik uzunluğu
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const wordCount = textContent.split(' ').filter(Boolean).length;
    if (wordCount < 250) {
      criticalIssues.push({ message: `Ana sayfa içeriği çok kısa (${wordCount} kelime)`, category: 'CONTENT' });
      score -= 6;
    }

    // Yüklenme süresi
    if (loadTimeMs > 3000) {
      criticalIssues.push({ message: `Sayfa yavaş yüklendi (${(loadTimeMs / 1000).toFixed(1)} sn)`, category: 'SPEED' });
      score -= 8;
    }

    // robots.txt + sitemap kontrolü (paralel, hatalar yutulur)
    const proto = usedHttps ? 'https' : 'http';
    const [robotsOk, sitemapOk] = await Promise.all([
      axios
        .get(`${proto}://${domain}/robots.txt`, { timeout: 5000, validateStatus: (s) => s < 500 })
        .then((r) => r.status === 200)
        .catch(() => false),
      axios
        .get(`${proto}://${domain}/sitemap.xml`, { timeout: 5000, validateStatus: (s) => s < 500 })
        .then((r) => r.status === 200)
        .catch(() => false),
    ]);
    if (!robotsOk) {
      criticalIssues.push({ message: 'robots.txt bulunamadı', category: 'TECHNICAL' });
      score -= 4;
    }
    if (!sitemapOk) {
      criticalIssues.push({ message: 'sitemap.xml bulunamadı', category: 'TECHNICAL' });
      score -= 5;
    }

    const healthScore = Math.max(0, Math.min(100, Math.round(score)));

    // GEO skoru: AI'ın alıntılayabileceği yapısal sinyaller
    let geoScore = 20;
    if (hasSchema) geoScore += 20;
    if (lowerHtml.includes('faqpage')) geoScore += 15;
    if (title) geoScore += 10;
    if (description) geoScore += 10;
    if (h1Count === 1) geoScore += 10;
    if (hasOg) geoScore += 5;
    if (wordCount >= 500) geoScore += 10;
    geoScore = Math.min(100, geoScore);

    // Kelime fikirleri — DataForSEO varsa gerçek veri, yoksa boş
    let keywordIdeas: Array<{ keyword: string; volume: number }> = [];
    try {
      // Yanıt süresi tavanı: DataForSEO yavaşsa kelimesiz dön (UI 10-15 sn vaat ediyor)
      const kws = await Promise.race([
        this.dataForSeo.getKeywordsForSite(domain, 6),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      keywordIdeas = (kws ?? [])
        .filter((k) => k.keyword)
        .slice(0, 6)
        .map((k) => ({ keyword: k.keyword, volume: k.search_volume ?? 0 }));
    } catch (e) {
      this.logger.warn(`Kelime fikirleri alınamadı (${domain}): ${(e as Error).message}`);
    }

    const summary =
      healthScore >= 80
        ? 'Siteniz genel olarak sağlıklı görünüyor. Küçük iyileştirmelerle daha da öne geçebilirsiniz.'
        : healthScore >= 60
          ? 'Sitenizde iyileştirilebilecek önemli SEO fırsatları var. Sorunları giderirseniz sıralamanız yükselebilir.'
          : 'Sitenizde kritik SEO sorunları var. Bu sorunlar görünürlüğünüzü ciddi şekilde sınırlıyor.';

    // Lightweight category rings — derived ONLY from signals already gathered
    // above (no extra network calls) so the free/anonymous endpoint's latency
    // and DataForSEO cost stay exactly what they were before. Backlinks need
    // a real DataForSEO lookup we deliberately don't run on an anonymous,
    // rate-limited route — the ring is returned locked instead of faked.
    const performanceScore =
      loadTimeMs === 0 ? 50 : loadTimeMs < 1000 ? 95 : loadTimeMs < 2000 ? 85 : loadTimeMs < 3000 ? 70 : loadTimeMs < 5000 ? 50 : 30;
    const usabilityScore = (hasViewport ? 70 : 30) + (imgsWithoutAlt === 0 ? 15 : 0) + (hasSchema ? 15 : 0);

    const categoryScores = {
      onPage: { score: healthScore, grade: scoreToLetterGrade(healthScore) },
      geo: { score: geoScore, grade: scoreToLetterGrade(geoScore) },
      performance: { score: performanceScore, grade: scoreToLetterGrade(performanceScore) },
      usability: { score: Math.min(100, usabilityScore), grade: scoreToLetterGrade(Math.min(100, usabilityScore)) },
      backlink: { locked: true },
    };

    return {
      domain,
      healthScore,
      overallGrade: scoreToLetterGrade(healthScore),
      categoryScores,
      criticalIssues,
      keywordIdeas,
      geoScore,
      summary,
      serpPreview: { url: `https://${domain}`, title: title || domain, description: description || '' },
    };
  }

  async getTestimonials(locale?: string) {
    return this.prisma.testimonial.findMany({
      where: {
        isApproved: true,
        ...(locale ? { locale } : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        authorName: true,
        company: true,
        avatarUrl: true,
        rating: true,
        text: true,
        locale: true,
      },
    });
  }

  async getCaseStudies(locale?: string) {
    return this.prisma.caseStudy.findMany({
      where: {
        isPublished: true,
        ...(locale ? { locale } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        clientName: true,
        industry: true,
        summary: true,
        resultsJson: true,
        coverImageUrl: true,
        locale: true,
      },
    });
  }

  async getCaseStudyBySlug(slug: string) {
    return this.prisma.caseStudy.findFirst({
      where: { slug, isPublished: true },
    });
  }

  async getSitemap(): Promise<string> {
    const baseUrl = this.config.get<string>('FRONTEND_URL', 'https://funbreakseo.com');
    const locales = ['tr', 'en', 'de', 'fr', 'es', 'ar', 'ru', 'hi'];

    const blogPosts = await this.prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, locale: true, updatedAt: true },
    });

    const caseStudies = await this.prisma.caseStudy.findMany({
      where: { isPublished: true },
      select: { slug: true, locale: true, updatedAt: true },
    });

    // Rota adları tüm dillerde aynı (localePrefix: always, pathnames çevrilmiyor)
    const staticPages: Array<{ path: string; priority: string; changefreq: string }> = [
      { path: '', priority: '1.0', changefreq: 'weekly' },
      { path: '/fiyatlandirma', priority: '0.9', changefreq: 'weekly' },
      { path: '/ozellikler', priority: '0.9', changefreq: 'weekly' },
      { path: '/geo', priority: '0.9', changefreq: 'weekly' },
      { path: '/seo', priority: '0.9', changefreq: 'weekly' },
      { path: '/ucretsiz-analiz', priority: '0.9', changefreq: 'weekly' },
      { path: '/blog', priority: '0.8', changefreq: 'daily' },
      { path: '/vaka-calismalari', priority: '0.7', changefreq: 'weekly' },
      { path: '/hakkimizda', priority: '0.6', changefreq: 'monthly' },
      { path: '/iletisim', priority: '0.6', changefreq: 'monthly' },
      { path: '/sss', priority: '0.6', changefreq: 'monthly' },
      { path: '/kvkk', priority: '0.3', changefreq: 'yearly' },
      { path: '/gizlilik-politikasi', priority: '0.3', changefreq: 'yearly' },
      { path: '/kullanim-sartlari', priority: '0.3', changefreq: 'yearly' },
      { path: '/cerez-politikasi', priority: '0.3', changefreq: 'yearly' },
      { path: '/mesafeli-satis-sozlesmesi', priority: '0.3', changefreq: 'yearly' },
      { path: '/iade-ve-iptal', priority: '0.3', changefreq: 'yearly' },
    ];

    const featureSlugs = [
      'seo-tarama',
      'icerik-motoru',
      'geo-ai-gorunurluk',
      'backlink-market',
      'outreach',
      'anahtar-kelime-takibi',
      'siralama-takibi',
      'anahtar-kelime',
      'site-denetimi',
      'ai-icerik-uretimi',
      'backlink-analizi',
      'rakip-analizi',
      'raporlama',
      'white-label',
      'cok-dilli-seo',
      'autopilot',
    ];
    for (const slug of featureSlugs) {
      staticPages.push({ path: `/ozellikler/${slug}`, priority: '0.8', changefreq: 'monthly' });
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

    // Statik sayfalar: her locale için ayrı <url> + tüm dillere hreflang alternates + x-default
    for (const page of staticPages) {
      const alternates = [
        ...locales.map(
          (l) =>
            `
    <xhtml:link rel="alternate" hreflang="${l}" href="${baseUrl}/${l}${page.path}"/>`,
        ),
        `
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/tr${page.path}"/>`,
      ].join('');

      for (const locale of locales) {
        xml += `
  <url>
    <loc>${baseUrl}/${locale}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${alternates}
  </url>`;
      }
    }

    // Blog yazıları (her yazı kendi dilinde özgün içerik — hreflang yok)
    for (const post of blogPosts) {
      xml += `
  <url>
    <loc>${baseUrl}/${post.locale}/blog/${post.slug}</loc>
    <lastmod>${post.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    // Vaka çalışmaları
    for (const cs of caseStudies) {
      xml += `
  <url>
    <loc>${baseUrl}/${cs.locale}/vaka-calismalari/${cs.slug}</loc>
    <lastmod>${cs.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;
    }

    xml += '\n</urlset>';
    return xml;
  }

  getRobotsTxt(): string {
    const baseUrl = this.config.get<string>('FRONTEND_URL', 'https://funbreakseo.com');
    return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /*/dashboard
Disallow: /*/giris
Disallow: /*/kayit
Disallow: /*/sifremi-unuttum

Sitemap: ${baseUrl}/sitemap.xml`;
  }

  async getRssFeed(): Promise<string> {
    const baseUrl = this.config.get<string>('FRONTEND_URL', 'https://funbreakseo.com');

    const posts = await this.prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        locale: true,
        publishedAt: true,
      },
    });

    let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>FunBreakSEO Blog</title>
    <link>${baseUrl}/blog</link>
    <description>SEO ve GEO içerikleri</description>
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`;

    for (const post of posts) {
      rss += `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/${post.locale}/blog/${post.slug}</link>
      <description><![CDATA[${post.excerpt ?? ''}]]></description>
      <pubDate>${post.publishedAt?.toUTCString() ?? ''}</pubDate>
      <guid>${baseUrl}/${post.locale}/blog/${post.slug}</guid>
    </item>`;
    }

    rss += `
  </channel>
</rss>`;

    return rss;
  }
}
