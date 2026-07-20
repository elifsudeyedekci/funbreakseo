import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../email-notification/email.service';

// ─── Tipler ──────────────────────────────────────────────────────────────────

interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscTotals {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Ga4Totals {
  users: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDurationSec: number;
}

export interface MonthlyReportData {
  project: { id: string; name: string; domain: string; organization: string };
  period: { start: string; end: string; label: string };
  prevPeriod: { start: string; end: string };
  gscConnected: boolean;
  analytics: {
    connected: boolean;
    current: Ga4Totals;
    previous: Ga4Totals;
    channels: Array<{ channel: string; sessions: number; users: number }>;
    daily: Array<{ date: string; sessions: number; users: number; newUsers: number; pageViews: number }>;
    devices: Array<{ device: string; sessions: number }>;
    countries: Array<{ country: string; sessions: number }>;
  };
  organic: {
    current: GscTotals;
    previous: GscTotals;
    daily: Array<{ date: string; clicks: number; impressions: number }>;
    dailyPrevious: Array<{ date: string; clicks: number; impressions: number }>;
    topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
    topPages: Array<{ page: string; clicks: number; impressions: number }>;
    devices: Array<{ device: string; clicks: number; impressions: number }>;
    countries: Array<{ country: string; clicks: number; impressions: number }>;
  };
  keywords: {
    total: number;
    inTop3: number;
    inTop10: number;
    avgPosition: number;
    distribution: { top3: number; top10: number; top20: number; top50: number; top100: number; none: number };
    movers: Array<{ phrase: string; position: number | null; previous: number | null; change: number }>;
  };
  technical: { healthScore: number; pagesScanned: number; issuesFound: number; criticalIssues: number } | null;
  backlinks: { total: number; referringDomains: number; avgDr: number; newThisMonth: number };
  geo: {
    mentionCount: number;
    citationCount: number;
    citationRatio: number;
    totalChecks: number;
    byPlatform: Record<string, { mentions: number; citations: number }> | null;
  };
  recommendations: Array<{ priority: string; text: string }>;
  generatedAt: string;
}

// ─── Servis ──────────────────────────────────────────────────────────────────

@Injectable()
export class MonthlyReportService {
  private readonly logger = new Logger(MonthlyReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  // ── GSC erişimi (org seviyesindeki token'larla — keyword.service ile aynı desen) ──

  private async getGscToken(organizationId: string): Promise<string | null> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{
        id: string;
        gscAccessToken: string | null;
        gscRefreshToken: string | null;
        gscTokenExpiry: Date | null;
      }>>`
        SELECT id, "gscAccessToken", "gscRefreshToken", "gscTokenExpiry"
        FROM organizations WHERE id = ${organizationId} LIMIT 1
      `;
      const org = rows[0];
      if (!org) return null;

      let token = org.gscAccessToken;
      const expiryMs = org.gscTokenExpiry ? org.gscTokenExpiry.getTime() : 0;
      if (!token || expiryMs < Date.now() + 5 * 60 * 1000) {
        if (!org.gscRefreshToken) return null;
        const { data } = await axios.post<{ access_token: string; expires_in: number }>(
          'https://oauth2.googleapis.com/token',
          {
            refresh_token: org.gscRefreshToken,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token',
          },
        );
        token = data.access_token;
        const newExpiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
        await this.prisma.$executeRaw`
          UPDATE organizations
          SET "gscAccessToken" = ${token}, "gscTokenExpiry" = ${newExpiry}, "updatedAt" = NOW()
          WHERE id = ${org.id}
        `;
      }
      return token;
    } catch (e) {
      this.logger.warn(`GSC token alınamadı (org=${organizationId}): ${(e as Error).message}`);
      return null;
    }
  }

  private async queryGsc(
    domain: string,
    token: string,
    body: { startDate: string; endDate: string; dimensions?: string[]; rowLimit?: number },
  ): Promise<GscRow[]> {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    try {
      const { data } = await axios.post<{ rows?: GscRow[] }>(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(`sc-domain:${cleanDomain}`)}/searchAnalytics/query`,
        { rowLimit: 250, ...body },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 20_000 },
      );
      return data.rows ?? [];
    } catch (e) {
      this.logger.warn(`GSC sorgusu başarısız (${cleanDomain}): ${(e as Error).message}`);
      return [];
    }
  }

  // ── GA4 erişimi (aynı Google token'ı — analytics.readonly scope'u ile) ──────

  /** Projenin GA4 property'sini bul: kayıtlıysa onu kullan, değilse hesaptan eşleştir ve kaydet */
  private async resolveGa4PropertyId(projectId: string, domain: string, token: string): Promise<string | null> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ ga4PropertyId: string | null }>>`
        SELECT "ga4PropertyId" FROM projects WHERE id = ${projectId} LIMIT 1
      `;
      if (rows[0]?.ga4PropertyId) return rows[0].ga4PropertyId;

      // Hesaptaki property'leri listele ve domain'e eşleştirmeye çalış
      const { data } = await axios.get<{
        accountSummaries?: Array<{
          propertySummaries?: Array<{ property: string; displayName: string }>;
        }>;
      }>('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15_000,
      });

      const properties = (data.accountSummaries ?? []).flatMap((a) => a.propertySummaries ?? []);
      if (properties.length === 0) return null;

      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      const domainRoot = cleanDomain.split('.')[0].toLowerCase();
      const match =
        properties.find((p) => p.displayName.toLowerCase().includes(cleanDomain.toLowerCase())) ??
        properties.find((p) => p.displayName.toLowerCase().includes(domainRoot)) ??
        (properties.length === 1 ? properties[0] : null);

      if (!match) return null;
      const propertyId = match.property.replace('properties/', '');
      await this.prisma.$executeRaw`
        UPDATE projects SET "ga4PropertyId" = ${propertyId}, "updatedAt" = NOW() WHERE id = ${projectId}
      `;
      this.logger.log(`GA4 property eşleşti: ${domain} → ${propertyId} (${match.displayName})`);
      return propertyId;
    } catch (e) {
      this.logger.warn(`GA4 property bulunamadı (${domain}): ${(e as Error).message}`);
      return null;
    }
  }

  private async queryGa4(
    propertyId: string,
    token: string,
    body: Record<string, unknown>,
  ): Promise<Array<{ dimensionValues?: Array<{ value: string }>; metricValues?: Array<{ value: string }> }>> {
    try {
      const { data } = await axios.post<{
        rows?: Array<{ dimensionValues?: Array<{ value: string }>; metricValues?: Array<{ value: string }> }>;
      }>(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, body, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20_000,
      });
      return data.rows ?? [];
    } catch (e) {
      this.logger.warn(`GA4 sorgusu başarısız (${propertyId}): ${(e as Error).message}`);
      return [];
    }
  }

  private ga4Totals(rows: Array<{ metricValues?: Array<{ value: string }> }>): Ga4Totals {
    const m = rows[0]?.metricValues ?? [];
    const n = (i: number) => parseFloat(m[i]?.value ?? '0') || 0;
    return {
      users: n(0),
      sessions: n(1),
      pageViews: n(2),
      bounceRate: n(3) * 100, // GA4 bounceRate 0-1 arası döner
      avgSessionDurationSec: n(4),
    };
  }

  private sumRows(rows: GscRow[]): GscTotals {
    const clicks = rows.reduce((s, r) => s + r.clicks, 0);
    const impressions = rows.reduce((s, r) => s + r.impressions, 0);
    const position =
      rows.length > 0 ? rows.reduce((s, r) => s + r.position * r.impressions, 0) / Math.max(1, impressions) : 0;
    return {
      clicks,
      impressions,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      position,
    };
  }

  // ── Rapor verisi ────────────────────────────────────────────────────────────

  async buildReportData(projectId: string, monthOffset = 0): Promise<MonthlyReportData> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { organization: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    // Dönem: geçen tam ay (monthOffset=0 → bir önceki ay; admin anlık isterse bu ay-to-date)
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - monthOffset, 0); // önceki ayın son günü
    const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
    const prevEnd = new Date(periodStart.getTime() - 86_400_000);
    const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
    const d = (x: Date) => x.toISOString().split('T')[0];

    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
    ];
    const periodLabel = `${monthNames[periodStart.getMonth()]} ${periodStart.getFullYear()}`;

    // ── GSC ──
    const token = await this.getGscToken(project.organizationId);
    const gscConnected = !!token;
    let currentTotals: GscTotals = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    let previousTotals: GscTotals = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    let daily: MonthlyReportData['organic']['daily'] = [];
    let dailyPrevious: MonthlyReportData['organic']['dailyPrevious'] = [];
    let topQueries: MonthlyReportData['organic']['topQueries'] = [];
    let topPages: MonthlyReportData['organic']['topPages'] = [];
    let devices: MonthlyReportData['organic']['devices'] = [];
    let countries: MonthlyReportData['organic']['countries'] = [];

    if (token) {
      const range = { startDate: d(periodStart), endDate: d(periodEnd) };
      const prevRange = { startDate: d(prevStart), endDate: d(prevEnd) };

      const [curRows, prevRows, dateRows, prevDateRows, queryRows, pageRows, deviceRows, countryRows] = await Promise.all([
        this.queryGsc(project.domain, token, { ...range }),
        this.queryGsc(project.domain, token, { ...prevRange }),
        this.queryGsc(project.domain, token, { ...range, dimensions: ['date'], rowLimit: 40 }),
        // Previous-period daily too — powers the "this month vs last month"
        // dual-line clicks/impressions chart.
        this.queryGsc(project.domain, token, { ...prevRange, dimensions: ['date'], rowLimit: 40 }),
        this.queryGsc(project.domain, token, { ...range, dimensions: ['query'], rowLimit: 25 }),
        this.queryGsc(project.domain, token, { ...range, dimensions: ['page'], rowLimit: 15 }),
        this.queryGsc(project.domain, token, { ...range, dimensions: ['device'], rowLimit: 5 }),
        this.queryGsc(project.domain, token, { ...range, dimensions: ['country'], rowLimit: 10 }),
      ]);

      currentTotals = this.sumRows(curRows);
      previousTotals = this.sumRows(prevRows);
      daily = dateRows
        .map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions }))
        .sort((a, b) => a.date.localeCompare(b.date));
      dailyPrevious = prevDateRows
        .map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions }))
        .sort((a, b) => a.date.localeCompare(b.date));
      topQueries = queryRows.map((r) => ({
        query: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr * 100,
        position: r.position,
      }));
      topPages = pageRows.map((r) => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions }));
      devices = deviceRows.map((r) => ({ device: r.keys[0], clicks: r.clicks, impressions: r.impressions }));
      countries = countryRows.map((r) => ({ country: r.keys[0], clicks: r.clicks, impressions: r.impressions }));
    }

    // ── GA4 (Google Analytics) ──
    const zeroGa4: Ga4Totals = { users: 0, sessions: 0, pageViews: 0, bounceRate: 0, avgSessionDurationSec: 0 };
    let ga4Connected = false;
    let ga4Current = zeroGa4;
    let ga4Previous = zeroGa4;
    let ga4Channels: MonthlyReportData['analytics']['channels'] = [];
    let ga4Daily: MonthlyReportData['analytics']['daily'] = [];
    let ga4Devices: MonthlyReportData['analytics']['devices'] = [];
    let ga4Countries: MonthlyReportData['analytics']['countries'] = [];

    if (token) {
      const propertyId = await this.resolveGa4PropertyId(project.id, project.domain, token);
      if (propertyId) {
        const metrics = [
          { name: 'totalUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ];
        const [curRows, prevRows, channelRows, sourceRows, dailyRows, deviceRows, countryRows] = await Promise.all([
          this.queryGa4(propertyId, token, {
            dateRanges: [{ startDate: d(periodStart), endDate: d(periodEnd) }],
            metrics,
          }),
          this.queryGa4(propertyId, token, {
            dateRanges: [{ startDate: d(prevStart), endDate: d(prevEnd) }],
            metrics,
          }),
          this.queryGa4(propertyId, token, {
            dateRanges: [{ startDate: d(periodStart), endDate: d(periodEnd) }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 10,
          }),
          // GA4's default channel grouping has no "AI Assistant" bucket —
          // chatgpt.com/perplexity.ai/etc referrals land under Referral or
          // Organic Search. Query raw session source separately so we can
          // surface AI-assistant-driven traffic as its own row (a GEO sales
          // signal) — additive, not a replacement of the standard grouping.
          this.queryGa4(propertyId, token, {
            dateRanges: [{ startDate: d(periodStart), endDate: d(periodEnd) }],
            dimensions: [{ name: 'sessionSource' }],
            metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 50,
          }),
          // Daily trend (sessions/users/newUsers) + device + country breakdown
          // — power the audit page / PDF report's GA4 line and donut charts.
          this.queryGa4(propertyId, token, {
            dateRanges: [{ startDate: d(periodStart), endDate: d(periodEnd) }],
            dimensions: [{ name: 'date' }],
            metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'newUsers' }, { name: 'screenPageViews' }],
            orderBys: [{ dimension: { dimensionName: 'date' } }],
            limit: 40,
          }),
          this.queryGa4(propertyId, token, {
            dateRanges: [{ startDate: d(periodStart), endDate: d(periodEnd) }],
            dimensions: [{ name: 'deviceCategory' }],
            metrics: [{ name: 'sessions' }],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 5,
          }),
          this.queryGa4(propertyId, token, {
            dateRanges: [{ startDate: d(periodStart), endDate: d(periodEnd) }],
            dimensions: [{ name: 'country' }],
            metrics: [{ name: 'sessions' }],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 10,
          }),
        ]);

        if (curRows.length > 0 || prevRows.length > 0) {
          ga4Connected = true;
          ga4Current = this.ga4Totals(curRows);
          ga4Previous = this.ga4Totals(prevRows);
          ga4Channels = channelRows.map((r) => ({
            channel: r.dimensionValues?.[0]?.value ?? '?',
            sessions: parseFloat(r.metricValues?.[0]?.value ?? '0') || 0,
            users: parseFloat(r.metricValues?.[1]?.value ?? '0') || 0,
          }));

          const aiSources = ['chatgpt.com', 'perplexity.ai', 'gemini.google.com', 'claude.ai', 'copilot.microsoft.com'];
          let aiSessions = 0;
          let aiUsers = 0;
          for (const r of sourceRows) {
            const source = (r.dimensionValues?.[0]?.value ?? '').toLowerCase();
            if (aiSources.some((s) => source.includes(s))) {
              aiSessions += parseFloat(r.metricValues?.[0]?.value ?? '0') || 0;
              aiUsers += parseFloat(r.metricValues?.[1]?.value ?? '0') || 0;
            }
          }
          if (aiSessions > 0) {
            ga4Channels.push({ channel: 'AI Assistant (ChatGPT, Perplexity vb.)', sessions: aiSessions, users: aiUsers });
          }

          ga4Daily = dailyRows
            .map((r) => {
              const raw = r.dimensionValues?.[0]?.value ?? '';
              const date = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
              return {
                date,
                sessions: parseFloat(r.metricValues?.[0]?.value ?? '0') || 0,
                users: parseFloat(r.metricValues?.[1]?.value ?? '0') || 0,
                newUsers: parseFloat(r.metricValues?.[2]?.value ?? '0') || 0,
                pageViews: parseFloat(r.metricValues?.[3]?.value ?? '0') || 0,
              };
            })
            .sort((a, b) => a.date.localeCompare(b.date));
          ga4Devices = deviceRows.map((r) => ({
            device: r.dimensionValues?.[0]?.value ?? '?',
            sessions: parseFloat(r.metricValues?.[0]?.value ?? '0') || 0,
          }));
          ga4Countries = countryRows.map((r) => ({
            country: r.dimensionValues?.[0]?.value ?? '?',
            sessions: parseFloat(r.metricValues?.[0]?.value ?? '0') || 0,
          }));
        }
      }
    }

    // ── Takip edilen kelimeler ──
    const keywords = await this.prisma.keyword.findMany({
      where: { projectId },
      include: { ranks: { orderBy: { checkedAt: 'desc' }, take: 2 } },
    });
    const dist = { top3: 0, top10: 0, top20: 0, top50: 0, top100: 0, none: 0 };
    let posSum = 0;
    let posCount = 0;
    const movers: MonthlyReportData['keywords']['movers'] = [];
    for (const kw of keywords) {
      const cur = kw.ranks[0]?.position ?? null;
      const prev = kw.ranks[1]?.position ?? null;
      if (cur === null) dist.none++;
      else if (cur <= 3) dist.top3++;
      else if (cur <= 10) dist.top10++;
      else if (cur <= 20) dist.top20++;
      else if (cur <= 50) dist.top50++;
      else dist.top100++;
      if (cur !== null) {
        posSum += cur;
        posCount++;
      }
      movers.push({
        phrase: kw.phrase,
        position: cur,
        previous: prev,
        change: cur !== null && prev !== null ? prev - cur : 0,
      });
    }
    movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    // ── Teknik ──
    const latestCrawl = await this.prisma.crawlJob.findFirst({
      where: { projectId, status: 'DONE' },
      orderBy: { createdAt: 'desc' },
    });
    let criticalIssues = 0;
    if (latestCrawl) {
      criticalIssues = await this.prisma.seoIssue.count({
        where: { crawlJobId: latestCrawl.id, severity: 'CRITICAL', fixed: false },
      });
    }

    // ── Backlink ──
    const backlinks = await this.prisma.backlink.findMany({
      where: { projectId },
      select: { sourceDomain: true, domainRating: true, createdAt: true },
    });
    const refDomains = new Set(backlinks.map((b) => b.sourceDomain)).size;
    const avgDr =
      backlinks.length > 0
        ? backlinks.reduce((s, b) => s + (b.domainRating ?? 0), 0) / backlinks.length
        : 0;
    const newThisMonth = backlinks.filter((b) => b.createdAt >= periodStart).length;

    // ── GEO ──
    const geoSnapshot = await this.prisma.geoVisibilitySnapshot.findFirst({
      where: { projectId },
      orderBy: { date: 'desc' },
    });
    const geoResults = await this.prisma.geoResult.findMany({
      where: { geoQuery: { projectId }, checkedAt: { gte: periodStart } },
      select: { brandMentioned: true, brandCited: true, platform: true },
    });
    const mentionCount = geoSnapshot?.mentionCount ?? geoResults.filter((g) => g.brandMentioned).length;
    const citationCount = geoSnapshot?.citationCount ?? geoResults.filter((g) => g.brandCited).length;

    // ── Öneriler ──
    const recommendations: Array<{ priority: string; text: string }> = [];
    if (latestCrawl && Number(latestCrawl.healthScore ?? 0) < 70) {
      recommendations.push({
        priority: 'YÜKSEK',
        text: `Site sağlık skoru ${latestCrawl.healthScore}/100 — ${criticalIssues} kritik sorunun giderilmesi taranabilirliği ve sıralamayı doğrudan iyileştirir.`,
      });
    }
    if (currentTotals.clicks < previousTotals.clicks && gscConnected) {
      recommendations.push({
        priority: 'YÜKSEK',
        text: 'Organik tıklamalar önceki aya göre düştü. Pozisyon kaybeden kelimeler için içerik tazeleme ve iç bağlantı güçlendirmesi önerilir.',
      });
    }
    if (mentionCount > 0 && citationCount / Math.max(1, mentionCount) < 0.1) {
      recommendations.push({
        priority: 'ORTA',
        text: 'AI cevaplarında adınız geçiyor ama kaynak gösterilmiyorsunuz (citation oranı %10 altı). İçerikleri cevap-önce formatına çevirin ve FAQ schema ekleyin.',
      });
    }
    if (dist.top3 + dist.top10 < keywords.length * 0.2 && keywords.length > 0) {
      recommendations.push({
        priority: 'ORTA',
        text: 'Kelimelerinizin %20\'sinden azı ilk sayfada. Düşük rekabetli uzun kuyruk kelimelere yönelik yeni içerikler hızlı kazanım sağlar.',
      });
    }
    if (newThisMonth === 0) {
      recommendations.push({
        priority: 'ORTA',
        text: 'Bu ay yeni backlink kazanılmadı. Outreach kampanyası veya backlink marketi ile otorite inşasına devam edin.',
      });
    }
    if (!gscConnected) {
      recommendations.push({
        priority: 'YÜKSEK',
        text: 'Google Search Console bağlı değil. Bağlandığında raporlarınız gerçek tıklama/gösterim verileriyle zenginleşir.',
      });
    }

    return {
      project: {
        id: project.id,
        name: project.name,
        domain: project.domain,
        organization: project.organization.name,
      },
      period: { start: d(periodStart), end: d(periodEnd), label: periodLabel },
      prevPeriod: { start: d(prevStart), end: d(prevEnd) },
      gscConnected,
      analytics: {
        connected: ga4Connected,
        current: ga4Current,
        previous: ga4Previous,
        channels: ga4Channels,
        daily: ga4Daily,
        devices: ga4Devices,
        countries: ga4Countries,
      },
      organic: {
        current: currentTotals,
        previous: previousTotals,
        daily,
        dailyPrevious,
        topQueries,
        topPages,
        devices,
        countries,
      },
      keywords: {
        total: keywords.length,
        inTop3: dist.top3,
        inTop10: dist.top3 + dist.top10,
        avgPosition: posCount > 0 ? posSum / posCount : 0,
        distribution: dist,
        movers: movers.slice(0, 25),
      },
      technical: latestCrawl
        ? {
            healthScore: Number(latestCrawl.healthScore ?? 0),
            pagesScanned: latestCrawl.pagesScanned ?? 0,
            issuesFound: latestCrawl.issuesFound ?? 0,
            criticalIssues,
          }
        : null,
      backlinks: { total: backlinks.length, referringDomains: refDomains, avgDr, newThisMonth },
      geo: {
        mentionCount,
        citationCount,
        citationRatio: mentionCount > 0 ? (citationCount / mentionCount) * 100 : 0,
        totalChecks: geoResults.length,
        byPlatform: (geoSnapshot?.byPlatform as Record<string, { mentions: number; citations: number }> | null) ?? null,
      },
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── HTML şablonu (mavi/beyaz profesyonel, inline SVG grafikler) ─────────────

  renderHtml(r: MonthlyReportData): string {
    const fmt = (n: number) => Math.round(n).toLocaleString('tr-TR');
    const pct = (n: number) => `%${n.toFixed(1)}`;
    const delta = (cur: number, prev: number) => {
      if (prev === 0) return cur > 0 ? '<span class="up">Yeni</span>' : '<span class="flat">—</span>';
      const ch = ((cur - prev) / prev) * 100;
      if (Math.abs(ch) < 0.5) return '<span class="flat">—</span>';
      return ch > 0
        ? `<span class="up">▲ %${ch.toFixed(1)}</span>`
        : `<span class="down">▼ %${Math.abs(ch).toFixed(1)}</span>`;
    };

    // Günlük tıklama/gösterim çizgi grafiği (inline SVG)
    const chartSvg = (() => {
      const pts = r.organic.daily;
      if (pts.length < 2) return '<p class="muted">Bu dönem için günlük veri yok.</p>';
      const W = 680;
      const H = 180;
      const P = 30;
      const maxClicks = Math.max(...pts.map((p) => p.clicks), 1);
      const maxImp = Math.max(...pts.map((p) => p.impressions), 1);
      const x = (i: number) => P + (i / (pts.length - 1)) * (W - 2 * P);
      const yC = (v: number) => H - P - (v / maxClicks) * (H - 2 * P);
      const yI = (v: number) => H - P - (v / maxImp) * (H - 2 * P);
      const lineC = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${yC(p.clicks).toFixed(1)}`).join(' ');
      const lineI = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${yI(p.impressions).toFixed(1)}`).join(' ');
      const areaC = `${lineC} L${x(pts.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`;
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">
        <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="#dbe4f0" stroke-width="1"/>
        <path d="${areaC}" fill="rgba(37,99,235,0.10)"/>
        <path d="${lineI}" fill="none" stroke="#93c5fd" stroke-width="1.5" stroke-dasharray="4 3"/>
        <path d="${lineC}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round"/>
        <text x="${P}" y="14" font-size="10" fill="#2563eb">— Tıklama (maks ${fmt(maxClicks)})</text>
        <text x="${P + 170}" y="14" font-size="10" fill="#60a5fa">- - Gösterim (maks ${fmt(maxImp)})</text>
      </svg>`;
    })();

    // Pozisyon dağılım bar grafiği
    const distSvg = (() => {
      const dEntries: Array<[string, number, string]> = [
        ['1-3', r.keywords.distribution.top3, '#16a34a'],
        ['4-10', r.keywords.distribution.top10, '#2563eb'],
        ['11-20', r.keywords.distribution.top20, '#60a5fa'],
        ['21-50', r.keywords.distribution.top50, '#93c5fd'],
        ['51-100', r.keywords.distribution.top100, '#c7d7ee'],
        ['Yok', r.keywords.distribution.none, '#e2e8f0'],
      ];
      const max = Math.max(...dEntries.map(([, v]) => v), 1);
      const W = 680;
      const H = 150;
      const bw = 80;
      const gap = (W - dEntries.length * bw) / (dEntries.length + 1);
      const bars = dEntries
        .map(([label, v, color], i) => {
          const h = (v / max) * 90;
          const bx = gap + i * (bw + gap);
          const by = 110 - h;
          return `<rect x="${bx}" y="${by}" width="${bw}" height="${h}" rx="4" fill="${color}"/>
            <text x="${bx + bw / 2}" y="${by - 5}" font-size="12" font-weight="600" fill="#1e3a5f" text-anchor="middle">${v}</text>
            <text x="${bx + bw / 2}" y="130" font-size="10" fill="#64748b" text-anchor="middle">${label}</text>`;
        })
        .join('');
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
    })();

    const deviceLabels: Record<string, string> = { MOBILE: 'Mobil', DESKTOP: 'Masaüstü', TABLET: 'Tablet' };

    const queriesRows = r.organic.topQueries
      .slice(0, 20)
      .map(
        (q, i) => `<tr><td class="num">${i + 1}</td><td>${escapeHtml(q.query)}</td><td class="num">${q.position.toFixed(1)}</td><td class="num">${fmt(q.clicks)}</td><td class="num">${fmt(q.impressions)}</td><td class="num">${pct(q.ctr)}</td></tr>`,
      )
      .join('');

    const pagesRows = r.organic.topPages
      .slice(0, 10)
      .map(
        (p, i) =>
          `<tr><td class="num">${i + 1}</td><td class="url">${escapeHtml(p.page.replace(/^https?:\/\/[^/]+/, '') || '/')}</td><td class="num">${fmt(p.clicks)}</td><td class="num">${fmt(p.impressions)}</td></tr>`,
      )
      .join('');

    const moverRows = r.keywords.movers
      .slice(0, 20)
      .map((m) => {
        const chBadge =
          m.change > 0
            ? `<span class="up">▲ ${m.change}</span>`
            : m.change < 0
              ? `<span class="down">▼ ${Math.abs(m.change)}</span>`
              : '<span class="flat">—</span>';
        return `<tr><td>${escapeHtml(m.phrase)}</td><td class="num">${m.position ?? '—'}</td><td class="num">${m.previous ?? '—'}</td><td class="num">${chBadge}</td></tr>`;
      })
      .join('');

    const recRows = r.recommendations
      .map(
        (rec) =>
          `<div class="rec"><span class="prio ${rec.priority === 'YÜKSEK' ? 'high' : 'mid'}">${rec.priority}</span><span>${escapeHtml(rec.text)}</span></div>`,
      )
      .join('');

    const platformRows = r.geo.byPlatform
      ? Object.entries(r.geo.byPlatform)
          .map(
            ([platform, v]) =>
              `<tr><td>${escapeHtml(platform)}</td><td class="num">${v?.mentions ?? 0}</td><td class="num">${v?.citations ?? 0}</td></tr>`,
          )
          .join('')
      : '';

    const gscNote = r.gscConnected
      ? ''
      : '<p class="warn">Google Search Console bağlı olmadığı için organik trafik bölümü sınırlıdır. Panelden GSC bağlantısı yaptığınızda bu bölüm gerçek tıklama/gösterim verileriyle dolar.</p>';

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 12px; background: #fff; }
  .page { page-break-after: always; padding: 36px 44px; }
  .page:last-child { page-break-after: auto; }

  /* Kapak */
  .cover { display: flex; flex-direction: column; justify-content: center; min-height: 90vh;
           background: linear-gradient(160deg, #1d4ed8 0%, #2563eb 45%, #3b82f6 100%); color: #fff;
           border-radius: 0; padding: 60px; }
  .cover .logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 60px; }
  .cover .logo span { opacity: 0.85; font-weight: 400; }
  .cover h1 { font-size: 34px; font-weight: 800; line-height: 1.2; margin-bottom: 14px; }
  .cover .domain { font-size: 20px; opacity: 0.9; margin-bottom: 6px; }
  .cover .range { font-size: 14px; opacity: 0.7; }
  .cover .footer { margin-top: auto; font-size: 11px; opacity: 0.65; }

  h2 { font-size: 17px; color: #1d4ed8; margin: 0 0 4px; font-weight: 700; }
  .sub { color: #64748b; font-size: 11px; margin-bottom: 16px; }
  .section { margin-bottom: 28px; }

  .kpis { display: flex; gap: 12px; margin-bottom: 18px; }
  .kpi { flex: 1; border: 1px solid #dbe4f0; border-radius: 10px; padding: 14px; background: #f8fafc; }
  .kpi .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 6px; }
  .kpi .value { font-size: 22px; font-weight: 800; color: #0f172a; }
  .kpi .delta { font-size: 11px; margin-top: 4px; }

  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #1d4ed8; color: #fff; text-align: left; padding: 8px 10px; font-weight: 600; }
  td { padding: 7px 10px; border-bottom: 1px solid #e8eef7; }
  tr:nth-child(even) td { background: #f6f9fd; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td.url { word-break: break-all; max-width: 340px; }

  .up { color: #16a34a; font-weight: 700; }
  .down { color: #dc2626; font-weight: 700; }
  .flat { color: #94a3b8; }
  .warn { background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 10px 12px; color: #854d0e; margin-bottom: 14px; }

  .chart { border: 1px solid #dbe4f0; border-radius: 10px; padding: 14px; background: #fff; }

  .rec { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 1px solid #dbe4f0;
         border-radius: 8px; margin-bottom: 8px; background: #f8fafc; }
  .prio { flex-shrink: 0; font-size: 9px; font-weight: 800; padding: 3px 8px; border-radius: 20px; letter-spacing: 0.05em; }
  .prio.high { background: #fee2e2; color: #b91c1c; }
  .prio.mid { background: #dbeafe; color: #1d4ed8; }

  .pagehead { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1d4ed8;
              padding-bottom: 10px; margin-bottom: 22px; }
  .pagehead .brand { font-weight: 800; color: #1d4ed8; font-size: 13px; }
  .pagehead .meta { color: #94a3b8; font-size: 10px; }
</style>
</head>
<body>

<!-- KAPAK -->
<div class="page cover">
  <div class="logo">FunBreak <span>SEO</span></div>
  <h1>Aylık SEO &amp; GEO Performans Raporu</h1>
  <div class="domain">${escapeHtml(r.project.domain)}</div>
  <div class="range">${r.period.label} · ${r.period.start} — ${r.period.end}</div>
  <div class="footer">${escapeHtml(r.project.organization)} için hazırlandı · funbreakseo.com</div>
</div>

<!-- ORGANİK TRAFİK -->
<div class="page">
  <div class="pagehead"><span class="brand">FunBreak SEO</span><span class="meta">${escapeHtml(r.project.domain)} · ${r.period.label}</span></div>

  ${
    r.analytics.connected
      ? `<div class="section">
    <h2>Genel Trafik (Google Analytics)</h2>
    <p class="sub">GA4 verileri — önceki ayla karşılaştırmalı</p>
    <div class="kpis">
      <div class="kpi"><div class="label">Kullanıcı</div><div class="value">${fmt(r.analytics.current.users)}</div><div class="delta">${delta(r.analytics.current.users, r.analytics.previous.users)}</div></div>
      <div class="kpi"><div class="label">Oturum</div><div class="value">${fmt(r.analytics.current.sessions)}</div><div class="delta">${delta(r.analytics.current.sessions, r.analytics.previous.sessions)}</div></div>
      <div class="kpi"><div class="label">Görüntüleme</div><div class="value">${fmt(r.analytics.current.pageViews)}</div><div class="delta">${delta(r.analytics.current.pageViews, r.analytics.previous.pageViews)}</div></div>
      <div class="kpi"><div class="label">Hemen Çıkma</div><div class="value">${pct(r.analytics.current.bounceRate)}</div><div class="delta">${
        r.analytics.previous.bounceRate > 0 && r.analytics.current.bounceRate < r.analytics.previous.bounceRate
          ? '<span class="up">▲ İyileşti</span>'
          : r.analytics.previous.bounceRate > 0 && r.analytics.current.bounceRate > r.analytics.previous.bounceRate
            ? '<span class="down">▼ Yükseldi</span>'
            : '<span class="flat">—</span>'
      }</div></div>
      <div class="kpi"><div class="label">Ort. Oturum</div><div class="value">${Math.floor(r.analytics.current.avgSessionDurationSec / 60)}:${String(Math.round(r.analytics.current.avgSessionDurationSec % 60)).padStart(2, '0')}</div><div class="delta">${delta(r.analytics.current.avgSessionDurationSec, r.analytics.previous.avgSessionDurationSec)}</div></div>
    </div>
    ${
      r.analytics.channels.length > 0
        ? `<table><thead><tr><th>Trafik Kaynağı</th><th style="text-align:right">Oturum</th><th style="text-align:right">Kullanıcı</th></tr></thead><tbody>
      ${r.analytics.channels.map((ch) => `<tr><td>${escapeHtml(ch.channel)}</td><td class="num">${fmt(ch.sessions)}</td><td class="num">${fmt(ch.users)}</td></tr>`).join('')}
    </tbody></table>`
        : ''
    }
  </div>`
      : ''
  }

  <div class="section">
    <h2>Organik Trafik Özeti</h2>
    <p class="sub">Google Search Console verileri — önceki ayla karşılaştırmalı</p>
    ${gscNote}
    <div class="kpis">
      <div class="kpi"><div class="label">Tıklama</div><div class="value">${fmt(r.organic.current.clicks)}</div><div class="delta">${delta(r.organic.current.clicks, r.organic.previous.clicks)}</div></div>
      <div class="kpi"><div class="label">Gösterim</div><div class="value">${fmt(r.organic.current.impressions)}</div><div class="delta">${delta(r.organic.current.impressions, r.organic.previous.impressions)}</div></div>
      <div class="kpi"><div class="label">CTR</div><div class="value">${pct(r.organic.current.ctr)}</div><div class="delta">${delta(r.organic.current.ctr, r.organic.previous.ctr)}</div></div>
      <div class="kpi"><div class="label">Ort. Pozisyon</div><div class="value">${r.organic.current.position.toFixed(1)}</div><div class="delta">${
        r.organic.previous.position > 0 && r.organic.current.position < r.organic.previous.position
          ? '<span class="up">▲ İyileşti</span>'
          : r.organic.previous.position > 0 && r.organic.current.position > r.organic.previous.position
            ? '<span class="down">▼ Geriledi</span>'
            : '<span class="flat">—</span>'
      }</div></div>
    </div>
    <div class="chart">${chartSvg}</div>
  </div>

  ${
    r.organic.devices.length > 0
      ? `<div class="section"><h2>Cihaz &amp; Ülke Dağılımı</h2><p class="sub">Trafiğin geldiği cihazlar ve ülkeler</p>
    <div style="display:flex; gap:16px;">
      <div style="flex:1"><table><thead><tr><th>Cihaz</th><th style="text-align:right">Tıklama</th><th style="text-align:right">Gösterim</th></tr></thead><tbody>
        ${r.organic.devices.map((dv) => `<tr><td>${deviceLabels[dv.device.toUpperCase()] ?? dv.device}</td><td class="num">${fmt(dv.clicks)}</td><td class="num">${fmt(dv.impressions)}</td></tr>`).join('')}
      </tbody></table></div>
      <div style="flex:1"><table><thead><tr><th>Ülke</th><th style="text-align:right">Tıklama</th><th style="text-align:right">Gösterim</th></tr></thead><tbody>
        ${r.organic.countries.slice(0, 6).map((c) => `<tr><td>${escapeHtml(c.country.toUpperCase())}</td><td class="num">${fmt(c.clicks)}</td><td class="num">${fmt(c.impressions)}</td></tr>`).join('')}
      </tbody></table></div>
    </div></div>`
      : ''
  }

  ${
    queriesRows
      ? `<div class="section"><h2>En İyi Sıralanan Sorgular</h2><p class="sub">Bu ay en çok tıklama getiren aramalar (GSC)</p>
    <table><thead><tr><th>#</th><th>Sorgu</th><th style="text-align:right">Pozisyon</th><th style="text-align:right">Tıklama</th><th style="text-align:right">Gösterim</th><th style="text-align:right">CTR</th></tr></thead><tbody>${queriesRows}</tbody></table></div>`
      : ''
  }
</div>

<!-- KELİMELER + SAYFALAR -->
<div class="page">
  <div class="pagehead"><span class="brand">FunBreak SEO</span><span class="meta">${escapeHtml(r.project.domain)} · ${r.period.label}</span></div>

  <div class="section">
    <h2>Takip Edilen Kelimeler</h2>
    <p class="sub">${r.keywords.total} kelime takipte · ${r.keywords.inTop3} kelime ilk 3'te · ${r.keywords.inTop10} kelime ilk sayfada · ortalama pozisyon ${r.keywords.avgPosition.toFixed(1)}</p>
    <div class="chart">${distSvg}</div>
  </div>

  ${
    moverRows
      ? `<div class="section"><h2>Pozisyon Değişimleri</h2><p class="sub">En çok hareket eden kelimeler</p>
    <table><thead><tr><th>Kelime</th><th style="text-align:right">Pozisyon</th><th style="text-align:right">Önceki</th><th style="text-align:right">Değişim</th></tr></thead><tbody>${moverRows}</tbody></table></div>`
      : ''
  }

  ${
    pagesRows
      ? `<div class="section"><h2>En Çok Trafik Alan Sayfalar</h2>
    <table><thead><tr><th>#</th><th>Sayfa</th><th style="text-align:right">Tıklama</th><th style="text-align:right">Gösterim</th></tr></thead><tbody>${pagesRows}</tbody></table></div>`
      : ''
  }
</div>

<!-- TEKNİK + BACKLINK + GEO + ÖNERİLER -->
<div class="page">
  <div class="pagehead"><span class="brand">FunBreak SEO</span><span class="meta">${escapeHtml(r.project.domain)} · ${r.period.label}</span></div>

  <div class="section">
    <h2>Teknik SEO Sağlığı</h2>
    ${
      r.technical
        ? `<div class="kpis">
      <div class="kpi"><div class="label">Sağlık Skoru</div><div class="value">${r.technical.healthScore}/100</div></div>
      <div class="kpi"><div class="label">Taranan Sayfa</div><div class="value">${fmt(r.technical.pagesScanned)}</div></div>
      <div class="kpi"><div class="label">Toplam Sorun</div><div class="value">${fmt(r.technical.issuesFound)}</div></div>
      <div class="kpi"><div class="label">Kritik Sorun</div><div class="value">${fmt(r.technical.criticalIssues)}</div></div>
    </div>`
        : '<p class="sub">Henüz tamamlanmış bir tarama yok — panelden tarama başlatabilirsiniz.</p>'
    }
  </div>

  <div class="section">
    <h2>Backlink Profili</h2>
    <div class="kpis">
      <div class="kpi"><div class="label">Toplam Backlink</div><div class="value">${fmt(r.backlinks.total)}</div></div>
      <div class="kpi"><div class="label">Referans Domain</div><div class="value">${fmt(r.backlinks.referringDomains)}</div></div>
      <div class="kpi"><div class="label">Ortalama DR</div><div class="value">${r.backlinks.avgDr.toFixed(0)}</div></div>
      <div class="kpi"><div class="label">Bu Ay Yeni</div><div class="value">${fmt(r.backlinks.newThisMonth)}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>GEO — Yapay Zeka Görünürlüğü</h2>
    <p class="sub">ChatGPT, Gemini, Perplexity ve Google AI cevaplarındaki marka varlığınız</p>
    <div class="kpis">
      <div class="kpi"><div class="label">Marka Bahsi</div><div class="value">${fmt(r.geo.mentionCount)}</div></div>
      <div class="kpi"><div class="label">Kaynak Gösterimi</div><div class="value">${fmt(r.geo.citationCount)}</div></div>
      <div class="kpi"><div class="label">Citation Oranı</div><div class="value">${pct(r.geo.citationRatio)}</div></div>
      <div class="kpi"><div class="label">Kontrol Sayısı</div><div class="value">${fmt(r.geo.totalChecks)}</div></div>
    </div>
    ${
      platformRows
        ? `<table><thead><tr><th>Platform</th><th style="text-align:right">Bahis</th><th style="text-align:right">Kaynak</th></tr></thead><tbody>${platformRows}</tbody></table>`
        : ''
    }
  </div>

  <div class="section">
    <h2>Önümüzdeki Ay İçin Öneriler</h2>
    ${recRows || '<p class="sub">Her şey yolunda görünüyor — mevcut stratejiye devam.</p>'}
  </div>

  <p style="margin-top:30px; color:#94a3b8; font-size:10px; text-align:center;">
    Bu rapor FunBreak SEO tarafından ${new Date(r.generatedAt).toLocaleDateString('tr-TR')} tarihinde otomatik oluşturulmuştur · funbreakseo.com · destek@funbreakseo.com
  </p>
</div>

</body>
</html>`;
  }

  // ── PDF üretimi (puppeteer; başarısız olursa null → HTML fallback) ──────────

  async generatePdf(html: string): Promise<Buffer | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0', bottom: '0', left: '0', right: '0' },
        });
        return Buffer.from(pdf);
      } finally {
        await browser.close();
      }
    } catch (e) {
      this.logger.error(`PDF üretimi başarısız (puppeteer): ${(e as Error).message}`);
      return null;
    }
  }

  // ── Günlük kelime raporu (HTML e-posta) ─────────────────────────────────────

  buildKeywordEmailHtml(projectDomain: string, movers: MonthlyReportData['keywords']['movers'], stats: { total: number; inTop10: number; avg: number }): string {
    const rows = movers
      .slice(0, 20)
      .map((m) => {
        const ch =
          m.change > 0
            ? `<span style="color:#16a34a;font-weight:700">▲ ${m.change}</span>`
            : m.change < 0
              ? `<span style="color:#dc2626;font-weight:700">▼ ${Math.abs(m.change)}</span>`
              : '<span style="color:#94a3b8">—</span>';
        return `<tr>
          <td style="padding:7px 10px;border-bottom:1px solid #e8eef7">${escapeHtml(m.phrase)}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e8eef7;text-align:right">${m.position ?? '—'}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e8eef7;text-align:right">${m.previous ?? '—'}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e8eef7;text-align:right">${ch}</td>
        </tr>`;
      })
      .join('');

    return `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;color:#1e293b">
      <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;padding:24px 28px;border-radius:12px 12px 0 0">
        <p style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.8;margin:0 0 6px">Günlük Kelime Raporu</p>
        <h1 style="font-size:20px;margin:0">${escapeHtml(projectDomain)}</h1>
        <p style="font-size:12px;opacity:.85;margin:8px 0 0">${new Date().toLocaleDateString('tr-TR')} · ${stats.total} kelime takipte · ${stats.inTop10} kelime ilk sayfada · ort. pozisyon ${stats.avg.toFixed(1)}</p>
      </div>
      <div style="border:1px solid #dbe4f0;border-top:0;border-radius:0 0 12px 12px;padding:20px 24px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr>
            <th style="background:#f1f5f9;text-align:left;padding:8px 10px">Kelime</th>
            <th style="background:#f1f5f9;text-align:right;padding:8px 10px">Pozisyon</th>
            <th style="background:#f1f5f9;text-align:right;padding:8px 10px">Önceki</th>
            <th style="background:#f1f5f9;text-align:right;padding:8px 10px">Değişim</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="text-align:center;margin:20px 0 4px">
          <a href="https://funbreakseo.com/tr/dashboard/keywords" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600">Panelde Görüntüle</a>
        </p>
        <p style="text-align:center;color:#94a3b8;font-size:11px">FunBreak SEO · Bu maili panel bildirim tercihlerinden kapatabilirsiniz.</p>
      </div>
    </div>`;
  }

  // ── Cron: her gün 17:00 (TR saati) — günlük kelime raporu ───────────────────

  @Cron('0 17 * * *', { timeZone: 'Europe/Istanbul' })
  async sendDailyKeywordReports(): Promise<void> {
    const projects = await this.prisma.project.findMany({
      where: {
        status: 'ACTIVE',
        keywords: { some: {} },
        organization: {
          subscription: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] } },
        },
      },
      include: { organization: true },
    });

    for (const project of projects) {
      try {
        // Tercih kontrolü: müşteri günlük kelime mailini kapattıysa atla
        const pref = await this.prisma.notificationPreference.findFirst({
          where: { organizationId: project.organizationId },
        });
        const events = (pref?.eventEmails as Record<string, boolean> | null) ?? {};
        if (events['dailyKeywordReport'] === false) continue;

        const data = await this.buildReportData(project.id);
        if (data.keywords.total === 0) continue;

        const owner = await this.prisma.user.findUnique({
          where: { id: project.organization.ownerUserId },
          select: { email: true },
        });
        if (!owner) continue;

        const html = this.buildKeywordEmailHtml(project.domain, data.keywords.movers, {
          total: data.keywords.total,
          inTop10: data.keywords.inTop10,
          avg: data.keywords.avgPosition,
        });
        await this.email.sendMail(owner.email, `Günlük Kelime Raporu — ${project.domain}`, html);
      } catch (e) {
        this.logger.warn(`Günlük kelime raporu gönderilemedi (${project.id}): ${(e as Error).message}`);
      }
    }
    this.logger.log(`Günlük kelime raporları işlendi: ${projects.length} proje`);
  }

  // ── Cron: her ayın 1'i 17:00 (TR saati) — aylık PDF rapor maili ─────────────

  // Monthly email sending moved to SiteAuditReportService.sendMonthlyReports()
  // — there is now ONE report system (the full site-audit report, which
  // already includes this GA4/GSC data merged in), not a separate monthly
  // report pipeline. buildReportData()/renderHtml()/generatePdf() above stay
  // here as the GA4/GSC data-fetching layer that SiteAuditReportService
  // composes with the technical audit.
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
