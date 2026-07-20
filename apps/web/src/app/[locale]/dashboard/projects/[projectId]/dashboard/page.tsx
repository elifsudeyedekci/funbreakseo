'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Search, Brain, AlertCircle, Clock, Zap, Globe, Link2, FileBarChart } from 'lucide-react';
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

interface ScanHistoryItem {
  id: string;
  createdAt: string;
  healthScore: number;
  pagesScanned: number;
  issuesFound: number;
  keywordCount: number;
  rankedCount: number;
  firstPageCount: number;
  avgPosition: number | null;
  backlinkCount: number;
  referringDomains: number;
  geoVisibilityScore: number;
  geoMentions: number;
  geoCitations: number;
  competitorCount: number;
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

export default function ProjectDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const locale = useLocale();
  const t = useTranslations('projectDashboard');
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const base = `/${locale}/dashboard/projects/${projectId}`;

  // Kicking off a full scan sends the user straight to the (already
  // comprehensive) audit report page instead of duplicating its content in a
  // modal here — the audit page's own "isRunning" state picks up the crawl
  // that's now in flight and shows live progress there.
  const fullScanMutation = useMutation({
    mutationFn: () => projectApi.fullScan(projectId).then((r) => r.data),
    onSuccess: () => {
      setScanning(true);
      router.push(`${base}/audit`);
    },
  });

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

  // Scan history archive — point-in-time counters only (no full
  // SiteAuditReport), shown as a read-only table; the audit page is the
  // canonical place for the current, fully-detailed report.
  const { data: scanHistory = [] } = useQuery<ScanHistoryItem[]>({
    queryKey: ['scan-history', projectId],
    queryFn: () => projectApi.scanHistory(projectId).then((r) => (Array.isArray(r.data) ? r.data : (r.data?.data ?? [])) as ScanHistoryItem[]).catch(() => []),
    // refresh after a scan completes
    refetchInterval: scanProgress?.status === 'completed' ? false : undefined,
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
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Tam Tarama</h3>
            <p className="text-xs text-white/40 mt-0.5">Teknik SEO + Anahtar Kelime + Backlink + GEO + Rakip — tek seferde hepsini çalıştır, sonuç doğrudan denetim raporunda açılır</p>
          </div>
          <div className="flex items-center gap-2">
            {(data && (data.pagesScanned ?? 0) > 0) && (
              <a
                href={`${base}/audit`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 transition-all"
              >
                <FileBarChart className="h-4 w-4" /> Son Raporu Gör
              </a>
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

        {/* Slim inline progress strip — shown only if a scan is actively
            running while the user is still on this page (e.g. they came
            back after starting one elsewhere). The audit page is the
            primary place to watch progress; this is just a status echo. */}
        {scanProgress && scanProgress.status === 'running' && (
          <div className="pt-3 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-indigo-300 font-medium">{STEP_LABELS[scanProgress.currentStep ?? ''] ?? 'Taranıyor'}…</span>
              <span className="text-white/40">%{scanProgress.percent ?? 0}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${scanProgress.percent ?? 0}%` }} />
            </div>
          </div>
        )}
      </div>


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

      {/* Scan history archive */}
      {scanHistory.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
          <div className="flex items-center gap-2 mb-1">
            <FileBarChart className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Tarama Geçmişi</h2>
          </div>
          <p className="text-[11px] text-white/35 mb-4">Geçmiş taramalarınızın arşivlenmiş özeti — güncel, tam detaylı rapor için &quot;Son Raporu Gör&quot;ü kullanın</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-white/40 border-b border-white/10">
                  <th className="py-2 pr-4 font-medium">Tarih</th>
                  <th className="py-2 pr-4 font-medium text-center">Sağlık</th>
                  <th className="py-2 pr-4 font-medium text-center">Sorun</th>
                  <th className="py-2 pr-4 font-medium text-center">Kelime</th>
                  <th className="py-2 pr-4 font-medium text-center">Ort. Poz.</th>
                  <th className="py-2 pr-4 font-medium text-center">Backlink</th>
                  <th className="py-2 pr-4 font-medium text-center">GEO</th>
                  <th className="py-2 pr-4 font-medium text-center">Rakip</th>
                </tr>
              </thead>
              <tbody>
                {scanHistory.map((s) => (
                  <tr key={s.id} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-white/80">{new Date(s.createdAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td className="py-2 pr-4 text-center"><span className={s.healthScore >= 70 ? 'text-emerald-400' : s.healthScore >= 40 ? 'text-yellow-400' : 'text-red-400'}>{s.healthScore}</span></td>
                    <td className="py-2 pr-4 text-center text-white/60">{s.issuesFound}</td>
                    <td className="py-2 pr-4 text-center text-white/60">{s.rankedCount}</td>
                    <td className="py-2 pr-4 text-center text-white/60">{s.avgPosition?.toFixed(1) ?? '—'}</td>
                    <td className="py-2 pr-4 text-center text-white/60">{s.backlinkCount}</td>
                    <td className="py-2 pr-4 text-center text-white/60">{s.geoVisibilityScore}%</td>
                    <td className="py-2 pr-4 text-center text-white/60">{s.competitorCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
