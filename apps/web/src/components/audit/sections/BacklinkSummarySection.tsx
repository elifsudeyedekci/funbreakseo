'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { backlinkApi } from '@/lib/api';
import { GaugeHalfCircle } from '../GaugeHalfCircle';
import { DonutChart } from '../DonutChart';
import { InfoTooltip } from '../InfoTooltip';

export interface BacklinkSummarySectionProps {
  projectId: string;
}

interface Gauges {
  domainStrength: number;
  pageStrength: number;
  counters: {
    total: number;
    referringDomains: number;
    dofollow: number;
    nofollow: number;
    edu: number;
    gov: number;
    ipCount: number;
    subnetCount: number;
  };
}

interface TopBacklinkItem {
  domainRating: number;
  sourceUrl: string;
  sourceTitle: string;
  anchorText: string;
  isDofollow: boolean;
  sourceDomain: string;
}

interface TopPageItem {
  url: string;
  backlinkCount: number;
}

interface AnchorItem {
  anchor: string;
  count: number;
}

interface GeographyResponse {
  byTld: { tld: string; count: number }[];
  byCountry: { country: string; count: number }[];
}

interface ToxicRow {
  id: string;
  sourceDomain: string;
  domainRating: number | null;
  toxicScore: number | null;
}

interface VelocityPoint {
  date: string;
  totalBacklinks: number;
  newBacklinks: number;
  lostBacklinks: number;
}

const CHART_TOOLTIP_STYLE = {
  background: '#111118',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: 12,
};

function drColor(dr: number | null | undefined): string {
  if (dr == null) return 'text-white/30';
  if (dr >= 70) return 'text-emerald-400';
  if (dr >= 50) return 'text-green-400';
  if (dr >= 30) return 'text-yellow-400';
  return 'text-red-400';
}

export function BacklinkSummarySection({ projectId }: BacklinkSummarySectionProps) {
  const { data: gauges, isLoading } = useQuery({
    queryKey: ['backlink-gauges', projectId],
    queryFn: () => backlinkApi.gauges(projectId).then((r) => r.data as Gauges),
    staleTime: 5 * 60_000,
  });
  const { data: topBacklinks } = useQuery({
    queryKey: ['backlink-top', projectId],
    queryFn: () => backlinkApi.top(projectId, 10).then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? []) as TopBacklinkItem[]),
    staleTime: 5 * 60_000,
  });
  const { data: topPages } = useQuery({
    queryKey: ['backlink-top-pages', projectId],
    queryFn: () => backlinkApi.topPages(projectId).then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? []) as TopPageItem[]),
    staleTime: 5 * 60_000,
  });
  const { data: anchors } = useQuery({
    queryKey: ['backlink-anchors', projectId],
    queryFn: () => backlinkApi.anchors(projectId).then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? []) as AnchorItem[]),
    staleTime: 5 * 60_000,
  });
  const { data: geography } = useQuery({
    queryKey: ['backlink-geography', projectId],
    queryFn: () => backlinkApi.geography(projectId).then((r) => r.data as GeographyResponse),
    staleTime: 5 * 60_000,
  });
  const { data: toxic } = useQuery({
    queryKey: ['backlink-toxic', projectId],
    queryFn: () => backlinkApi.toxic(projectId).then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? []) as ToxicRow[]),
    staleTime: 5 * 60_000,
  });
  const { data: velocity } = useQuery({
    queryKey: ['backlink-velocity', projectId],
    queryFn: () => backlinkApi.velocity(projectId).then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? []) as VelocityPoint[]),
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return <div className="h-32 rounded-2xl border border-white/10 bg-white/2 animate-pulse" />;
  }

  if (!gauges || gauges.counters.total === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/2 p-6 text-center text-white/40 text-sm space-y-3">
        <p>Henüz backlink verisi senkronize edilmedi.</p>
        <Link href="backlinks" className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs">
          Backlink sayfasına git <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const c = gauges.counters;
  const tldDonut = (geography?.byTld ?? []).map((t) => ({ label: `.${t.tld}`, value: t.count }));
  const countryDonut = (geography?.byCountry ?? []).map((g) => ({ label: g.country, value: g.count }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-6">
        <GaugeHalfCircle value={gauges.domainStrength} label="Domain Strength" thresholds={{ good: 60, warn: 30 }} />
        <GaugeHalfCircle value={gauges.pageStrength} label="Page Strength" thresholds={{ good: 60, warn: 30 }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Backlink', value: c.total },
          { label: 'Yönlendiren Alan', value: c.referringDomains },
          { label: 'Dofollow', value: c.dofollow },
          { label: 'Nofollow', value: c.nofollow },
          { label: '.edu', value: c.edu },
          { label: '.gov', value: c.gov },
          { label: 'IP Sayısı', value: c.ipCount },
          { label: 'Alt Ağ (Subnet)', value: c.subnetCount },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/2 p-3 text-center">
            <div className="text-xl font-bold text-white">{s.value}</div>
            <div className="text-[11px] text-white/40 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {topBacklinks && topBacklinks.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-white/60 mb-2">En Değerli Backlinkler</h4>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs">
              <tbody>
                {topBacklinks.map((b, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className={`p-2.5 font-bold w-12 ${drColor(b.domainRating)}`}>{b.domainRating}</td>
                    <td className="p-2.5 text-white/70 truncate max-w-xs">{b.sourceDomain}</td>
                    <td className="p-2.5 text-white/40 truncate max-w-xs hidden sm:table-cell">{b.anchorText || '—'}</td>
                    <td className="p-2.5 text-right">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${b.isDofollow ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'}`}>
                        {b.isDofollow ? 'dofollow' : 'nofollow'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {topPages && topPages.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-white/60 mb-2">En Çok Bağlantı Alan Sayfalar</h4>
            <div className="space-y-1.5">
              {topPages.slice(0, 8).map((p) => (
                <div key={p.url} className="flex items-center justify-between text-xs gap-2">
                  <span className="text-white/60 truncate">{p.url}</span>
                  <span className="text-white/80 font-semibold flex-shrink-0">{p.backlinkCount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {anchors && anchors.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-white/60 mb-2">En Sık Kullanılan Anchor Metinleri</h4>
            <div className="space-y-1.5">
              {anchors.slice(0, 8).map((a) => (
                <div key={a.anchor} className="flex items-center justify-between text-xs gap-2">
                  <span className="text-white/60 truncate">{a.anchor || '(boş)'}</span>
                  <span className="text-white/80 font-semibold flex-shrink-0">{a.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {(tldDonut.length > 0 || countryDonut.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {tldDonut.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white/60 mb-2">TLD Dağılımı</h4>
              <DonutChart data={tldDonut} size="sm" />
            </div>
          )}
          {countryDonut.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white/60 mb-2">Ülke Dağılımı</h4>
              <DonutChart data={countryDonut} size="sm" />
            </div>
          )}
        </div>
      )}

      {toxic && toxic.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
            <h4 className="text-xs font-semibold text-red-400">Toksik Backlinkler ({toxic.length})</h4>
            <InfoTooltip text="Spam puanı yüksek backlinkler sitenizin sıralamasına zarar verebilir. Disavow (reddet) aracıyla değerlendirin." />
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {toxic.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs">
                <span className="text-white/70 truncate">{t.sourceDomain}</span>
                <span className="text-red-400 flex-shrink-0">Toksik Skor: {t.toxicScore ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {velocity && velocity.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-white/60 mb-2">Backlink Hızı (Link Velocity)</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={velocity}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="totalBacklinks" stroke="#3987e5" strokeWidth={2} dot={false} name="Toplam" />
              <Line type="monotone" dataKey="newBacklinks" stroke="#0ca30c" strokeWidth={2} dot={false} name="Yeni" />
              <Line type="monotone" dataKey="lostBacklinks" stroke="#d03b3b" strokeWidth={2} dot={false} name="Kaybedilen" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <Link href="backlinks" className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs">
        Tüm backlinkleri ve sipariş geçmişini görüntüle <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

export default BacklinkSummarySection;
