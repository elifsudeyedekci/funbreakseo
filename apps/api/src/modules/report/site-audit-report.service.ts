import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { OutreachService } from '../outreach/outreach.service';
import { MonthlyReportService } from './monthly-report.service';
import { EmailService } from '../email-notification/email.service';

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

export interface SiteAuditReportData {
  project: { domain: string; organization: string };
  generatedAt: string;
  crawlJob: { finishedAt: string | null; pagesScanned: number; issuesFound: number; totalPagesQueued: number | null };
  overallScore: number;
  overallGrade: string;
  categoryScores: Record<'onPage' | 'geo' | 'backlink' | 'usability' | 'performance', { score: number; grade: string }>;
  recommendations: Array<{ title: string; category: string; priority: 'CRITICAL' | 'MEDIUM' | 'LOW'; howToFix: string; affectedCount?: number }>;
  onPage: any;
  geo: any;
  performance: any;
  technology: any;
  usability: any;
  social: any;
  localSeo: any;
  crawlList: any;
  screenshots: { desktop: string | null; mobile: string | null; tablet: string | null };
  backlink: {
    domainStrength: number;
    pageStrength: number;
    counters: Record<string, number>;
    top: Array<{ domainRating: number; sourceDomain: string; anchorText: string; isDofollow: boolean }>;
    anchors: Array<{ anchor: string; count: number }>;
    tld: Array<{ tld: string; count: number }>;
  };
  /** Unified monthly report data — merged in so ONE report covers technical audit + GA4 + GSC (no separate report pipeline). */
  ga4: {
    connected: boolean;
    current: { users: number; sessions: number; pageViews: number; bounceRate: number; avgSessionDurationSec: number };
    previous: { users: number; sessions: number; pageViews: number; bounceRate: number; avgSessionDurationSec: number };
    channels: Array<{ channel: string; sessions: number; users: number }>;
    daily: Array<{ date: string; sessions: number; users: number; newUsers: number; pageViews: number }>;
    devices: Array<{ device: string; sessions: number }>;
    countries: Array<{ country: string; sessions: number }>;
  } | null;
  gsc: {
    connected: boolean;
    current: { clicks: number; impressions: number; ctr: number; position: number };
    previous: { clicks: number; impressions: number; ctr: number; position: number };
    daily: Array<{ date: string; clicks: number; impressions: number }>;
    dailyPrevious: Array<{ date: string; clicks: number; impressions: number }>;
    topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
    topPages: Array<{ page: string; clicks: number; impressions: number }>;
    devices: Array<{ device: string; clicks: number; impressions: number }>;
    countries: Array<{ country: string; clicks: number; impressions: number }>;
  } | null;
  periodLabel: string;
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
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('tr-TR');
}

function scoreColor(score: number): string {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#ca8a04';
  if (score >= 40) return '#ea580c';
  return '#dc2626';
}

function posColor(pos: number): string {
  if (pos <= 3) return '#16a34a';
  if (pos <= 10) return '#ca8a04';
  return '#dc2626';
}

function deltaHtml(cur: number, prev: number): string {
  if (!prev) return cur > 0 ? '<span class="up">Yeni</span>' : '<span class="flat">—</span>';
  const ch = ((cur - prev) / prev) * 100;
  if (Math.abs(ch) < 0.5) return '<span class="flat">—</span>';
  return ch > 0 ? `<span class="up">▲ %${ch.toFixed(1)}</span>` : `<span class="down">▼ %${Math.abs(ch).toFixed(1)}</span>`;
}

/** Circular progress ring for the cover — gold/orange gradient stroke on a dark navy background. */
function ringSvg(score: number, grade: string, size = 120, stroke = 12): string {
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = c - (clamped / 100) * c;
  const center = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
    <defs>
      <linearGradient id="coverRingGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fde68a"/>
        <stop offset="0.55" stop-color="#fbbf24"/>
        <stop offset="1" stop-color="#f59e0b"/>
      </linearGradient>
    </defs>
    <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="${stroke}"/>
    <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="url(#coverRingGrad)" stroke-width="${stroke}"
      stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
  </svg>`;
}

/** Small category ring for the summary page (uses status color, not white). */
function categoryRingSvg(score: number, grade: string, size = 88, stroke = 9): string {
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

let halfGaugeCounter = 0;

/** Half-circle gauge — used for Domain/Page Strength and PSI scores. Thick red→yellow→green gradient stroke. */
function halfGaugeSvg(value: number, label: string, size = 170): string {
  halfGaugeCounter += 1;
  const gradId = `halfGaugeGrad-${halfGaugeCounter}`;
  const w = size;
  const h = size * 0.62;
  const stroke = size * 0.13;
  const r = w / 2 - stroke;
  const cx = w / 2;
  const cy = h - stroke / 2;
  const clamped = Math.max(0, Math.min(100, value));
  const color = scoreColor(clamped);
  const arcLen = Math.PI * r;
  const offset = arcLen - (clamped / 100) * arcLen;
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  return `<svg width="${w}" height="${h + 24}" viewBox="0 0 ${w} ${h + 24}">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#dc2626"/>
        <stop offset="0.5" stop-color="#eab308"/>
        <stop offset="1" stop-color="#16a34a"/>
      </linearGradient>
    </defs>
    <path d="${path}" fill="none" stroke="#e2e8f0" stroke-width="${stroke}" stroke-linecap="round"/>
    <path d="${path}" fill="none" stroke="url(#${gradId})" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${arcLen}" stroke-dashoffset="${offset}"/>
    <text x="${cx}" y="${cy - 4}" font-size="${size * 0.16}" font-weight="800" fill="${color}" text-anchor="middle">${Math.round(clamped)}</text>
    <text x="${cx}" y="${h + 18}" font-size="11" fill="#64748b" text-anchor="middle" font-weight="600">${escapeHtml(label)}</text>
  </svg>`;
}

/** Radar (spider) chart — hand-drawn SVG polygon, no chart library needed for server-rendered HTML. */
function radarSvg(categories: { label: string; score: number }[], size = 280): string {
  const center = size / 2;
  const maxR = size / 2 - 46;
  const n = categories.length;
  if (n === 0) return '';
  const angleFor = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pointFor = (i: number, r: number): [number, number] => {
    const a = angleFor(i);
    return [center + r * Math.cos(a), center + r * Math.sin(a)];
  };
  const rings = [0.25, 0.5, 0.75, 1]
    .map((frac) => {
      const pts = categories.map((_, i) => pointFor(i, maxR * frac).join(',')).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`;
    })
    .join('');
  const axes = categories
    .map((_, i) => {
      const [x, y] = pointFor(i, maxR);
      return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    })
    .join('');
  const scorePts = categories
    .map((c, i) => pointFor(i, (Math.max(0, Math.min(100, c.score)) / 100) * maxR).join(','))
    .join(' ');
  const labels = categories
    .map((c, i) => {
      const [x, y] = pointFor(i, maxR + 24);
      return `<text x="${x}" y="${y}" font-size="10" fill="#475569" text-anchor="middle">${escapeHtml(c.label)}</text>`;
    })
    .join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${rings}${axes}
    <polygon points="${scorePts}" fill="rgba(29,78,216,0.22)" stroke="#1d4ed8" stroke-width="2"/>
    ${labels}
  </svg>`;
}

/** Horizontal progress bar — used for performance/E-E-A-T scores. */
function barGauge(label: string, score: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = scoreColor(clamped);
  return `<div class="gauge">
    <div class="gauge-label"><span>${escapeHtml(label)}</span><span style="color:${color};font-weight:700">${clamped}/100</span></div>
    <div class="gauge-track"><div class="gauge-fill" style="width:${clamped}%;background:${color}"></div></div>
  </div>`;
}

const CHART_PALETTE = ['#1d4ed8', '#16a34a', '#ca8a04', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

/** Multi-series line chart — inline SVG polylines, no chart library needed. */
function lineChartSvg(
  series: { label: string; color: string; points: number[] }[],
  labels: string[],
  width = 620,
  height = 190,
): string {
  const P = 32;
  const maxVal = Math.max(1, ...series.flatMap((s) => s.points));
  const n = labels.length;
  if (n === 0) return '<p class="muted">Veri yok</p>';
  const x = (i: number) => P + (n > 1 ? (i / (n - 1)) * (width - 2 * P) : 0);
  const y = (v: number) => height - P - (v / maxVal) * (height - 2 * P - 14);
  const lines = series
    .map((s) => {
      const dPath = s.points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      return `<path d="${dPath}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('');
  const legend = series
    .map((s, i) => `<text x="${P + i * 150}" y="14" font-size="10" font-weight="700" fill="${s.color}">— ${escapeHtml(s.label)}</text>`)
    .join('');
  const axisLine = `<line x1="${P}" y1="${height - P}" x2="${width - P}" y2="${height - P}" stroke="#e2e8f0"/>`;
  const step = Math.max(1, Math.ceil(n / 7));
  const xLabels = labels
    .map((l, i) => (i % step === 0 ? `<text x="${x(i).toFixed(1)}" y="${height - 6}" font-size="9" fill="#94a3b8" text-anchor="middle">${escapeHtml(l.slice(5))}</text>` : ''))
    .join('');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${legend}${axisLine}${lines}${xLabels}</svg>`;
}

/** Donut (annular pie) chart with a side legend — inline SVG arcs. */
function donutChartSvg(data: { label: string; value: number; color?: string }[], size = 170): string {
  const withColor = data.map((d, i) => ({ ...d, color: d.color ?? CHART_PALETTE[i % CHART_PALETTE.length] }));
  const total = withColor.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return '<p class="muted">Veri yok</p>';
  const r = size / 2 - 8;
  const innerR = r * 0.55;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -Math.PI / 2;
  const arcs = withColor
    .filter((d) => d.value > 0)
    .map((d) => {
      const frac = d.value / total;
      const start = angle;
      const end = angle + frac * Math.PI * 2 - (withColor.length > 1 ? 0.02 : 0);
      angle = start + frac * Math.PI * 2;
      const large = end - start > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const ix1 = cx + innerR * Math.cos(end);
      const iy1 = cy + innerR * Math.sin(end);
      const ix2 = cx + innerR * Math.cos(start);
      const iy2 = cy + innerR * Math.sin(start);
      return `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${ix1.toFixed(2)} ${iy1.toFixed(2)} A ${innerR} ${innerR} 0 ${large} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)} Z" fill="${d.color}"/>`;
    })
    .join('');
  const legend = withColor
    .map(
      (d) =>
        `<div style="display:flex;align-items:center;gap:6px;font-size:10px;margin-bottom:4px;color:#475569"><span style="width:8px;height:8px;border-radius:50%;background:${d.color};display:inline-block;flex-shrink:0"></span>${escapeHtml(d.label)} — ${((d.value / total) * 100).toFixed(0)}%</div>`,
    )
    .join('');
  return `<div style="display:flex;align-items:center;gap:16px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${arcs}</svg><div>${legend}</div></div>`;
}

/** Horizontal bar chart — inline SVG rects, one row per datum. */
function barChartSvg(data: { label: string; value: number }[], width = 520, barH = 20, color = '#1d4ed8'): string {
  if (data.length === 0) return '<p class="muted">Veri yok</p>';
  const max = Math.max(1, ...data.map((d) => d.value));
  const labelW = 130;
  const rows = data
    .map((d, i) => {
      const w = ((d.value / max) * (width - labelW - 50));
      const y = i * (barH + 8);
      return `<text x="0" y="${y + barH * 0.68}" font-size="10" fill="#475569">${escapeHtml(d.label)}</text>
      <rect x="${labelW}" y="${y}" width="${Math.max(2, w)}" height="${barH - 4}" rx="3" fill="${color}"/>
      <text x="${labelW + w + 6}" y="${y + barH * 0.68}" font-size="10" fill="#0f172a" font-weight="700">${fmt(d.value)}</text>`;
    })
    .join('');
  const height = data.length * (barH + 8);
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${rows}</svg>`;
}

/** Background shade for a heatmap-style table cell, proportional to value/max. */
function heatCell(value: number, max: number): string {
  if (max <= 0) return '';
  const opacity = 0.08 + 0.42 * Math.min(1, value / max);
  return `background:rgba(29,78,216,${opacity.toFixed(2)})`;
}

/** Small gold bolt mark — used bare in the per-page navy header bar. */
function brandMarkSvg(size = 14): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" fill="#fbbf24"/></svg>`;
}

/** Gold bolt mark in a rounded gradient badge — used on the cover. */
function brandMarkBadge(size = 22): string {
  const pad = Math.round(size * 0.36);
  const box = size + pad * 2;
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:${box}px;height:${box}px;border-radius:${Math.round(box * 0.28)}px;background:linear-gradient(135deg,#fbbf24,#f59e0b);flex-shrink:0">
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" fill="#0f172a"/></svg>
  </span>`;
}

/** KPI card with a colored top border denoting category (blue = neutral, green = good, orange/red = attention). */
function kpiCard(label: string, value: string, opts: { accent?: 'blue' | 'green' | 'red' | 'orange'; delta?: string } = {}): string {
  const accent = opts.accent ?? 'blue';
  return `<div class="kpi kpi-${accent}"><div class="label">${escapeHtml(label)}</div><div class="value">${value}</div>${opts.delta ? `<div class="delta">${opts.delta}</div>` : ''}</div>`;
}

type IconKind = 'summary' | 'recs' | 'onpage' | 'shots' | 'backlink' | 'performance' | 'geo' | 'social' | 'tech' | 'local' | 'ga4' | 'gsc';

const ICON_PATHS: Record<IconKind, { color: string; paths: string }> = {
  summary: { color: '#1d4ed8', paths: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="#1d4ed8" stroke="none"/>' },
  recs: { color: '#f59e0b', paths: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.5c.7.7 1 1.6 1 2.5h6c0-.9.3-1.8 1-2.5A7 7 0 0 0 12 2Z"/>' },
  onpage: { color: '#1d4ed8', paths: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h6"/>' },
  shots: { color: '#0f172a', paths: '<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>' },
  backlink: { color: '#4f46e5', paths: '<path d="M9 17H7a5 5 0 0 1 0-10h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><path d="M8 12h8"/>' },
  performance: { color: '#f97316', paths: '<path d="m12 12 4-4"/><path d="M4 13a8 8 0 1 1 16 0"/><path d="M2 21h20"/>' },
  geo: { color: '#8b5cf6', paths: '<path d="M12 3l1.6 4.9L18 9.5l-4.4 1.6L12 16l-1.6-4.9L6 9.5l4.4-1.6Z"/><path d="M19 15l.7 2.1L22 18l-2.3.9L19 21l-.7-2.1L16 18l2.3-.9Z"/>' },
  social: { color: '#db2777', paths: '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.6l7.4-4.2"/><path d="M8.3 13.4l7.4 4.2"/>' },
  tech: { color: '#475569', paths: '<path d="M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6Z"/>' },
  local: { color: '#0d9488', paths: '<path d="M12 22s7-7.4 7-12.5A7 7 0 0 0 5 9.5C5 14.6 12 22 12 22Z"/><circle cx="12" cy="9.5" r="2.5"/>' },
  ga4: { color: '#f59e0b', paths: '<path d="M4 4v16h16"/><rect x="7" y="13" width="2.6" height="5" fill="#f59e0b" stroke="none"/><rect x="11.7" y="9" width="2.6" height="9" fill="#f59e0b" stroke="none"/><rect x="16.4" y="6" width="2.6" height="12" fill="#f59e0b" stroke="none"/>' },
  gsc: { color: '#4285F4', paths: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.35-4.35"/>' },
};

/** Small colored line-icon prefixed to a primary section's <h2>, one per data source/module. */
function sectionIcon(kind: IconKind, size = 18): string {
  const { color, paths } = ICON_PATHS[kind];
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${paths}</svg>`;
}

@Injectable()
export class SiteAuditReportService {
  private readonly logger = new Logger(SiteAuditReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outreach: OutreachService,
    private readonly monthlyReport: MonthlyReportService,
    private readonly email: EmailService,
  ) {}

  /**
   * The ONE monthly report email — built from each project's latest completed
   * site audit (technical + GEO + backlink + performance) with GA4/GSC merged
   * in via buildData(). Replaces the old, separate MonthlyReportService cron
   * (removed) so customers get a single, consistent report instead of two.
   * Projects with no completed scan yet are skipped (nothing to send) rather
   * than emailing an empty report.
   */
  @Cron('0 17 1 * *', { timeZone: 'Europe/Istanbul' })
  async sendMonthlyReports(): Promise<void> {
    const projects = await this.prisma.project.findMany({
      where: {
        status: 'ACTIVE',
        organization: {
          subscription: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] } },
        },
      },
      include: { organization: true },
    });

    let sent = 0;
    for (const project of projects) {
      try {
        const data = await this.buildData(project.id);
        const html = this.renderHtml(data);
        const pdf = await this.generatePdf(html);

        const owner = await this.prisma.user.findUnique({
          where: { id: project.organization.ownerUserId },
          select: { email: true, fullName: true },
        });
        if (!owner) continue;

        const bodyHtml = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
          <h2 style="color:#1d4ed8">Aylık SEO Raporunuz Hazır</h2>
          <p>Merhaba ${escapeHtml(owner.fullName ?? '')},</p>
          <p><strong>${escapeHtml(project.domain)}</strong> için site denetimi raporunuz ektedir.</p>
          <p>Genel skor: ${data.overallGrade} (${Math.round(data.overallScore)}/100) · ${data.recommendations.length} öneri.</p>
          <p><a href="https://funbreakseo.com/tr/dashboard/projects/${project.id}/audit" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:600">Panelde Görüntüle</a></p>
          <p style="color:#94a3b8;font-size:12px">FunBreak SEO · funbreakseo.com</p>
        </div>`;

        const subject = `${project.domain} — Aylık SEO Raporu — ${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`;

        if (pdf) {
          await this.email.sendMail(owner.email, subject, bodyHtml, [
            { filename: `site-denetimi-${project.domain}-${new Date().toISOString().slice(0, 7)}.pdf`, content: pdf, contentType: 'application/pdf' },
          ]);
        } else {
          await this.email.sendMail(owner.email, subject, html);
        }
        sent++;
      } catch (e) {
        this.logger.warn(`Aylık rapor gönderilemedi (${project.id}): ${(e as Error).message}`);
      }
    }
    this.logger.log(`Aylık raporlar işlendi: ${sent}/${projects.length} proje`);
  }

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

    const [gauges, top, anchors, geography, monthly] = await Promise.all([
      this.outreach.getBacklinkGauges(projectId).catch(() => ({
        domainStrength: 0,
        pageStrength: 0,
        counters: {} as Record<string, number>,
      })),
      this.outreach.getTopBacklinks(projectId, 10).catch(() => []),
      this.outreach.getTopAnchors(projectId, 10).catch(() => []),
      this.outreach.getBacklinkGeography(projectId).catch(() => ({ byTld: [] as Array<{ tld: string; count: number }>, byCountry: [] })),
      // Same GA4+GSC data that used to power a separate monthly report — now
      // folded into this one unified report instead of a parallel pipeline.
      this.monthlyReport.buildReportData(projectId).catch((err) => {
        this.logger.warn(`GA4/GSC verisi alınamadı (${projectId}): ${(err as Error).message}`);
        return null;
      }),
    ]);

    return {
      project: { domain: project.domain, organization: project.organization?.name ?? '' },
      generatedAt: new Date().toISOString(),
      crawlJob: {
        finishedAt: crawlJob.finishedAt?.toISOString() ?? null,
        pagesScanned: crawlJob.pagesScanned,
        issuesFound: crawlJob.issuesFound,
        totalPagesQueued: crawlJob.totalPagesQueued,
      },
      overallScore: report.overallScore,
      overallGrade: report.overallGrade,
      categoryScores: (report.categoryScores as any) ?? {},
      recommendations: (report.recommendations as any) ?? [],
      onPage: report.onPageJson,
      geo: report.geoJson,
      performance: report.performanceJson,
      technology: report.technologyJson,
      usability: report.usabilityJson,
      social: report.socialJson,
      localSeo: report.localSeoJson,
      crawlList: report.crawlListJson,
      screenshots: {
        desktop: report.screenshotDesktopUrl,
        mobile: report.screenshotMobileUrl,
        tablet: report.screenshotTabletUrl,
      },
      backlink: {
        domainStrength: gauges.domainStrength,
        pageStrength: gauges.pageStrength,
        counters: gauges.counters as Record<string, number>,
        top: top as any,
        anchors: anchors as any,
        tld: geography.byTld as any,
      },
      ga4: monthly
        ? {
            connected: monthly.analytics.connected,
            current: monthly.analytics.current,
            previous: monthly.analytics.previous,
            channels: monthly.analytics.channels,
            daily: monthly.analytics.daily,
            devices: monthly.analytics.devices,
            countries: monthly.analytics.countries,
          }
        : null,
      gsc: monthly
        ? {
            connected: monthly.gscConnected,
            current: monthly.organic.current,
            previous: monthly.organic.previous,
            daily: monthly.organic.daily,
            dailyPrevious: monthly.organic.dailyPrevious,
            topQueries: monthly.organic.topQueries,
            topPages: monthly.organic.topPages,
            devices: monthly.organic.devices,
            countries: monthly.organic.countries,
          }
        : null,
      periodLabel: monthly?.period.label ?? '',
    };
  }

  renderHtml(d: SiteAuditReportData): string {
    const dateLabel = d.crawlJob.finishedAt
      ? new Date(d.crawlJob.finishedAt).toLocaleString('tr-TR')
      : new Date(d.generatedAt).toLocaleString('tr-TR');

    // Every content page (not the cover) gets a thin navy header bar + footer
    // with a sequential page number. The total isn't known until every page
    // block below has been built, so we emit a placeholder and replace it
    // globally right before returning.
    let pageCounter = 0;
    const pageWrap = (inner: string): string => {
      pageCounter += 1;
      const n = pageCounter;
      return `<div class="page">
  <div class="pagehead">
    <div class="ph-brand">${brandMarkSvg(13)}<span>FunBreak SEO</span></div>
    <div class="ph-meta">${escapeHtml(d.project.domain)} &middot; ${dateLabel}</div>
    <div class="ph-num">${n} / __TOTAL_PAGES__</div>
  </div>
  <div class="page-body">
${inner}
  </div>
  <div class="pagefoot">
    <span>FunBreak SEO &middot; funbreakseo.com &middot; Gizli</span>
    <span>${n} / __TOTAL_PAGES__</span>
  </div>
</div>`;
    };

    // ── Sayfa 1: Kapak ──────────────────────────────────────────────────
    const cover = `<div class="page cover">
  <div class="cover-topbar">
    <div class="cover-logo">${brandMarkBadge(20)}<span>FunBreak <b>SEO</b></span></div>
    <span class="cover-confidential">Gizli Rapor</span>
  </div>
  <div class="cover-mid">
    <div class="cover-titles">
      <h1>Aylık SEO &amp; Site Denetimi Raporu</h1>
      <div class="cover-domain">${escapeHtml(d.project.domain)}</div>
      <div class="cover-date">Tarama tarihi: ${dateLabel}${d.periodLabel ? ` · Dönem: ${escapeHtml(d.periodLabel)}` : ''}</div>
    </div>
    <div class="cover-score">
      ${ringSvg(d.overallScore, d.overallGrade, 190, 16)}
      <div class="cover-grade">${escapeHtml(d.overallGrade)}<span class="cover-grade-sub">${Math.round(d.overallScore)}/100</span></div>
    </div>
  </div>
  <div class="cover-footer">
    <span>${escapeHtml(d.project.organization || 'FunBreak Global Teknoloji Ltd. Şti.')} için hazırlandı</span>
    <span>funbreakseo.com</span>
  </div>
</div>`;

    // ── Sayfa 2: Genel Özet ─────────────────────────────────────────────
    const categoryRings = (Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[])
      .map((key) => {
        const cs = (d.categoryScores as any)?.[key] ?? { score: 0, grade: '—' };
        return `<div class="cat-ring">${categoryRingSvg(cs.score, cs.grade)}<div class="cat-label">${CATEGORY_LABELS[key]}</div></div>`;
      })
      .join('');
    const radarCategories = (Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((key) => ({
      label: CATEGORY_LABELS[key],
      score: (d.categoryScores as any)?.[key]?.score ?? 0,
    }));

    const critCount = d.recommendations.filter((r) => r.priority === 'CRITICAL').length;
    const midCount = d.recommendations.filter((r) => r.priority === 'MEDIUM').length;
    const lowCount = d.recommendations.filter((r) => r.priority === 'LOW').length;

    const priorityLabel: Record<string, string> = { CRITICAL: 'Kritik', MEDIUM: 'Orta', LOW: 'Düşük' };
    const recRows = d.recommendations
      .map((r) => {
        const cls = r.priority === 'CRITICAL' ? 'high' : r.priority === 'MEDIUM' ? 'mid' : 'low';
        return `<div class="rec rec-${cls}"><span class="prio ${cls}">${priorityLabel[r.priority] ?? r.priority}</span>
          <div><div style="font-weight:700">${escapeHtml(r.title)}</div>${r.affectedCount ? `<div class="muted">${r.affectedCount} sayfayı etkiliyor</div>` : ''}${r.howToFix ? `<div class="muted" style="margin-top:2px">${escapeHtml(r.howToFix)}</div>` : ''}</div></div>`;
      })
      .join('');

    const summaryPage = pageWrap(`
  <div class="section">
    <h2>${sectionIcon('summary')}Genel Özet</h2>
    <p class="sub">Bu rapor sitenizin teknik SEO, GEO/AI görünürlük, backlink, kullanılabilirlik ve performans durumunu tek seferde özetler; ardından (bağlıysa) Google Analytics ve Search Console verilerinizle devam eder.</p>
    <p class="sub">${d.crawlJob.pagesScanned}${d.crawlJob.totalPagesQueued ? `/${d.crawlJob.totalPagesQueued}` : ''} sayfa tarandı · ${d.crawlJob.issuesFound} sorun tespit edildi · <span class="prio high" style="display:inline-block">${critCount} Kritik</span> <span class="prio mid" style="display:inline-block">${midCount} Orta</span> <span class="prio low" style="display:inline-block">${lowCount} Düşük</span></p>
    <div class="cat-rings">${categoryRings}</div>
  </div>
  <div class="section" style="text-align:center">
    <h2 style="justify-content:center">${sectionIcon('summary')}Kategori Karşılaştırması</h2>
    <p class="sub">5 kategorinin tek grafikte karşılaştırması</p>
    <div class="chart-center">${radarSvg(radarCategories)}</div>
    <p class="chart-caption">Merkeze yakın noktalar zayıf, dış çembere yakın noktalar güçlü kategorileri gösterir.</p>
  </div>
`);

    const recsPage = pageWrap(`
  <div class="section">
    <h2>${sectionIcon('recs')}Öncelikli Öneriler</h2>
    <p class="sub">Sitenizde tespit edilen tüm sorunlar, önem sırasına göre (Kritik → Orta → Düşük). Kritik maddeler görünürlüğünüzü en çok etkileyenlerdir.</p>
    ${recRows || '<p class="muted">Öneri bulunamadı — tebrikler!</p>'}
  </div>
`);

    // ── Sayfa: Sayfa İçi SEO + SERP + Anahtar Kelime Matrisi ────────────
    const serpTitle = escapeHtml(d.onPage?.serpPreview?.title ?? d.project.domain);
    const serpDesc = escapeHtml(d.onPage?.serpPreview?.description ?? '');
    const serpUrl = escapeHtml(d.onPage?.serpPreview?.url ?? `https://${d.project.domain}`);

    const onPageRows = [
      ['XML Sitemap', d.onPage?.sitemap?.found ? 'Bulundu' : 'Bulunamadı'],
      ['Robots.txt taramayı engelliyor mu', d.onPage?.robotsTxt?.blocking ? 'Evet (kritik)' : 'Hayır'],
      ['Canonical etiketi', d.onPage?.canonicalUrl ? 'Var' : 'Yok'],
      ['Noindex (meta)', d.onPage?.noindexMeta ? 'Var (dikkat)' : 'Yok'],
      ['Noindex (HTTP başlığı)', d.onPage?.noindexHeader ? 'Var (dikkat)' : 'Yok'],
      ['Schema.org tipleri', (d.onPage?.schemaTypes ?? []).join(', ') || 'Bulunamadı'],
      ['Dil (lang)', d.onPage?.lang ?? '—'],
      ['Kelime sayısı', d.onPage?.wordCount != null ? `${d.onPage.wordCount} kelime` : '—'],
    ]
      .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td class="num">${escapeHtml(String(v))}</td></tr>`)
      .join('');

    const keywordMatrixRows = (d.onPage?.keywordMatrix ?? [])
      .slice(0, 15)
      .map(
        (k: any) =>
          `<tr><td>${escapeHtml(k.phrase)}</td><td class="num">${k.inTitle ? '✓' : '✗'}</td><td class="num">${k.inMeta ? '✓' : '✗'}</td><td class="num">${k.inH1 ? '✓' : '✗'}</td><td class="num">${k.inH2 ? '✓' : '✗'}</td></tr>`,
      )
      .join('');

    const onPagePage = pageWrap(`
  <div class="section">
    <h2>${sectionIcon('onpage')}SERP Önizlemesi</h2>
    <p class="sub">Siteniz Google arama sonuçlarında şu şekilde görünüyor.</p>
    <div class="serp"><div class="serp-favicon"></div><div><div class="url">${serpUrl}</div><div class="title">${serpTitle}</div><div class="desc">${serpDesc}</div></div></div>
  </div>
  <div class="section">
    <h2>Sayfa İçi SEO — Teknik Kontroller</h2>
    <table>${onPageRows}</table>
  </div>
  ${keywordMatrixRows ? `<div class="section">
    <h2>Anahtar Kelime Tutarlılık Matrisi</h2>
    <p class="sub">Takip ettiğiniz kelimelerin Title/Meta/H1/H2 etiketlerinde geçip geçmediği.</p>
    <table><tr><th>Kelime</th><th>Title</th><th>Meta</th><th>H1</th><th>H2</th></tr>${keywordMatrixRows}</table>
  </div>` : ''}
`);

    // ── Sayfa: Cihaz Görünümleri ─────────────────────────────────────────
    const screenshotsPage = (d.screenshots.desktop || d.screenshots.mobile || d.screenshots.tablet)
      ? pageWrap(`
  <div class="section">
    <h2>${sectionIcon('shots')}Cihaz Görünümleri</h2>
    <p class="sub">Sitenizin masaüstü ve mobil cihazlarda gerçek görünümü.</p>
    <div class="shots">
      ${d.screenshots.desktop ? `<div class="shot-frame shot-desktop"><img src="${d.screenshots.desktop}" /></div><div class="shot-caption">Masaüstü</div>` : ''}
      ${d.screenshots.mobile ? `<div class="shot-frame shot-mobile"><img src="${d.screenshots.mobile}" /></div><div class="shot-caption">Mobil</div>` : ''}
    </div>
  </div>
`)
      : '';

    // ── Sayfa: Backlink ───────────────────────────────────────────────
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

    const backlinkPage = pageWrap(`
  <div class="section">
    <h2>${sectionIcon('backlink')}Backlink &amp; Otorite</h2>
    <p class="sub">Backlinkler, diğer sitelerin sizin sitenize verdiği bağlantılardır — Google için bir güven oyu gibidir.</p>
    <div class="gauge-row">${halfGaugeSvg(d.backlink.domainStrength, 'Domain Strength')}${halfGaugeSvg(d.backlink.pageStrength, 'Page Strength')}</div>
    <div class="kpis">
      ${kpiCard('Toplam Backlink', String(c.total ?? 0), { accent: 'blue' })}
      ${kpiCard('Yönlendiren Alan', String(c.referringDomains ?? 0), { accent: 'blue' })}
      ${kpiCard('Dofollow', String(c.dofollow ?? 0), { accent: 'green' })}
      ${kpiCard('Nofollow', String(c.nofollow ?? 0), { accent: 'orange' })}
    </div>
  </div>
  <div class="section">
    <h2>En Değerli Backlinkler</h2>
    <table><tr><th>DR</th><th>Kaynak</th><th>Anchor</th><th>Tip</th></tr>${backlinkTop || '<tr><td colspan="4" class="muted">Veri yok</td></tr>'}</table>
  </div>
  <div class="section">
    <h2>En Sık Kullanılan Anchor Metinleri</h2>
    <table><tr><th>Anchor</th><th>Adet</th></tr>${anchorRows || '<tr><td colspan="2" class="muted">Veri yok</td></tr>'}</table>
  </div>
  ${d.backlink.tld && d.backlink.tld.length > 0 ? `<div class="section">
    <h2>TLD Dağılımı</h2>
    <p class="sub">Backlinklerinizin geldiği alan adı uzantıları (.com, .tr, .org vb.).</p>
    <div class="chart-center">${donutChartSvg(d.backlink.tld.slice(0, 8).map((t) => ({ label: `.${t.tld}`, value: t.count })))}</div>
  </div>` : ''}
`);

    // ── Sayfa: Performans (her zaman elde olan verileri gösterir) ───────
    const perf = d.performance ?? {};
    const psi = perf.psi ?? {};
    const cwv = perf.coreWebVitals ?? {};
    const cwvRow = (label: string, m: any) =>
      m ? `<tr><td>${label}</td><td class="num">${((m.lcp?.value ?? 0) / 1000).toFixed(1)}s</td><td class="num">${Math.round(m.inp?.value ?? 0)}ms</td><td class="num">${(m.cls?.value ?? 0).toFixed(2)}</td></tr>` : '';
    const sizeBreakdown = perf.sizeBreakdown ?? {};
    const sizeRows = Object.entries(sizeBreakdown)
      .map(([k, v]: [string, any]) => `<tr><td>${k.toUpperCase()}</td><td class="num">${((v ?? 0) / 1024).toFixed(0)} KB</td></tr>`)
      .join('');

    const perfPage = pageWrap(`
  <div class="section">
    <h2>${sectionIcon('performance')}Performans</h2>
    <p class="sub">Sayfa hızı, kullanıcı deneyimi ve Google sıralaması için doğrudan etkilidir.</p>
    <div class="kpis">
      ${kpiCard('Sunucu Yanıt Süresi', perf.serverResponseMs != null ? `${(perf.serverResponseMs / 1000).toFixed(2)}s` : '—', { accent: 'blue' })}
      ${kpiCard('Sayfa Yükleme Süresi', perf.pageLoadMs != null ? `${(perf.pageLoadMs / 1000).toFixed(1)}s` : '—', { accent: 'orange' })}
      ${kpiCard('İndirme Boyutu', perf.downloadSizeBytes != null ? `${(perf.downloadSizeBytes / (1024 * 1024)).toFixed(2)} MB` : '—', { accent: 'blue' })}
      ${kpiCard('İstek Sayısı', String(perf.requestCount ?? '—'), { accent: 'blue' })}
    </div>
    ${sizeRows ? `<table><tr><th>Kaynak Tipi</th><th>Boyut</th></tr>${sizeRows}</table>` : ''}
  </div>
  <div class="section">
    <h2>PageSpeed Insights</h2>
    <div class="gauge-row">
      ${psi.mobile ? halfGaugeSvg(psi.mobile.score, 'PageSpeed — Mobil') : ''}
      ${psi.desktop ? halfGaugeSvg(psi.desktop.score, 'PageSpeed — Masaüstü') : ''}
    </div>
    ${(psi.mobile || psi.desktop) ? `<table><tr><th></th><th>LCP</th><th>INP</th><th>CLS</th></tr>${cwvRow('Mobil', cwv.mobile)}${cwvRow('Masaüstü', cwv.desktop)}</table>` : '<p class="muted">PageSpeed Insights verisi bu tarama için mevcut değil (GOOGLE_PSI_API_KEY tanımlı değil veya kota aşıldı) — yukarıdaki temel performans ölçümleri yine de gerçek Puppeteer taramasından alınmıştır.</p>'}
  </div>
`);

    // ── Sayfa: GEO / AI ───────────────────────────────────────────────
    const eeat = d.geo?.eeat ?? { score: 0, factors: [] };
    const eeatRows = (eeat.factors ?? [])
      .map((f: any) => `<tr><td>${escapeHtml(f.label)}</td><td class="num">${f.present ? '✓' : '✗'}</td></tr>`)
      .join('');
    const geoPage = pageWrap(`
  <div class="section">
    <h2>${sectionIcon('geo')}GEO / AI Görünürlük</h2>
    <p class="sub">ChatGPT, Perplexity, Gemini gibi AI asistanların sitenizi ne kadar iyi anlayıp alıntılayabileceğini ölçer.</p>
    <div class="kpis">
      ${kpiCard('Kimlik Şeması', d.geo?.identitySchema?.found ? escapeHtml(d.geo.identitySchema.type) : 'Yok', { accent: d.geo?.identitySchema?.found ? 'green' : 'red' })}
      ${kpiCard('llms.txt', d.geo?.llmsTxt?.found ? 'Var' : 'Yok', { accent: d.geo?.llmsTxt?.found ? 'green' : 'red' })}
      ${kpiCard('LLM Okunabilirlik', d.geo?.llmReadability?.rating ?? '—', { accent: 'blue' })}
    </div>
    ${barGauge('E-E-A-T Skoru', eeat.score ?? 0)}
    <table><tr><th>Faktör</th><th>Durum</th></tr>${eeatRows || '<tr><td colspan="2" class="muted">Veri yok</td></tr>'}</table>
  </div>
`);

    // ── Sayfa: Sosyal Medya + Yerel SEO ─────────────────────────────────
    const social = d.social ?? {};
    const socialRows = (social.profiles ?? [])
      .map((p: any) => `<tr><td style="text-transform:capitalize">${escapeHtml(p.platform)}</td><td class="num">${p.found ? '✓' : '✗'}</td></tr>`)
      .join('');
    const localSeo = d.localSeo ?? {};
    const socialLocalPage = pageWrap(`
  <div class="section">
    <h2>${sectionIcon('social')}Sosyal Medya</h2>
    <p class="sub">Sosyal medya profilleri ve paylaşım etiketleri (Open Graph/Twitter Card) marka görünürlüğünü destekler.</p>
    <table><tr><th>Platform</th><th>Bağlantı Var mı</th></tr>${socialRows || '<tr><td colspan="2" class="muted">Veri yok</td></tr>'}</table>
    <table style="margin-top:10px"><tr><td>Open Graph etiketleri</td><td class="num">${social.openGraph?.title ? 'Var' : 'Yok'}</td></tr><tr><td>Twitter/X Card</td><td class="num">${social.twitterCard?.type ? 'Var' : 'Yok'}</td></tr><tr><td>Facebook Pixel</td><td class="num">${social.facebookPixel ? 'Var' : 'Yok'}</td></tr></table>
  </div>
  <div class="section">
    <h2>${sectionIcon('local')}Yerel SEO</h2>
    <p class="sub">Yerel işletmeler için Google'ın işletmenizi doğru tanıması adına önemlidir.</p>
    <table>
      <tr><td>LocalBusiness / Organization Şeması</td><td class="num">${localSeo.found ? escapeHtml(localSeo.schemaType) : 'Yok'}</td></tr>
      <tr><td>İşletme Adı</td><td class="num">${escapeHtml(localSeo.name) || '—'}</td></tr>
      <tr><td>Adres</td><td class="num">${escapeHtml(localSeo.address) || '—'}</td></tr>
      <tr><td>Telefon</td><td class="num">${escapeHtml(localSeo.telephone) || '—'}</td></tr>
      <tr><td>NAP Tutarlılığı</td><td class="num">${localSeo.napConsistency?.consistent === true ? 'Tutarlı' : localSeo.napConsistency?.consistent === false ? 'Tutarsız' : 'Karşılaştırılamadı'}</td></tr>
    </table>
  </div>
`);

    // ── Sayfa: Teknoloji + Domain Bilgileri + Alt Sayfalar ───────────────
    const tech = d.technology ?? {};
    const techRows = (tech.technologies ?? [])
      .map((t: any) => `<tr><td>${escapeHtml(t.category)}</td><td class="num">${escapeHtml(t.name)}</td></tr>`)
      .join('');
    const domainInfoRows = [
      ['Domain Yaşı', tech.domainAgeYears != null ? `${tech.domainAgeYears.toFixed(1)} yıl` : 'Bilinmiyor'],
      ['SSL Durumu', tech.sslValid ? 'Geçerli' : 'Sorunlu'],
      ['SSL Bitiş Tarihi', tech.sslExpiryDate ? new Date(tech.sslExpiryDate).toLocaleDateString('tr-TR') : 'Bilinmiyor'],
      ['DMARC Kaydı', tech.dmarc?.found ? 'Var' : 'Yok'],
      ['SPF Kaydı', tech.spf?.found ? 'Var' : 'Yok'],
      ['Sunucu IP', tech.serverIp ?? '—'],
      ['Web Sunucusu', tech.webServer ?? '—'],
      ['DNS Sunucuları', (tech.nameservers ?? []).join(', ') || '—'],
    ]
      .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td class="num">${escapeHtml(String(v))}</td></tr>`)
      .join('');

    const crawlList = d.crawlList ?? {};
    const totalUrls = (crawlList.urls ?? []).length;
    const brokenCount = (crawlList.brokenLinks ?? []).length;
    const orphanCount = (crawlList.orphanPages ?? []).length;
    const redirectCount = (crawlList.redirectChains ?? []).length;

    const techDomainPage = pageWrap(`
  <div class="section">
    <h2>${sectionIcon('tech')}Teknoloji Yığını</h2>
    <p class="sub">Sitenizde tespit edilen CMS, framework, analytics ve diğer araçlar.</p>
    <table><tr><th>Kategori</th><th>Teknoloji</th></tr>${techRows || '<tr><td colspan="2" class="muted">Tespit edilemedi</td></tr>'}</table>
  </div>
  <div class="section">
    <h2>Domain / Güvenlik Bilgileri</h2>
    <table>${domainInfoRows}</table>
  </div>
  <div class="section">
    <h2>Alt Sayfalar Özeti</h2>
    <p class="sub">Taranan tüm sayfalar ve tespit edilen bağlantı sorunları.</p>
    <div class="kpis">
      ${kpiCard('Toplam URL', String(totalUrls), { accent: 'blue' })}
      ${kpiCard('Kırık Link', String(brokenCount), { accent: 'red' })}
      ${kpiCard('Yönlendirme Zinciri', String(redirectCount), { accent: 'orange' })}
      ${kpiCard('Orphan Sayfa', String(orphanCount), { accent: 'orange' })}
    </div>
  </div>
  <p class="muted" style="margin-top:20px">Bu rapor FunBreak SEO tarafından ${new Date(d.generatedAt).toLocaleString('tr-TR')} tarihinde otomatik oluşturulmuştur · funbreakseo.com · destek@funbreakseo.com</p>
`);

    // ── Sayfa: Google Analytics (GA4) ────────────────────────────────────
    const ga4Page = d.ga4?.connected
      ? (() => {
          const g = d.ga4!;
          const dayLabels = g.daily.map((x) => x.date);
          const channelMax = Math.max(1, ...g.channels.map((c) => c.sessions));
          const topChannels = [...g.channels].sort((a, b) => b.sessions - a.sessions).slice(0, 6);
          const p1 = pageWrap(`
  <div class="section">
    <h2>${sectionIcon('ga4')}Google Analytics (GA4)</h2>
    <p class="sub">Sitenize gelen ziyaretçilerin sayısı, davranışı ve nereden geldiği.</p>
    <div class="kpis">
      ${kpiCard('Kullanıcı', fmt(g.current.users), { accent: 'blue', delta: deltaHtml(g.current.users, g.previous.users) })}
      ${kpiCard('Oturum', fmt(g.current.sessions), { accent: 'blue', delta: deltaHtml(g.current.sessions, g.previous.sessions) })}
      ${kpiCard('Görüntüleme', fmt(g.current.pageViews), { accent: 'blue', delta: deltaHtml(g.current.pageViews, g.previous.pageViews) })}
      ${kpiCard('Hemen Çıkma', `%${g.current.bounceRate.toFixed(1)}`, { accent: 'orange', delta: deltaHtml(g.current.bounceRate, g.previous.bounceRate) })}
    </div>
  </div>
  <div class="section">
    <h2>Günlük Görüntüleme Trendi</h2>
    <div class="chart-center">${lineChartSvg([{ label: 'Sayfa Görüntüleme', color: '#1d4ed8', points: g.daily.map((x) => x.pageViews) }], dayLabels)}</div>
    <p class="chart-caption">Son dönemdeki günlük sayfa görüntüleme sayınızın seyri.</p>
  </div>
  <div class="section">
    <h2>Kullanıcı vs Yeni Kullanıcı</h2>
    <div class="chart-center">${lineChartSvg(
      [
        { label: 'Toplam Kullanıcı', color: '#1d4ed8', points: g.daily.map((x) => x.users) },
        { label: 'Yeni Kullanıcı', color: '#16a34a', points: g.daily.map((x) => x.newUsers) },
      ],
      dayLabels,
    )}</div>
    <p class="chart-caption">Yeni kullanıcı çizgisinin toplam kullanıcıya yakınlığı, sitenizin ne kadar yeni ziyaretçi çektiğini gösterir.</p>
  </div>
`);
          const p2 = pageWrap(`
  <div class="section">
    <h2>Trafik Kaynağı Dağılımı</h2>
    <p class="sub">Ziyaretçileriniz hangi kanaldan geliyor.</p>
    <div class="chart-center">${donutChartSvg(topChannels.map((c) => ({ label: c.channel, value: c.sessions })))}</div>
  </div>
  <div class="two-col">
    <div class="section">
      <h2>Cihaz Dağılımı</h2>
      <div class="chart-center">${donutChartSvg(g.devices.map((x) => ({ label: x.device, value: x.sessions })))}</div>
    </div>
    <div class="section">
      <h2>Ülkeye Göre Oturum</h2>
      <div class="chart-center">${barChartSvg(g.countries.slice(0, 8).map((x) => ({ label: x.country.toUpperCase(), value: x.sessions })), 280)}</div>
    </div>
  </div>
  <div class="section">
    <h2>Trafik Kaynakları — Detay</h2>
    <p class="sub">"AI Assistant" satırı ChatGPT/Perplexity gibi AI araçlarından gelen trafiği gösterir — GEO çalışmalarınızın somut kanıtıdır.</p>
    <table><tr><th>Kaynak</th><th>Oturum</th><th>Kullanıcı</th></tr>${g.channels.map((ch) => `<tr style="${heatCell(ch.sessions, channelMax)}${ch.channel.startsWith('AI Assistant') ? ';outline:1px solid #6366f1' : ''}"><td>${escapeHtml(ch.channel)}</td><td class="num">${fmt(ch.sessions)}</td><td class="num">${fmt(ch.users)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Veri yok</td></tr>'}</table>
  </div>
`);
          return p1 + p2;
        })()
      : pageWrap(`
  <div class="section">
    <h2>${sectionIcon('ga4')}Google Analytics (GA4)</h2>
    <p class="muted">GA4 henüz bağlanmadı. Panelden Google hesabınızı bağlayarak trafik verilerinizi bu rapora dahil edebilirsiniz.</p>
  </div>
`);

    // ── Sayfa: Google Search Console ────────────────────────────────────
    const gscPage = d.gsc?.connected
      ? (() => {
          const s = d.gsc!;
          const gscLabels = s.daily.map((x) => x.date);
          const p1 = pageWrap(`
  <div class="section">
    <h2>${sectionIcon('gsc')}Google Search Console</h2>
    <p class="sub">Google aramalarında sitenizin gösterim ve tıklanma performansı.</p>
    <div class="kpis">
      ${kpiCard('Tıklama', fmt(s.current.clicks), { accent: 'blue', delta: deltaHtml(s.current.clicks, s.previous.clicks) })}
      ${kpiCard('Gösterim', fmt(s.current.impressions), { accent: 'blue', delta: deltaHtml(s.current.impressions, s.previous.impressions) })}
      ${kpiCard('CTR', `%${s.current.ctr.toFixed(1)}`, { accent: 'green', delta: deltaHtml(s.current.ctr, s.previous.ctr) })}
      ${kpiCard('Ort. Pozisyon', s.current.position.toFixed(1), { accent: 'blue', delta: deltaHtml(s.previous.position, s.current.position) })}
    </div>
  </div>
  <div class="section">
    <h2>Tıklama — Bu Ay vs Önceki Ay</h2>
    <div class="chart-center">${lineChartSvg(
      [
        { label: 'Bu Ay', color: '#1d4ed8', points: s.daily.map((x) => x.clicks) },
        { label: 'Önceki Ay', color: '#94a3b8', points: s.dailyPrevious.map((x) => x.clicks) },
      ],
      gscLabels,
    )}</div>
    <p class="chart-caption">Mavi çizgi bu ayı, gri çizgi önceki ayı gösterir — aradaki fark arama trafiğinizin yönünü ortaya koyar.</p>
  </div>
  <div class="section">
    <h2>Gösterim — Bu Ay vs Önceki Ay</h2>
    <div class="chart-center">${lineChartSvg(
      [
        { label: 'Bu Ay', color: '#7c3aed', points: s.daily.map((x) => x.impressions) },
        { label: 'Önceki Ay', color: '#94a3b8', points: s.dailyPrevious.map((x) => x.impressions) },
      ],
      gscLabels,
    )}</div>
    <p class="chart-caption">Google'da sitenizin kaç kez arama sonuçlarında gösterildiğinin bu ay/önceki ay karşılaştırması.</p>
  </div>
`);
          const p2 = pageWrap(`
  <div class="two-col">
    <div class="section">
      <h2>Cihaz Dağılımı</h2>
      <div class="chart-center">${barChartSvg(s.devices.slice(0, 5).map((x) => ({ label: x.device, value: x.clicks })), 280)}</div>
    </div>
    <div class="section">
      <h2>Ülke Dağılımı</h2>
      <div class="chart-center">${barChartSvg(s.countries.slice(0, 6).map((x) => ({ label: x.country.toUpperCase(), value: x.clicks })), 280)}</div>
    </div>
  </div>
  <div class="section">
    <h2>En İyi Sorgular</h2>
    <table><tr><th>Sorgu</th><th>Tıklama</th><th>Gösterim</th><th>CTR</th><th>Pozisyon</th></tr>${s.topQueries.slice(0, 15).map((q) => `<tr><td>${escapeHtml(q.query)}</td><td class="num">${fmt(q.clicks)}</td><td class="num">${fmt(q.impressions)}</td><td class="num">%${q.ctr.toFixed(1)}</td><td class="num" style="color:${posColor(q.position)};font-weight:700">${q.position.toFixed(1)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Veri yok</td></tr>'}</table>
  </div>
`);
          const p3 = pageWrap(`
  <div class="section">
    <h2>En Çok Tıklanan Sayfalar</h2>
    <table><tr><th>Sayfa</th><th>Tıklama</th><th>Gösterim</th></tr>${s.topPages.slice(0, 10).map((p) => `<tr><td class="url">${escapeHtml(p.page.replace(/^https?:\/\/[^/]+/, '') || '/')}</td><td class="num">${fmt(p.clicks)}</td><td class="num">${fmt(p.impressions)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Veri yok</td></tr>'}</table>
  </div>
`);
          return p1 + p2 + p3;
        })()
      : pageWrap(`
  <div class="section">
    <h2>${sectionIcon('gsc')}Google Search Console</h2>
    <p class="muted">Search Console henüz bağlanmadı. Panelden bağlayarak arama performansı verilerinizi bu rapora dahil edebilirsiniz.</p>
  </div>
`);

    const fullHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 12px; line-height: 1.5; background: #eef1f6; }
  .page { page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; background: #eef1f6; }
  .page:last-child { page-break-after: auto; }
  .page-body { flex: 1; padding: 28px 44px 24px; }

  /* ── Kapak ─────────────────────────────────────────────────────────── */
  .cover { background: linear-gradient(155deg, #0f172a 0%, #172554 55%, #0f172a 100%); color: #fff;
           padding: 44px 56px; justify-content: space-between; }
  .cover-topbar { display: flex; align-items: center; justify-content: space-between; }
  .cover-logo { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; letter-spacing: -0.2px; }
  .cover-logo b { font-weight: 400; opacity: 0.75; }
  .cover-confidential { font-size: 9px; letter-spacing: 0.14em; color: #fbbf24; border: 1px solid rgba(251,191,36,0.4);
                          padding: 4px 10px; border-radius: 20px; font-weight: 700; text-transform: uppercase; }
  .cover-mid { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 34px; }
  .cover-titles h1 { font-size: 24px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.3px; }
  .cover-domain { font-size: 30px; font-weight: 800; margin-bottom: 8px; }
  .cover-date { font-size: 12px; color: #94a3b8; }
  .cover-score { display: flex; align-items: center; gap: 26px; }
  .cover-grade { font-size: 64px; font-weight: 800; line-height: 1; text-align: left; }
  .cover-grade-sub { display: block; font-size: 14px; font-weight: 500; color: #94a3b8; margin-top: 6px; }
  .cover-footer { display: flex; justify-content: space-between; font-size: 10px; color: #64748b;
                  border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; }

  /* ── Sayfa üst/alt şerit ──────────────────────────────────────────── */
  .pagehead { display: flex; align-items: center; justify-content: space-between; background: #0f172a; color: #fff;
              padding: 10px 44px; font-size: 10px; }
  .ph-brand { display: flex; align-items: center; gap: 6px; font-weight: 700; letter-spacing: -0.1px; }
  .ph-meta { color: #94a3b8; }
  .ph-num { color: #64748b; font-variant-numeric: tabular-nums; }

  .pagefoot { display: flex; justify-content: space-between; padding: 10px 44px; font-size: 9px; color: #94a3b8;
              border-top: 1px solid #e2e8f0; }

  h2 { display: flex; align-items: center; gap: 9px; font-size: 16px; color: #1d4ed8; margin: 0 0 10px; font-weight: 800;
       padding-bottom: 8px; border-bottom: 2px solid #e0e7ff; letter-spacing: -0.1px; }
  .sub { color: #64748b; font-size: 11px; line-height: 1.5; margin-bottom: 16px; }
  .section { margin-bottom: 18px; background: #fff; border: 1px solid #e7ebf1; border-radius: 16px; padding: 22px 24px;
             box-shadow: 0 2px 10px rgba(15,23,42,0.06); }
  .two-col .section { margin-bottom: 0; }

  .chart-center { display: flex; justify-content: center; }
  .chart-caption { text-align: center; color: #64748b; font-size: 10px; margin-top: 10px; max-width: 460px; margin-left: auto; margin-right: auto; }

  .cat-rings { display: flex; gap: 16px; justify-content: center; margin-bottom: 8px; }
  .cat-ring { text-align: center; }
  .cat-label { font-size: 10px; color: #64748b; margin-top: 6px; font-weight: 600; }

  .gauge-row { display: flex; gap: 30px; justify-content: center; margin-bottom: 18px; }

  table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; border: 1px solid #e2e8f0;
          border-radius: 10px; overflow: hidden; background: #fff; box-shadow: 0 1px 2px rgba(15,23,42,0.04); }
  th { background: #0f172a; color: #fff; text-align: left; padding: 9px 12px; font-weight: 600; font-size: 10.5px; letter-spacing: 0.02em; }
  td { padding: 8px 12px; border-bottom: 1px solid #eef2f7; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #f6f8fb; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td.url { word-break: break-all; max-width: 340px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

  .rec { display: flex; gap: 12px; align-items: flex-start; padding: 13px 15px; border: 1px solid #e9edf3; border-left-width: 4px;
         border-radius: 10px; margin-bottom: 9px; background: #f8fafc; }
  .rec-high { border-left-color: #dc2626; }
  .rec-mid { border-left-color: #f97316; }
  .rec-low { border-left-color: #94a3b8; }
  .prio { flex-shrink: 0; font-size: 9px; font-weight: 800; padding: 5px 12px; border-radius: 20px; letter-spacing: 0.06em; }
  .prio.high { background: #fee2e2; color: #b91c1c; }
  .prio.mid { background: #ffedd5; color: #c2410c; }
  .prio.low { background: #e2e8f0; color: #475569; }
  .muted { color: #94a3b8; font-size: 10px; margin-top: 2px; }
  .up { color: #16a34a; font-weight: 700; }
  .down { color: #dc2626; font-weight: 700; }
  .flat { color: #94a3b8; }

  .gauge { margin-bottom: 14px; }
  .gauge-label { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
  .gauge-track { height: 10px; border-radius: 6px; background: #e2e8f0; overflow: hidden; }
  .gauge-fill { height: 100%; border-radius: 6px; }

  .serp { display: flex; gap: 10px; border: 1px solid #e9edf3; border-radius: 10px; padding: 16px; background: #f8fafc;
          max-width: 520px; }
  .serp-favicon { width: 18px; height: 18px; border-radius: 50%; background: #dbe4f0; flex-shrink: 0; margin-top: 2px; }
  .serp .url { color: #16a34a; font-size: 11px; }
  .serp .title { color: #1a0dab; font-size: 16px; margin: 3px 0; font-weight: 500; }
  .serp .desc { color: #4d5156; font-size: 12px; }

  .kpis { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
  .kpi { flex: 1; min-width: 116px; border: 1px solid #e9edf3; border-top-width: 3px; border-radius: 12px; padding: 15px 14px;
         background: #f8fafc; text-align: center; }
  .kpi-blue { border-top-color: #1d4ed8; }
  .kpi-green { border-top-color: #16a34a; }
  .kpi-red { border-top-color: #dc2626; }
  .kpi-orange { border-top-color: #f97316; }
  .kpi .label { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 7px; font-weight: 700; }
  .kpi .value { font-size: 21px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
  .kpi .delta { font-size: 10px; margin-top: 4px; font-weight: 600; }

  .shots { display: flex; align-items: flex-end; gap: 24px; }
  .shot-frame { border: 6px solid #0f172a; border-radius: 10px; overflow: hidden; background: #000; }
  .shot-frame img { display: block; width: 100%; }
  .shot-desktop { width: 420px; }
  .shot-mobile { width: 130px; border-radius: 18px; }
  .shot-caption { font-size: 10px; color: #64748b; text-align: center; margin-top: 4px; font-weight: 600; }
</style>
</head>
<body>
${cover}
${summaryPage}
${recsPage}
${onPagePage}
${screenshotsPage}
${backlinkPage}
${perfPage}
${geoPage}
${socialLocalPage}
${techDomainPage}
${ga4Page}
${gscPage}
</body>
</html>`;

    return fullHtml.replace(/__TOTAL_PAGES__/g, String(pageCounter));
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
