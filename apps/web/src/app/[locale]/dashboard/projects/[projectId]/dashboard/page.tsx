'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { TrendingUp, TrendingDown, Search, Brain, AlertCircle, Clock, Zap, CheckCircle2 } from 'lucide-react';
import { projectApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { DashboardSummary } from '@funbreakseo/shared';

interface DashboardData {
  summary: DashboardSummary;
  rankTrend: Array<{ date: string; avgPosition: number; geoScore: number }>;
  recentActivity: Array<{ id: string; type: string; message: string; createdAt: string }>;
  todoItems: Array<{ id: string; category: string; severity: string; message: string }>;
}

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  color = 'indigo',
}: {
  label: string;
  value: string | number;
  delta?: number;
  icon: React.ElementType;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500/20 text-indigo-400',
    purple: 'bg-purple-500/20 text-purple-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    orange: 'bg-orange-500/20 text-orange-400',
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
        {delta !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium mb-1 ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProjectDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslations('projectDashboard');
  const [scanResult, setScanResult] = useState<null | { steps: Record<string, unknown> }>(null);

  const fullScanMutation = useMutation({
    mutationFn: () => projectApi.fullScan(projectId).then((r) => r.data),
    onSuccess: (data) => setScanResult(data),
  });
  const { data, isLoading } = useQuery({
    queryKey: ['project-dashboard', projectId],
    queryFn: () =>
      projectApi.dashboard(projectId).then((r) => {
        const raw = r.data;
        if (!raw) return null;
        return {
          summary: {
            healthScore: raw.healthScore ?? 0,
            geoVisibilityScore: raw.geoVisibilityScore ?? 0,
            keywordsCount: raw.keywordCount ?? 0,
            firstPageKeywords: 0,
            lastCrawlDate: raw.lastCrawl?.createdAt ?? null,
            backlinkCount: 0,
            activeOutreach: 0,
            avgPosition: raw.avgPosition ?? null,
          },
          rankTrend: [],
          recentActivity: [],
          todoItems: [],
        } as DashboardData;
      }),
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

  const summary = data?.summary;
  const trend: Array<{ date: string; avgPosition: number; geoScore: number }> = data?.rankTrend || [];
  const activities: Array<{ id: string; type: string; message: string; createdAt: string }> = data?.recentActivity || [];
  const todos: Array<{ id: string; category: string; severity: string; message: string }> = data?.todoItems || [];

  return (
    <div className="p-6 space-y-6">
      {/* Full Scan Banner */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Tam Tarama</h3>
          <p className="text-xs text-white/40 mt-0.5">Teknik SEO + Backlink + Rakip + GEO — tek seferde hepsini çalıştır</p>
        </div>
        <button
          onClick={() => fullScanMutation.mutate()}
          disabled={fullScanMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
        >
          {fullScanMutation.isPending ? (
            <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Taranıyor…</>
          ) : (
            <><Zap className="h-4 w-4" /> Tam Tarama Başlat</>
          )}
        </button>
      </div>

      {/* Scan result summary */}
      {scanResult && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Tarama Başlatıldı
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {Object.entries(scanResult.steps ?? {}).map(([step, val]: [string, unknown]) => {
              const v = val as Record<string, unknown>;
              const ok = !v?.error;
              return (
                <div key={step} className={`rounded-xl border p-2 text-center text-xs ${ok ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-red-500/20 bg-red-500/5 text-red-400'}`}>
                  <div className="font-semibold capitalize">{step}</div>
                  <div className="text-white/40 mt-0.5">{ok ? (v?.jobId ? 'Sırada' : 'Hazır') : 'Hata'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('avgPos')} value={summary?.avgPosition?.toFixed(1) ?? '—'} icon={Search} color="indigo" />
        <StatCard label={t('geoVisibility')} value={`${summary?.geoVisibilityScore ?? 0}%`} icon={Brain} color="purple" />
        <StatCard label={t('firstPage')} value={summary?.firstPageKeywords ?? 0} icon={TrendingUp} color="emerald" />
        <StatCard label={t('siteHealth')} value={summary?.healthScore ?? 0} icon={AlertCircle} color="orange" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">{t('rankTrend')}</h2>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis reversed tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: 12 }} />
                <Line type="monotone" dataKey="avgPosition" stroke="#6366f1" strokeWidth={2} dot={false} name={t('avgPosition')} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/30 text-sm">{t('noData')}</div>
          )}
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">{t('geoTrend')}</h2>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '8px', color: '#fff', fontSize: 12 }} />
                <Bar dataKey="geoScore" fill="#a855f7" radius={[4, 4, 0, 0]} name={t('geoScore')} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/30 text-sm">{t('addGeoPrompt')}</div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">{t('recentActivity')}</h2>
          {activities.length === 0 ? (
            <p className="text-sm text-white/30">{t('noActivity')}</p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-start gap-3 text-sm">
                  <Clock className="h-3.5 w-3.5 text-white/30 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white/70">{a.message}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{formatDate(a.createdAt)}</p>
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
              {todos.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                  <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                    item.severity === 'CRITICAL' ? 'bg-red-500' : item.severity === 'WARNING' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="text-xs text-white/80">{item.message}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{item.category}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
