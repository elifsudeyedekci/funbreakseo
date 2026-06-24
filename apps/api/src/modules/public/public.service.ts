import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../email-notification/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  async getPlans() {
    return this.prisma.plan.findMany({
      where: { isPublic: true },
      orderBy: { price: 'asc' },
      select: {
        id: true,
        name: true,
        price: true,
        currency: true,
        interval: true,
        features: true,
        trialDays: true,
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
        content: true,
        excerpt: true,
        locale: true,
        publishedAt: true,
        faqSection: true,
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
    // Queue a quick crawl job (without authentication)
    const job = await this.prisma.queueJob.create({
      data: {
        queueName: 'free-audit',
        jobName: 'audit:quick',
        payload: { domain: dto.domain, email: dto.email },
        status: 'WAITING',
      },
    });

    return { jobId: job.id, message: 'Ücretsiz denetim kuyruğa alındı' };
  }

  async getSitemap(): Promise<string> {
    const baseUrl = this.config.get<string>('FRONTEND_URL', 'https://funbreakseo.com');
    const locales = ['tr', 'en'];

    const blogPosts = await this.prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, locale: true, updatedAt: true },
    });

    const staticPages = ['', '/pricing', '/blog', '/contact', '/about'];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

    // Static pages with hreflang
    for (const page of staticPages) {
      xml += `
  <url>
    <loc>${baseUrl}${page}</loc>
    <changefreq>weekly</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>`;

      for (const locale of locales) {
        xml += `
    <xhtml:link rel="alternate" hreflang="${locale}" href="${baseUrl}/${locale}${page}"/>`;
      }

      xml += `
  </url>`;
    }

    // Blog posts
    for (const post of blogPosts) {
      xml += `
  <url>
    <loc>${baseUrl}/${post.locale}/blog/${post.slug}</loc>
    <lastmod>${post.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
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
Disallow: /admin/
Disallow: /dashboard/

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
