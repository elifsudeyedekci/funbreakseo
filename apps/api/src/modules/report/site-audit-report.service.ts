import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { OutreachService } from '../outreach/outreach.service';

export interface SiteAuditReportData {
  project: { domain: string; organization: string };
  generatedAt: string;
  crawlJob: { finishedAt: string | null; pagesScanned: number; issuesFound: number };
  overallScore: number;
  overallGrade: string;
  categoryScores: Record<'onPage' | 'geo' | 'backlink' | 'usability' | 'performance', { score: number; grade: string }>;
  recommendations: Array<{ title: string; category: string; priority: 'CRITICAL' | 'MEDIUM' | 'LOW'; howToFix: string; affectedCount?: number }>;
  onPage: any;
  geo: any;
  performance: any;
  technology: any;
  backlink: {
    domainStrength: number;
    pageStrength: number;
    counters: Record<string, number>;
    top: Array<{ domainRating: number; sourceDomain: string; anchorText: string; isDofollow: boolean }>;
    anchors: Array<{ anchor: string; count: number }>;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  onPage: 'Sayfa İçi SEO',
  geo: 'GEO / AI',
  backlink: 'Backlink',
  usability: 'Kullanılabilirlik',
  performance: 'Performans',
};

function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function scoreColor(score: number): string {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#ca8a04';
  if (score >= 40) return '#ea580c';
  return '#dc2626';
}

/** Circular progress ring — inline SVG, matches the dashboard's ring visual language. */
function ringSvg(score: number, grade: string, size = 120, stroke = 12): string {
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = c - (clamped / 100) * c;
  const color = scoreColor(clamped);
  const center = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
    <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="${stroke}"/>
    <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
    <text x="${center}" y="${center + 6}" font-size="${size * 0.28}" font-weight="800" fill="${color}"
      text-anchor="middle" style="transform:rotate(90deg);transform-origin:${center}px ${center}px">${escapeHtml(grade)}</text>
  </svg>`;
}

/** Horizontal progress bar — used for gauges (DS/PS, performance scores). */
function barGauge(label: string, score: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = scoreColor(clamped);
  return `<div class="gauge">
    <div class="gauge-label"><span>${escapeHtml(label)}</span><span style="color:${color};font-weight:700">${clamped}/100</span></div>
    <div class="gauge-track"><div class="gauge-fill" style="width:${clamped}%;background:${color}"></div></div>
  </div>`;
}

@Injectable()
export class SiteAuditReportService {
  private readonly logger = new Logger(SiteAuditReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outreach: OutreachService,
  ) {}

  /**
   * Access control is the controller's job (assertAccess, incl. the
   * SUPER_ADMIN/ADMIN bypass) — this only needs the project ID, matching
   * MonthlyReportService.buildReportData()'s convention.
   */
  async buildData(projectId: string): Promise<SiteAuditReportData> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { organization: { select: { name: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');

    const crawlJob = await this.prisma.crawlJob.findFirst({
      where: { projectId, status: 'DONE' },
      orderBy: { finishedAt: 'desc' },
      include: { siteAuditReport: true },
    });
    if (!crawlJob?.siteAuditReport?.overallScore) {
      throw new NotFoundException('SCAN_REQUIRED: Bu proje için henüz tamamlanmış bir site denetimi yok.');
    }
    const report = crawlJob.siteAuditReport;

    const gauges = await this.outreach.getBacklinkGauges(projectId).catch(() => ({
      domainStrength: 0,
      pageStrength: 0,
      counters: {} as Record<string, number>,
    }));
    const top = await this.outreach.getTopBacklinks(projectId, 10).catch(() => []);
    const anchors = await this.outreach.getTopAnchors(projectId, 10).catch(() => []);

    return {
      project: { domain: project.domain, organization: project.organization?.name ?? '' },
      generatedAt: new Date().toISOString(),
      crawlJob: {
        finishedAt: crawlJob.finishedAt?.toISOString() ?? null,
        pagesScanned: crawlJob.pagesScanned,
        issuesFound: crawlJob.issuesFound,
      },
      overallScore: report.overallScore,
      overallGrade: report.overallGrade,
      categoryScores: (report.categoryScores as any) ?? {},
      recommendations: ((report.recommendations as any) ?? []).slice(0, 20),
      onPage: report.onPageJson,
      geo: report.geoJson,
      performance: report.performanceJson,
      technology: report.technologyJson,
      backlink: {
        domainStrength: gauges.domainStrength,
        pageStrength: gauges.pageStrength,
        counters: gauges.counters as Record<string, number>,
        top: top as any,
        anchors: anchors as any,
      },
    };
  }

  renderHtml(d: SiteAuditReportData): string {
    const dateLabel = d.crawlJob.finishedAt
      ? new Date(d.crawlJob.finishedAt).toLocaleString('tr-TR')
      : new Date(d.generatedAt).toLocaleString('tr-TR');

    const categoryRings = (Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[])
      .map((key) => {
        const cs = (d.categoryScores as any)?.[key] ?? { score: 0, grade: '—' };
        return `<div class="cat-ring">${ringSvg(cs.score, cs.grade, 88, 9)}<div class="cat-label">${CATEGORY_LABELS[key]}</div></div>`;
      })
      .join('');

    const priorityLabel: Record<string, string> = { CRITICAL: 'Kritik', MEDIUM: 'Orta', LOW: 'Düşük' };
    const recRows = d.recommendations
      .map(
        (r) =>
          `<div class="rec"><span class="prio ${r.priority === 'CRITICAL' ? 'high' : r.priority === 'MEDIUM' ? 'mid' : 'low'}">${priorityLabel[r.priority] ?? r.priority}</span>
          <div><div style="font-weight:600">${escapeHtml(r.title)}</div>${r.affectedCount ? `<div class="muted">${r.affectedCount} sayfayı etkiliyor</div>` : ''}</div></div>`,
      )
      .join('');

    const serpTitle = escapeHtml(d.onPage?.serpPreview?.title ?? d.project.domain);
    const serpDesc = escapeHtml(d.onPage?.serpPreview?.description ?? '');
    const serpUrl = escapeHtml(d.onPage?.serpPreview?.url ?? `https://${d.project.domain}`);

    const onPageRows = [
      ['XML Sitemap', d.onPage?.sitemap?.found ? 'Bulundu' : 'Bulunamadı'],
      ['Robots.txt taramayı engelliyor mu', d.onPage?.robotsTxt?.blocking ? 'Evet (kritik)' : 'Hayır'],
      ['Canonical etiketi', d.onPage?.canonicalUrl ? 'Var' : 'Yok'],
      ['Noindex (meta)', d.onPage?.noindexMeta ? 'Var (dikkat)' : 'Yok'],
      ['Schema.org tipleri', (d.onPage?.schemaTypes ?? []).join(', ') || 'Bulunamadı'],
      ['Dil (lang)', d.onPage?.lang ?? '—'],
    ]
      .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td class="num">${escapeHtml(String(v))}</td></tr>`)
      .join('');

    const backlinkTop = d.backlink.top
      .map(
        (b) =>
          `<tr><td class="num">${b.domainRating}</td><td>${escapeHtml(b.sourceDomain)}</td><td>${escapeHtml(b.anchorText)}</td><td>${b.isDofollow ? 'dofollow' : 'nofollow'}</td></tr>`,
      )
      .join('');
    const anchorRows = d.backlink.anchors
      .map((a) => `<tr><td>${escapeHtml(a.anchor) || '(boş)'}</td><td class="num">${a.count}</td></tr>`)
      .join('');
    const c = d.backlink.counters ?? {};

    const psi = d.performance?.psi ?? {};
    const cwv = d.performance?.coreWebVitals ?? {};
    const cwvRow = (label: string, m: any) =>
      m ? `<tr><td>${label}</td><td class="num">${(m.lcp?.value / 1000).toFixed(1)}s</td><td class="num">${Math.round(m.inp?.value ?? 0)}ms</td><td class="num">${(m.cls?.value ?? 0).toFixed(2)}</td></tr>` : '';

    const eeat = d.geo?.eeat ?? { score: 0, factors: [] };
    const eeatRows = (eeat.factors ?? [])
      .map((f: any) => `<tr><td>${escapeHtml(f.label)}</td><td class="num">${f.present ? '✓' : '✗'}</td></tr>`)
      .join('');

    const tech = d.technology ?? {};
    const techList = (tech.technologies ?? []).map((t: any) => `${escapeHtml(t.category)}: ${escapeHtml(t.name)}`).join(', ') || 'Tespit edilemedi';
    const domainInfoRows = [
      ['Domain Yaşı', tech.domainAgeYears != null ? `${tech.domainAgeYears.toFixed(1)} yıl` : 'Bilinmiyor'],
      ['SSL Durumu', tech.sslValid ? 'Geçerli' : 'Sorunlu'],
      ['SSL Bitiş Tarihi', tech.sslExpiryDate ? new Date(tech.sslExpiryDate).toLocaleDateString('tr-TR') : 'Bilinmiyor'],
      ['DMARC Kaydı', tech.dmarc?.found ? 'Var' : 'Yok'],
      ['SPF Kaydı', tech.spf?.found ? 'Var' : 'Yok'],
      ['Sunucu IP', tech.serverIp ?? '—'],
      ['Web Sunucusu', tech.webServer ?? '—'],
    ]
      .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td class="num">${escapeHtml(String(v))}</td></tr>`)
      .join('');

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 12px; background: #fff; }
  .page { page-break-after: always; padding: 36px 44px; }
  .page:last-child { page-break-after: auto; }

  .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 90vh;
           background: linear-gradient(160deg, #1d4ed8 0%, #2563eb 45%, #3b82f6 100%); color: #fff; text-align: center; padding: 60px; }
  .cover .logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 40px; }
  .cover .logo span { opacity: 0.85; font-weight: 400; }
  .cover h1 { font-size: 30px; font-weight: 800; margin-bottom: 10px; }
  .cover .domain { font-size: 22px; opacity: 0.95; margin-bottom: 6px; }
  .cover .date { font-size: 13px; opacity: 0.7; margin-bottom: 40px; }
  .cover .footer { margin-top: 40px; font-size: 11px; opacity: 0.65; }

  h2 { font-size: 17px; color: #1d4ed8; margin: 0 0 4px; font-weight: 700; }
  .sub { color: #64748b; font-size: 11px; margin-bottom: 16px; }
  .section { margin-bottom: 26px; }

  .pagehead { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1d4ed8;
              padding-bottom: 10px; margin-bottom: 22px; }
  .pagehead .brand { font-weight: 800; color: #1d4ed8; font-size: 13px; }
  .pagehead .meta { color: #94a3b8; font-size: 10px; }

  .cat-rings { display: flex; gap: 16px; justify-content: center; margin-bottom: 8px; }
  .cat-ring { text-align: center; }
  .cat-label { font-size: 10px; color: #64748b; margin-top: 4px; }

  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #1d4ed8; color: #fff; text-align: left; padding: 8px 10px; font-weight: 600; }
  td { padding: 7px 10px; border-bottom: 1px solid #e8eef7; }
  tr:nth-child(even) td { background: #f6f9fd; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }

  .rec { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 1px solid #dbe4f0;
         border-radius: 8px; margin-bottom: 8px; background: #f8fafc; }
  .prio { flex-shrink: 0; font-size: 9px; font-weight: 800; padding: 3px 8px; border-radius: 20px; letter-spacing: 0.05em; }
  .prio.high { background: #fee2e2; color: #b91c1c; }
  .prio.mid { background: #fef3c7; color: #92400e; }
  .prio.low { background: #e2e8f0; color: #475569; }
  .muted { color: #94a3b8; font-size: 10px; margin-top: 2px; }

  .gauge { margin-bottom: 14px; }
  .gauge-label { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
  .gauge-track { height: 10px; border-radius: 6px; background: #e2e8f0; overflow: hidden; }
  .gauge-fill { height: 100%; border-radius: 6px; }

  .serp { border: 1px solid #dbe4f0; border-radius: 8px; padding: 14px; background: #fff; max-width: 480px; }
  .serp .url { color: #16a34a; font-size: 11px; }
  .serp .title { color: #1a0dab; font-size: 15px; margin: 3px 0; }
  .serp .desc { color: #4d5156; font-size: 12px; }

  .kpis { display: flex; gap: 12px; margin-bottom: 18px; }
  .kpi { flex: 1; border: 1px solid #dbe4f0; border-radius: 10px; padding: 14px; background: #f8fafc; text-align: center; }
  .kpi .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 6px; }
  .kpi .value { font-size: 22px; font-weight: 800; color: #0f172a; }
</style>
</head>
<body>

<div class="page cover">
  <div class="logo">FunBreak <span>SEO</span></div>
  <h1>Site Denetimi Raporu</h1>
  <div class="domain">${escapeHtml(d.project.domain)}</div>
  <div class="date">Tarama tarihi: ${dateLabel}</div>
  ${ringSvg(d.overallScore, d.overallGrade, 160, 14)}
  <div class="footer">${escapeHtml(d.project.organization)} için hazırlandı · funbreakseo.com</div>
</div>

<div class="page">
  <div class="pagehead"><span class="brand">FunBreak SEO</span><span class="meta">${escapeHtml(d.project.domain)} · ${dateLabel}</span></div>
  <div class="section">
    <h2>Kategori Skorları</h2>
    <p class="sub">${d.crawlJob.pagesScanned} sayfa tarandı · ${d.crawlJob.issuesFound} sorun tespit edildi</p>
    <div class="cat-rings">${categoryRings}</div>
  </div>
  <div class="section">
    <h2>Öncelikli Öneriler</h2>
    <p class="sub">En kritik ${d.recommendations.length} bulgu</p>
    ${recRows || '<p class="muted">Öneri bulunamadı.</p>'}
  </div>
</div>

<div class="page">
  <div class="pagehead"><span class="brand">FunBreak SEO</span><span class="meta">${escapeHtml(d.project.domain)} · ${dateLabel}</span></div>
  <div class="section">
    <h2>SERP Önizlemesi</h2>
    <div class="serp"><div class="url">${serpUrl}</div><div class="title">${serpTitle}</div><div class="desc">${serpDesc}</div></div>
  </div>
  <div class="section">
    <h2>Sayfa İçi SEO — Teknik Kontroller</h2>
    <table>${onPageRows}</table>
  </div>
  <div class="section">
    <h2>Backlink Profili</h2>
    ${barGauge('Domain Strength', d.backlink.domainStrength)}
    ${barGauge('Page Strength', d.backlink.pageStrength)}
    <div class="kpis">
      <div class="kpi"><div class="label">Toplam Backlink</div><div class="value">${c.total ?? 0}</div></div>
      <div class="kpi"><div class="label">Yönlendiren Alan</div><div class="value">${c.referringDomains ?? 0}</div></div>
      <div class="kpi"><div class="label">Dofollow</div><div class="value">${c.dofollow ?? 0}</div></div>
      <div class="kpi"><div class="label">Nofollow</div><div class="value">${c.nofollow ?? 0}</div></div>
    </div>
  </div>
</div>

<div class="page">
  <div class="pagehead"><span class="brand">FunBreak SEO</span><span class="meta">${escapeHtml(d.project.domain)} · ${dateLabel}</span></div>
  <div class="section">
    <h2>En Değerli Backlinkler</h2>
    <table><tr><th>DR</th><th>Kaynak</th><th>Anchor</th><th>Tip</th></tr>${backlinkTop || '<tr><td colspan="4" class="muted">Veri yok</td></tr>'}</table>
  </div>
  <div class="section">
    <h2>En Sık Kullanılan Anchor Metinleri</h2>
    <table><tr><th>Anchor</th><th>Adet</th></tr>${anchorRows || '<tr><td colspan="2" class="muted">Veri yok</td></tr>'}</table>
  </div>
</div>

<div class="page">
  <div class="pagehead"><span class="brand">FunBreak SEO</span><span class="meta">${escapeHtml(d.project.domain)} · ${dateLabel}</span></div>
  <div class="section">
    <h2>Performans</h2>
    ${psi.mobile ? barGauge('PageSpeed — Mobil', psi.mobile.score) : ''}
    ${psi.desktop ? barGauge('PageSpeed — Masaüstü', psi.desktop.score) : ''}
    ${(psi.mobile || psi.desktop) ? `<table><tr><th></th><th>LCP</th><th>INP</th><th>CLS</th></tr>${cwvRow('Mobil', cwv.mobile)}${cwvRow('Masaüstü', cwv.desktop)}</table>` : '<p class="muted">PageSpeed verisi mevcut değil.</p>'}
  </div>
  <div class="section">
    <h2>GEO / AI Görünürlük</h2>
    ${barGauge('E-E-A-T Skoru', eeat.score ?? 0)}
    <table><tr><th>Faktör</th><th>Durum</th></tr>${eeatRows || '<tr><td colspan="2" class="muted">Veri yok</td></tr>'}</table>
  </div>
</div>

<div class="page">
  <div class="pagehead"><span class="brand">FunBreak SEO</span><span class="meta">${escapeHtml(d.project.domain)} · ${dateLabel}</span></div>
  <div class="section">
    <h2>Teknoloji Yığını</h2>
    <p class="sub">${techList}</p>
  </div>
  <div class="section">
    <h2>Domain / Güvenlik Bilgileri</h2>
    <table>${domainInfoRows}</table>
  </div>
  <p class="muted" style="margin-top:30px">Bu rapor FunBreak SEO tarafından ${new Date(d.generatedAt).toLocaleString('tr-TR')} tarihinde otomatik oluşturulmuştur · funbreakseo.com · destek@funbreakseo.com</p>
</div>

</body>
</html>`;
  }

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
      this.logger.error(`Site denetimi PDF üretimi başarısız (puppeteer): ${(e as Error).message}`);
      return null;
    }
  }
}
