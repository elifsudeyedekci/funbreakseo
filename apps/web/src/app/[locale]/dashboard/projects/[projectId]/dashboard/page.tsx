'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Search, Brain, AlertCircle, Clock, Zap, CheckCircle2, Globe, Link2, X, Download, ArrowRight, FileBarChart } from 'lucide-react';
import { projectApi, keywordApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface OverviewData {
  healthScore?: number;
  geoVisibilityScore?: number;
  keywordCount?: number;
  rankedCount?: number;
  firstPageCount?: number;
  top3Count?: number;
  avgPosition?: number | null;
  backlinkCount?: number;
  pagesScanned?: number;
  issuesFound?: number;
  lastCrawl?: { finishedAt?: string; createdAt?: string } | null;
  latestGeoSnapshot?: { mentionCount?: number; citationCount?: number } | null;
  rankTrend?: Array<{ date: string; avgPosition: number }>;
  geoTrend?: Array<{ date: string; mentions: number; citations: number }>;
  activities?: Array<{ type: string; message: string; at: string }>;
  todos?: Array<{ priority: string; message: string }>;
}

interface RankedKeyword {
  keyword?: string;
  phrase?: string;
  position?: number | null;
  searchVolume?: number | null;
  url?: string | null;
}

function StatCard({
  label, value, hint, icon: Icon, color = 'indigo',
}: {
  label: string; value: string | number; hint?: string; icon: React.ElementType; color?: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500/20 text-indigo-400',
    purple: 'bg-purple-500/20 text-purple-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    orange: 'bg-orange-500/20 text-orange-400',
    sky: 'bg-sky-500/20 text-sky-400',
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-white/50">{label}</p>
        <div className={`p-1.5 rounded-lg ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      {hint && <p className="text-[11px] text-white/35 mt-1.5">{hint}</p>}
    </div>
  );
}

const STEP_LABELS: Record<string, string> = {
  crawl: 'Teknik SEO Tarama',
  keywords: 'Anahtar Kelime Keşfi',
  backlinks: 'Backlink Profili',
  geo: 'GEO / AI Görünürlük',
  competitors: 'Rakip Analizi',
  done: 'Tamamlandı',
};

interface ScanProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  percent?: number;
  currentStep?: string;
  steps?: Record<string, { status?: string; error?: string }>;
  summary?: Record<string, number>;
}

/** Build a standalone, printable HTML scan report and download it. */
function downloadReport(name: string, d: OverviewData | undefined, summary?: Record<string, number>) {
  const row = (label: string, value: string | number) =>
    `<tr><td style="padding:8px 12px;color:#555">${label}</td><td style="padding:8px 12px;font-weight:700;text-align:right">${value}</td></tr>`;
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Tarama Raporu</title>
<style>body{font-family:system-ui,Arial,sans-serif;max-width:760px;margin:40px auto;color:#111;padding:0 20px}
h1{font-size:22px}h2{font-size:15px;margin-top:28px;border-bottom:2px solid #eee;padding-bottom:6px}
table{width:100%;border-collapse:collapse;margin-top:8px}tr:nth-child(even){background:#fafafa}
.score{font-size:40px;font-weight:800;color:${(d?.healthScore ?? 0) >= 70 ? '#16a34a' : (d?.healthScore ?? 0) >= 40 ? '#ea580c' : '#dc2626'}}
.muted{color:#888;font-size:12px}</style></head><body>
<h1>FunBreakSEO — Tarama Raporu</h1>
<p class="muted">${name} · ${new Date().toLocaleString('tr-TR')}</p>
<h2>Site Sağlığı</h2><p class="score">${d?.healthScore ?? 0}<span style="font-size:16px;color:#999">/100</span></p>
<h2>Teknik SEO</h2><table>${row('Taranan sayfa', d?.pagesScanned ?? 0)}${row('Bulunan sorun', d?.issuesFound ?? 0)}</table>
<h2>Anahtar Kelime</h2><table>${row('Sıralanan kelime', d?.rankedCount ?? summary?.keywords ?? 0)}${row('Ortalama pozisyon', d?.avgPosition?.toFixed(1) ?? '—')}${row('İlk sayfada (1-10)', d?.firstPageCount ?? 0)}${row('İlk 3', d?.top3Count ?? 0)}</table>
<h2>GEO / AI Görünürlük</h2><table>${row('AI görünürlük skoru', `${d?.geoVisibilityScore ?? 0}%`)}${row('AI bahsedilme', d?.latestGeoSnapshot?.mentionCount ?? 0)}${row('Kaynak gösterilme', d?.latestGeoSnapshot?.citationCount ?? 0)}</table>
<h2>Otorite</h2><table>${row('Backlink', d?.backlinkCount ?? summary?.backlinks ?? 0)}${row('Rakip', summary?.competitors ?? 0)}</table>
<p class="muted" style="margin-top:30px">Bu rapor FunBreakSEO tarafından otomatik üretilmiştir.</p>
</body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tarama-raporu-${name}-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProjectDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const locale = useLocale();
  const t = useTranslations('projectDashboard');
  const [scanning, setScanning] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);

  const fullScanMutation = useMutation({
    mutationFn: () => projectApi.fullScan(projectId).then((r) => r.data),
    onSuccess: () => { setScanning(true); setScanModalOpen(true); },
  });
  const base = `/${locale}/dashboard/projects/${projectId}`;

  const { data: scanProgress } = useQuery<ScanProgress>({
    queryKey: ['full-scan-status', projectId],
    queryFn: () => projectApi.fullScanStatus(projectId).then((r) => r.data),
    enabled: scanning,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'completed' || s === 'error' ? false : 2000;
    },
  });

  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ['project-dashboard', projectId],
    queryFn: () => projectApi.dashboard(projectId).then((r) => r.data ?? {}),
    // Re-pull the overview when a scan finishes so the cards reflect fresh data.
    refetchInterval: scanProgress?.status === 'completed' ? false : undefined,
  });

  const { data: rankedKeywords } = useQuery<RankedKeyword[]>({
    queryKey: ['ranked-keywords', projectId],
    queryFn: () =>
      keywordApi.ranked(projectId)
        .then((r) => (Array.isArray(r.data) ? r.data : (r.data?.data ?? [])) as RankedKeyword[])
        .catch(() => []),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/2 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const rankTrend = data?.rankTrend ?? [];
  const geoTrend = data?.geoTrend ?? [];
  const activities = data?.activities ?? [];
  const todos = data?.todos ?? [];
  const ranked = rankedKeywords ?? [];

  const lastCrawlDate = data?.lastCrawl?.finishedAt ?? data?.lastCrawl?.createdAt ?? null;

  return (
    <div className="p-6 space-y-6">
      {/* Full Scan Banner */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Tam Tarama</h3>
          <p className="text-xs text-white/40 mt-0.5">Teknik SEO + Anahtar Kelime + Backlink + GEO + Rakip — tek seferde hepsini çalıştır</p>
        </div>
        <div className="flex items-center gap-2">
          {(data && (data.pagesScanned ?? 0) > 0) && (
            <button
              onClick={() => setScanModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 transition-all"
            >
              <FileBarChart className="h-4 w-4" /> Son Raporu Gör
            </button>
          )}
          <button
            onClick={() => fullScanMutation.mutate()}
            disabled={fullScanMutation.isPending || scanProgress?.status === 'running'}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
          >
            {fullScanMutation.isPending || scanProgress?.status === 'running' ? (
              <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Taranıyor…</>
            ) : (
              <><Zap className="h-4 w-4" /> Tam Tarama Başlat</>
            )}
          </button>
        </div>
      </div>

      {/* Full Scan modal: live progress + final report (wide in-page panel) */}
      {scanModalOpen && (
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setScanModalOpen(false)} />
        <div className="relative w-full max-w-5xl my-8 rounded-2xl border border-white/10 bg-[#0f0f17] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><FileBarChart className="h-5 w-5 text-indigo-400" /> Tam Tarama Raporu</h2>
            <button onClick={() => setScanModalOpen(false)} className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10"><X className="h-5 w-5" /></button>
          </div>

      {/* Live scan progress */}
      {scanProgress && scanProgress.status !== 'idle' && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              {scanProgress.status === 'completed' ? (
                <><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Tarama Tamamlandı</>
              ) : (
                <><span className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" /> {STEP_LABELS[scanProgress.currentStep ?? ''] ?? 'Taranıyor'}…</>
              )}
            </div>
            <span className="text-sm font-bold text-indigo-300">%{scanProgress.percent ?? 0}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-2 rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${scanProgress.percent ?? 0}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {['crawl', 'keywords', 'backlinks', 'geo', 'competitors'].map((step) => {
              const st = scanProgress.steps?.[step];
              const state = st?.status;
              const cls =
                state === 'done' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                : state === 'error' ? 'border-red-500/20 bg-red-500/5 text-red-400'
                : state === 'skipped' ? 'border-amber-500/20 bg-amber-500/5 text-amber-400'
                : scanProgress.currentStep === step ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                : 'border-white/10 bg-white/2 text-white/40';
              const label = state === 'done' ? '✓' : state === 'error' ? '✕' : state === 'skipped' ? '—' : scanProgress.currentStep === step ? '…' : '·';
              return (
                <div key={step} className={`rounded-xl border p-2 text-center text-xs ${cls}`}>
                  <div className="font-semibold">{STEP_LABELS[step]}</div>
                  <div className="mt-0.5">{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comprehensive scan result report — shown on completion (and persists as
          long as overview data exists, so it doubles as the latest-scan report). */}
      {(scanProgress?.status === 'completed' || (data && (data.pagesScanned ?? 0) > 0)) && (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/4 to-white/2 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Tarama Sonuç Raporu</h2>
          </div>

          {/* Top: health score visual + headline metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Site health gauge */}
            <div className="rounded-2xl border border-white/10 bg-white/2 p-5 flex flex-col items-center justify-center">
              <div className="relative h-24 w-24">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                  <path className="text-white/10" stroke="currentColor" strokeWidth="3" fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className={(data?.healthScore ?? 0) >= 70 ? 'text-emerald-400' : (data?.healthScore ?? 0) >= 40 ? 'text-orange-400' : 'text-red-400'}
                    stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"
                    strokeDasharray={`${data?.healthScore ?? 0}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{data?.healthScore ?? 0}</span>
                </div>
              </div>
              <p className="text-xs text-white/50 mt-2">Site Sağlık Skoru</p>
            </div>

            {/* Technical SEO */}
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">
              <div className="flex items-center gap-2 mb-3"><AlertCircle className="h-4 w-4 text-orange-400" /><span className="text-xs font-semibold text-white">Teknik SEO</span></div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/50">Taranan sayfa</span><span className="font-bold text-white">{data?.pagesScanned ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Bulunan sorun</span><span className="font-bold text-white">{data?.issuesFound ?? 0}</span></div>
              </div>
            </div>

            {/* Keywords */}
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
              <div className="flex items-center gap-2 mb-3"><Search className="h-4 w-4 text-indigo-400" /><span className="text-xs font-semibold text-white">Anahtar Kelime</span></div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/50">Sıralanan kelime</span><span className="font-bold text-white">{data?.rankedCount ?? scanProgress?.summary?.keywords ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Ort. pozisyon</span><span className="font-bold text-white">{data?.avgPosition?.toFixed(1) ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-white/50">İlk sayfada</span><span className="font-bold text-white">{data?.firstPageCount ?? 0}</span></div>
              </div>
            </div>

            {/* GEO + Backlink + Competitors */}
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
              <div className="flex items-center gap-2 mb-3"><Brain className="h-4 w-4 text-purple-400" /><span className="text-xs font-semibold text-white">GEO & Otorite</span></div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/50">AI görünürlük</span><span className="font-bold text-white">{data?.geoVisibilityScore ?? 0}%</span></div>
                <div className="flex justify-between"><span className="text-white/50">AI bahsedilme</span><span className="font-bold text-white">{data?.latestGeoSnapshot?.mentionCount ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Backlink</span><span className="font-bold text-white">{data?.backlinkCount ?? scanProgress?.summary?.backlinks ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Rakip</span><span className="font-bold text-white">{scanProgress?.summary?.competitors ?? 0}</span></div>
              </div>
            </div>
          </div>

          {/* Pages vs issues quick bar */}
          <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
            <h3 className="text-xs font-semibold text-white/60 mb-3">Sayfa / Sorun Dağılımı</h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={[{ name: 'Taranan Sayfa', v: data?.pagesScanned ?? 0 }, { name: 'Bulunan Sorun', v: data?.issuesFound ?? 0 }, { name: 'Backlink', v: data?.backlinkCount ?? 0 }, { name: 'Sıralanan Kelime', v: data?.rankedCount ?? 0 }]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="v" fill="#6366f1" radius={[0, 4, 4, 0]} name="Adet" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Action boxes — turn findings into next steps */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Önerilen Aksiyonlar</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(data?.backlinkCount ?? 0) < 10 && (
                <a href={`${base}/backlinks`} className="flex items-center justify-between rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 hover:bg-sky-500/10 transition-colors">
                  <div><p className="text-sm font-semibold text-white">Otoriteniz düşük — Backlink alın</p><p className="text-xs text-white/50 mt-0.5">Sadece {data?.backlinkCount ?? 0} backlink. Backlink Market&apos;ten kaliteli bağlantı edinin.</p></div>
                  <ArrowRight className="h-4 w-4 text-sky-400 flex-shrink-0" />
                </a>
              )}
              {(data?.issuesFound ?? 0) > 0 && (
                <a href={`${base}/crawl`} className="flex items-center justify-between rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 hover:bg-orange-500/10 transition-colors">
                  <div><p className="text-sm font-semibold text-white">{data?.issuesFound} teknik SEO sorunu — Düzeltin</p><p className="text-xs text-white/50 mt-0.5">Site sağlığınızı yükseltmek için sorunları giderin.</p></div>
                  <ArrowRight className="h-4 w-4 text-orange-400 flex-shrink-0" />
                </a>
              )}
              {(data?.geoVisibilityScore ?? 0) < 50 && (
                <a href={`${base}/content`} className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 hover:bg-purple-500/10 transition-colors">
                  <div><p className="text-sm font-semibold text-white">AI görünürlüğü zayıf — İçerik yazın</p><p className="text-xs text-white/50 mt-0.5">AI aramalarda görünmek için kapsamlı, soru-yanıt içerik üretin.</p></div>
                  <ArrowRight className="h-4 w-4 text-purple-400 flex-shrink-0" />
                </a>
              )}
              {(data?.rankedCount ?? 0) < 10 && (
                <a href={`${base}/keywords`} className="flex items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 hover:bg-indigo-500/10 transition-colors">
                  <div><p className="text-sm font-semibold text-white">Az kelimede sıralanıyorsunuz — Kelime ekleyin</p><p className="text-xs text-white/50 mt-0.5">Hedef anahtar kelimeleri ekleyip takibe alın.</p></div>
                  <ArrowRight className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                </a>
              )}
            </div>
          </div>

          {/* Download report */}
          <div className="flex justify-end">
            <button
              onClick={() => downloadReport(base.split('/').pop() || 'proje', data, scanProgress?.summary)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <Download className="h-4 w-4" /> Raporu İndir (HTML)
            </button>
          </div>
        </div>
      )}
        </div>
      </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('avgPos')} value={data?.avgPosition?.toFixed(1) ?? '—'} hint={`${data?.rankedCount ?? 0} kelime sıralanıyor`} icon={Search} color="indigo" />
        <StatCard label={t('geoVisibility')} value={`${data?.geoVisibilityScore ?? 0}%`} hint={`${data?.latestGeoSnapshot?.mentionCount ?? 0} AI bahsedilme`} icon={Brain} color="purple" />
        <StatCard label={t('firstPage')} value={data?.firstPageCount ?? 0} hint={`${data?.top3Count ?? 0} kelime ilk 3'te`} icon={TrendingUp} color="emerald" />
        <StatCard label={t('siteHealth')} value={data?.healthScore ?? 0} hint={`${data?.pagesScanned ?? 0} sayfa · ${data?.issuesFound ?? 0} sorun`} icon={AlertCircle} color="orange" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Backlink" value={data?.backlinkCount ?? 0} icon={Link2} color="sky" />
        <StatCard label="Takip Edilen Kelime" value={data?.keywordCount ?? 0} icon={Search} color="indigo" />
        <StatCard label="Son Tarama" value={lastCrawlDate ? formatDate(lastCrawlDate) : '—'} icon={Clock} color="emerald" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
          <h2 className="text-sm font-semibold text-white mb-1">{t('rankTrend')}</h2>
          <p className="text-[11px] text-white/35 mb-4">Ortalama Google sıralamanız (düşük = daha iyi)</p>
          {rankTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={rankTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                <YAxis reversed domain={[1, 'dataMax']} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: 12 }} />
                <Line type="monotone" dataKey="avgPosition" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} name="Ort. Pozisyon" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/30 text-sm">İlk tarama sonrası dolacak</div>
          )}
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
          <h2 className="text-sm font-semibold text-white mb-1">{t('geoTrend')}</h2>
          <p className="text-[11px] text-white/35 mb-4">AI aramada bahsedilme ve kaynak gösterilme</p>
          {geoTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={geoTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '8px', color: '#fff', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="mentions" fill="#a855f7" radius={[4, 4, 0, 0]} name="Bahsedilme" />
                <Bar dataKey="citations" fill="#22d3ee" radius={[4, 4, 0, 0]} name="Kaynak Gösterilme" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/30 text-sm">{t('addGeoPrompt')}</div>
          )}
        </div>
      </div>

      {/* Ranked keywords */}
      <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">Google&apos;da Sıralanan Kelimeler</h2>
        </div>
        <p className="text-[11px] text-white/35 mb-4">Domaininizin Google&apos;da göründüğü anahtar kelimeler ve pozisyonları</p>
        {ranked.length === 0 ? (
          <p className="text-sm text-white/30 py-4">Henüz veri yok — Anahtar Kelimeler sayfasından &quot;Sıralanan Kelimeleri Getir&quot; ile çekebilirsiniz.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-white/40 border-b border-white/10">
                  <th className="py-2 pr-4 font-medium">Anahtar Kelime</th>
                  <th className="py-2 pr-4 font-medium text-center">Pozisyon</th>
                  <th className="py-2 pr-4 font-medium text-right">Aylık Hacim</th>
                  <th className="py-2 font-medium">URL</th>
                </tr>
              </thead>
              <tbody>
                {ranked.slice(0, 25).map((k, i) => {
                  const pos = k.position ?? null;
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                      <td className="py-2 pr-4 text-white/80">{k.keyword ?? k.phrase}</td>
                      <td className="py-2 pr-4 text-center">
                        <span className={`inline-block min-w-[2rem] rounded-md px-2 py-0.5 text-xs font-semibold ${
                          pos != null && pos <= 3 ? 'bg-emerald-500/15 text-emerald-400'
                          : pos != null && pos <= 10 ? 'bg-indigo-500/15 text-indigo-400'
                          : 'bg-white/5 text-white/50'
                        }`}>{pos ?? '—'}</span>
                      </td>
                      <td className="py-2 pr-4 text-right text-white/60">{k.searchVolume?.toLocaleString('tr-TR') ?? '—'}</td>
                      <td className="py-2 text-white/40 truncate max-w-[280px]">{k.url ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom row: activities + todos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">{t('recentActivity')}</h2>
          {activities.length === 0 ? (
            <p className="text-sm text-white/30">{t('noActivity')}</p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 8).map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <Clock className="h-3.5 w-3.5 text-white/30 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white/70">{a.message}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{formatDate(a.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">{t('todos')}</h2>
          {todos.length === 0 ? (
            <p className="text-sm text-white/30">{t('noPending')}</p>
          ) : (
            <div className="space-y-2.5">
              {todos.slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                    item.priority === 'HIGH' ? 'bg-red-500' : item.priority === 'MEDIUM' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`} />
                  <p className="text-xs text-white/80">{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
