'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { reportsApi } from '@/lib/api';
import { DonutChart } from '../DonutChart';

export interface AnalyticsSectionProps {
  projectId: string;
}

interface Ga4Totals {
  users: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDurationSec: number;
}

interface GscTotals {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Ga4Data {
  connected: boolean;
  current: Ga4Totals;
  previous: Ga4Totals;
  channels: Array<{ channel: string; sessions: number; users: number }>;
  daily: Array<{ date: string; sessions: number; users: number; newUsers: number; pageViews: number }>;
  devices: Array<{ device: string; sessions: number }>;
  countries: Array<{ country: string; sessions: number }>;
}

interface GscData {
  connected: boolean;
  current: GscTotals;
  previous: GscTotals;
  daily: Array<{ date: string; clicks: number; impressions: number }>;
  dailyPrevious: Array<{ date: string; clicks: number; impressions: number }>;
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  topPages: Array<{ page: string; clicks: number; impressions: number }>;
  devices: Array<{ device: string; clicks: number }>;
  countries: Array<{ country: string; clicks: number }>;
}

interface AnalyticsResponse {
  ga4: Ga4Data | null;
  gsc: GscData | null;
}

const CHART_TOOLTIP_STYLE = {
  background: '#111118',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: 12,
};

function posColor(position: number): string {
  if (position <= 3) return 'text-emerald-400';
  if (position <= 10) return 'text-green-400';
  if (position <= 20) return 'text-yellow-400';
  return 'text-red-400';
}

function fmt(n: number): string {
  return new Intl.NumberFormat('tr-TR').format(Math.round(n));
}

function delta(current: number, previous: number): { label: string; cls: string } {
  if (!previous) return { label: '', cls: 'text-white/30' };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return { label: '~%0', cls: 'text-white/30' };
  return { label: `${pct > 0 ? '▲' : '▼'} %${Math.abs(pct).toFixed(1)}`, cls: pct > 0 ? 'text-emerald-400' : 'text-red-400' };
}

function Kpi({ label, value, current, previous, invert }: { label: string; value: string; current: number; previous: number; invert?: boolean }) {
  const d = delta(current, previous);
  const cls = invert ? (d.cls === 'text-emerald-400' ? 'text-red-400' : d.cls === 'text-red-400' ? 'text-emerald-400' : d.cls) : d.cls;
  return (
    <div className="rounded-xl border border-white/10 bg-white/2 p-3 text-center">
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-[11px] text-white/40 mt-0.5">{label}</div>
      {d.label && <div className={`text-[10px] mt-1 font-semibold ${cls}`}>{d.label}</div>}
    </div>
  );
}

export function AnalyticsSection({ projectId }: AnalyticsSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-data', projectId],
    queryFn: () => reportsApi.analyticsData(projectId).then((r) => r.data as AnalyticsResponse),
    enabled: !!projectId,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return <div className="h-32 rounded-2xl border border-white/10 bg-white/2 animate-pulse" />;
  }

  const ga4 = data?.ga4;
  const gsc = data?.gsc;

  if (!ga4?.connected && !gsc?.connected) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/2 p-6 text-center text-white/40 text-sm space-y-3">
        <p>Google Analytics ve Search Console henüz bağlanmadı.</p>
        <Link href="../../integrations" className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs">
          Entegrasyonlar sayfasına git <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const channelDonut = (ga4?.channels ?? []).slice(0, 6).map((c) => ({ label: c.channel, value: c.sessions }));
  const deviceDonutGa4 = (ga4?.devices ?? []).map((d) => ({ label: d.device, value: d.sessions }));

  const gscCombined = (gsc?.daily ?? []).map((row, i) => ({
    date: row.date,
    clicks: row.clicks,
    impressions: row.impressions,
    clicksPrev: gsc?.dailyPrevious?.[i]?.clicks ?? null,
    impressionsPrev: gsc?.dailyPrevious?.[i]?.impressions ?? null,
  }));

  return (
    <div className="space-y-8">
      {ga4?.connected && (
        <div className="space-y-5">
          <h4 className="text-xs font-semibold text-white/60">Google Analytics (GA4)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Kullanıcı" value={fmt(ga4.current.users)} current={ga4.current.users} previous={ga4.previous.users} />
            <Kpi label="Oturum" value={fmt(ga4.current.sessions)} current={ga4.current.sessions} previous={ga4.previous.sessions} />
            <Kpi label="Görüntüleme" value={fmt(ga4.current.pageViews)} current={ga4.current.pageViews} previous={ga4.previous.pageViews} />
            <Kpi label="Hemen Çıkma" value={`%${ga4.current.bounceRate.toFixed(1)}`} current={ga4.current.bounceRate} previous={ga4.previous.bounceRate} invert />
          </div>

          {ga4.daily.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-white/60 mb-2">Günlük Görüntüleme Trendi</h5>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={ga4.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="pageViews" stroke="#3987e5" strokeWidth={2} dot={false} name="Görüntüleme" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {ga4.daily.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-white/60 mb-2">Kullanıcı vs Yeni Kullanıcı</h5>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={ga4.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="users" stroke="#3987e5" strokeWidth={2} dot={false} name="Toplam Kullanıcı" />
                  <Line type="monotone" dataKey="newUsers" stroke="#0ca30c" strokeWidth={2} dot={false} name="Yeni Kullanıcı" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {channelDonut.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-white/60 mb-2">Trafik Kaynağı Dağılımı</h5>
                <DonutChart data={channelDonut} size="sm" />
              </div>
            )}
            {deviceDonutGa4.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-white/60 mb-2">Cihaz Dağılımı</h5>
                <DonutChart data={deviceDonutGa4} size="sm" />
              </div>
            )}
          </div>

          {ga4.countries.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-white/60 mb-2">Ülkeye Göre Oturum</h5>
              <ResponsiveContainer width="100%" height={Math.max(120, ga4.countries.slice(0, 8).length * 26)}>
                <BarChart data={ga4.countries.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="country" width={48} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} tickFormatter={(v) => String(v).toUpperCase()} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="sessions" fill="#3987e5" radius={[0, 4, 4, 0]} name="Oturum" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {ga4.channels.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-white/60 mb-2">Trafik Kaynakları — Detay</h5>
              <p className="text-[11px] text-white/30 mb-2">
                "AI Assistant" satırı ChatGPT/Perplexity gibi AI araçlarından gelen trafiği gösterir.
              </p>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-xs">
                  <tbody>
                    {ga4.channels.map((ch, i) => (
                      <tr key={i} className={`border-b border-white/5 last:border-0 ${ch.channel.startsWith('AI Assistant') ? 'bg-indigo-500/10' : ''}`}>
                        <td className="p-2.5 text-white/70 truncate max-w-xs">{ch.channel}</td>
                        <td className="p-2.5 text-right text-white/80 font-semibold">{fmt(ch.sessions)}</td>
                        <td className="p-2.5 text-right text-white/40">{fmt(ch.users)} kullanıcı</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {gsc?.connected && (
        <div className="space-y-5 pt-6 border-t border-white/5">
          <h4 className="text-xs font-semibold text-white/60">Google Search Console</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Tıklama" value={fmt(gsc.current.clicks)} current={gsc.current.clicks} previous={gsc.previous.clicks} />
            <Kpi label="Gösterim" value={fmt(gsc.current.impressions)} current={gsc.current.impressions} previous={gsc.previous.impressions} />
            <Kpi label="CTR" value={`%${gsc.current.ctr.toFixed(1)}`} current={gsc.current.ctr} previous={gsc.previous.ctr} />
            <Kpi label="Ort. Pozisyon" value={gsc.current.position.toFixed(1)} current={gsc.previous.position} previous={gsc.current.position} />
          </div>

          {gscCombined.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-white/60 mb-2">Tıklama — Bu Ay vs Önceki Ay</h5>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={gscCombined}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="clicks" stroke="#3987e5" strokeWidth={2} dot={false} name="Bu Ay" />
                  <Line type="monotone" dataKey="clicksPrev" stroke="#94a3b8" strokeWidth={2} dot={false} name="Önceki Ay" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {gscCombined.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-white/60 mb-2">Gösterim — Bu Ay vs Önceki Ay</h5>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={gscCombined}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="impressions" stroke="#7c3aed" strokeWidth={2} dot={false} name="Bu Ay" />
                  <Line type="monotone" dataKey="impressionsPrev" stroke="#94a3b8" strokeWidth={2} dot={false} name="Önceki Ay" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {gsc.devices.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-white/60 mb-2">Cihaz Dağılımı</h5>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={gsc.devices.slice(0, 5)} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="device" width={64} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="clicks" fill="#3987e5" radius={[0, 4, 4, 0]} name="Tıklama" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {gsc.countries.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-white/60 mb-2">Ülke Dağılımı</h5>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={gsc.countries.slice(0, 6)} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="country" width={48} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} tickFormatter={(v) => String(v).toUpperCase()} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="clicks" fill="#7c3aed" radius={[0, 4, 4, 0]} name="Tıklama" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {gsc.topQueries.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-white/60 mb-2">En İyi Sorgular</h5>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40">
                      <th className="p-2.5 text-left font-medium">Sorgu</th>
                      <th className="p-2.5 text-right font-medium">Tıklama</th>
                      <th className="p-2.5 text-right font-medium">Gösterim</th>
                      <th className="p-2.5 text-right font-medium">CTR</th>
                      <th className="p-2.5 text-right font-medium">Pozisyon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gsc.topQueries.slice(0, 15).map((q, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        <td className="p-2.5 text-white/70 truncate max-w-xs">{q.query}</td>
                        <td className="p-2.5 text-right text-white/80">{fmt(q.clicks)}</td>
                        <td className="p-2.5 text-right text-white/50">{fmt(q.impressions)}</td>
                        <td className="p-2.5 text-right text-white/50">%{q.ctr.toFixed(1)}</td>
                        <td className={`p-2.5 text-right font-bold ${posColor(q.position)}`}>{q.position.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {gsc.topPages.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-white/60 mb-2">En Çok Tıklanan Sayfalar</h5>
              <div className="space-y-1.5">
                {gsc.topPages.slice(0, 8).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-white/60 truncate">{p.page.replace(/^https?:\/\/[^/]+/, '') || '/'}</span>
                    <span className="text-white/80 font-semibold flex-shrink-0">{fmt(p.clicks)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AnalyticsSection;
