'use client';

import { useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { outreachApi, backlinkApi } from '@/lib/api';
import { GaugeHalfCircle, DonutChart, InfoTooltip } from '@/components/audit';

type Tab = 'profile' | 'market' | 'orders';

/** Always-open section — no "Detayları Göster" click required. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/2 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

interface GaugesResponse {
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

interface LinkSplitResponse {
  internalLinks: number | null;
  externalDofollow: number | null;
  externalNofollow: number | null;
  note?: string;
}

interface ToxicBacklinkItem {
  id?: string;
  sourceDomain?: string;
  sourceUrl?: string;
  anchorText?: string;
  toxicScore: number;
  domainRating: number;
  disavowRecommended: true;
}

interface VelocityPoint {
  date: string;
  totalBacklinks: number;
  referringDomains: number;
  newBacklinks: number;
  lostBacklinks: number;
}

function drColorClass(dr: number | null | undefined): string {
  if (dr == null) return 'text-white/30';
  if (dr >= 70) return 'text-emerald-400';
  if (dr >= 50) return 'text-green-400';
  if (dr >= 30) return 'text-yellow-400';
  return 'text-red-400';
}

const CHART_TOOLTIP_STYLE = {
  background: '#111118',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: 12,
};

export default function BacklinksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslations('backlinksPage');
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>('profile');

  const queryClient = useQueryClient();
  const [blFilter, setBlFilter] = useState<'all' | 'dofollow' | 'nofollow'>('all');
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);

  const { data: backlinkData, isLoading } = useQuery({
    queryKey: ['backlinks', projectId],
    queryFn: () => outreachApi.backlinks(projectId).then((r) => {
      const d = r.data;
      if (Array.isArray(d)) return { summary: null, items: d };
      return { summary: d?.summary ?? null, items: d?.items ?? d?.data ?? [] };
    }),
    enabled: tab === 'profile',
  });
  const backlinks = backlinkData?.items as Array<{ id: string; sourceDomain: string; targetUrl: string; domainRating: number; anchorText: string; isDofollow: boolean; status: string }> | undefined;
  const summary = backlinkData?.summary as { total: number; referringDomains: number; dofollow: number; avgDR: number } | null | undefined;

  const { data: gauges, isLoading: gaugesLoading } = useQuery({
    queryKey: ['backlink-gauges', projectId],
    queryFn: () => backlinkApi.gauges(projectId).then((r) => r.data as GaugesResponse),
    enabled: tab === 'profile',
  });

  const { data: topBacklinks } = useQuery({
    queryKey: ['backlink-top', projectId],
    queryFn: () => backlinkApi.top(projectId, 15).then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? []) as TopBacklinkItem[]),
    enabled: tab === 'profile',
  });

  const { data: topPages } = useQuery({
    queryKey: ['backlink-top-pages', projectId],
    queryFn: () => backlinkApi.topPages(projectId).then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? []) as TopPageItem[]),
    enabled: tab === 'profile',
  });

  const { data: anchors } = useQuery({
    queryKey: ['backlink-anchors', projectId],
    queryFn: () => backlinkApi.anchors(projectId).then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? []) as AnchorItem[]),
    enabled: tab === 'profile',
  });

  const { data: geography } = useQuery({
    queryKey: ['backlink-geography', projectId],
    queryFn: () => backlinkApi.geography(projectId).then((r) => r.data as GeographyResponse),
    enabled: tab === 'profile',
  });

  const { data: linkSplit } = useQuery({
    queryKey: ['backlink-link-split', projectId],
    queryFn: () => backlinkApi.linkSplit(projectId).then((r) => r.data as LinkSplitResponse),
    enabled: tab === 'profile',
  });

  const { data: toxic } = useQuery({
    queryKey: ['backlink-toxic', projectId],
    queryFn: () => backlinkApi.toxic(projectId).then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? []) as ToxicBacklinkItem[]),
    enabled: tab === 'profile',
  });

  const { data: velocity } = useQuery({
    queryKey: ['backlink-velocity', projectId],
    queryFn: () => backlinkApi.velocity(projectId).then((r) => (Array.isArray(r.data) ? r.data : r.data?.data ?? []) as VelocityPoint[]),
    enabled: tab === 'profile',
  });

  const syncMutation = useMutation({
    mutationFn: () => outreachApi.syncBacklinks(projectId).then(r => r.data),
    onSuccess: () => {
      setSyncErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['backlinks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlink-gauges', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlink-top', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlink-top-pages', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlink-anchors', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlink-geography', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlink-link-split', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlink-toxic', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlink-velocity', projectId] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '';
      setSyncErrorMsg(msg.startsWith('LIMIT_REACHED') ? t('syncLimitReached') : t('syncError'));
    },
  });

  const { data: market, isLoading: marketLoading } = useQuery({
    queryKey: ['backlink-market', projectId],
    queryFn: () => outreachApi.marketListings().then((r) => r.data?.items ?? r.data?.data ?? []),
    enabled: tab === 'market',
  });

  const { data: orders } = useQuery({
    queryKey: ['backlink-orders', projectId],
    queryFn: () => outreachApi.orders(projectId).then((r) => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
    enabled: tab === 'orders',
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: t('tabProfile') },
    { id: 'market', label: t('tabMarket') },
    { id: 'orders', label: t('tabOrders') },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
      <div className="flex gap-1 border-b border-white/10">
        {tabs.map((tItem) => (
          <button key={tItem.id} onClick={() => setTab(tItem.id)}
            className={['flex items-center px-4 py-2.5 text-sm font-medium border-b-2 transition-colors', tab === tItem.id ? 'border-indigo-500 text-white' : 'border-transparent text-white/50 hover:text-white'].join(' ')}>
            {tItem.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="space-y-4">
          {/* Educational note: what backlinks are & why they matter */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-sm text-white/70 leading-relaxed">
            <span className="font-semibold text-white">Backlink nedir?</span> Başka web sitelerinin sizin sitenize verdiği bağlantılardır.
            Google için bir <span className="text-white">güven oyu</span> gibidir: ne kadar çok ve kaliteli (yüksek DR’li) site size link verirse,
            sıralamanız o kadar yükselir. <span className="text-white">Nasıl artırılır?</span> Kaliteli içerik üretin, sektör sitelerinde yayın yapın (digital PR),
            iş ortaklarınızdan ve dizinlerden bağlantı alın. Aşağıda sitenize gelen mevcut backlinkleri görüyorsunuz.
          </div>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            {/* Dofollow/Nofollow legend */}
            <div className="flex items-center gap-3 text-xs text-white/40 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Dofollow = SEO değeri aktarır
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/40" /> Nofollow = değer aktarmaz
              </span>
              <span className="text-white/25">·</span>
              <span title="DR 0-100: bağlantı veren sitenin otoritesi">DR:
                <span className="text-red-400"> 0-30 düşük</span>,
                <span className="text-yellow-400"> 30-50 orta</span>,
                <span className="text-green-400"> 50-70 güçlü</span>,
                <span className="text-emerald-400"> 70+ elit</span>
              </span>
            </div>
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={['h-4 w-4', syncMutation.isPending ? 'animate-spin' : ''].join(' ')} />
              Backlinkleri Getir
            </button>
          </div>
          {/* Single source-of-truth summary cards (DB-derived, consistent across
              reloads). Spam score / domain rank come from the latest sync (not
              persisted), shown as "—" until a sync runs. */}
          {summary && (backlinks?.length ?? 0) > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Toplam Backlink', value: summary.total.toLocaleString() },
                { label: 'Referans Domain', value: summary.referringDomains.toLocaleString() },
                { label: 'Dofollow', value: summary.dofollow.toLocaleString() },
                { label: 'Nofollow', value: ((summary.total ?? 0) - (summary.dofollow ?? 0)).toLocaleString() },
                { label: 'Ortalama DR', value: summary.avgDR },
                { label: 'Spam Skoru', value: syncMutation.data?.spamScore != null ? `${syncMutation.data.spamScore}/100` : '—' },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-white/10 bg-white/2 p-3 text-center">
                  <div className="text-2xl font-bold text-white">{c.value}</div>
                  <div className="text-xs text-white/40 mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>
          )}
          {/* Sync status message (no duplicate count — the cards above are the
              single source of truth, so the number never flips on reload). */}
          {syncErrorMsg && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
              {syncErrorMsg}
            </div>
          )}
          {syncMutation.data && (
            syncMutation.data.error === 'SUBSCRIPTION_REQUIRED' ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
                {syncMutation.data.message ?? 'Backlink verisi için DataForSEO backlinks aboneliği gerekli.'}
              </div>
            ) : syncMutation.data.error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                Backlink verisi alınamadı: {syncMutation.data.error}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
                Senkronizasyon tamamlandı — {(syncMutation.data.total ?? 0).toLocaleString()} backlink, {(syncMutation.data.referringDomains ?? 0).toLocaleString()} referans domain bulundu.
              </div>
            )
          )}

          {/* Domain / Page Strength gauges */}
          <Section title={t('gaugesTitle')}>
            {gaugesLoading ? (
              <div className="h-40 flex items-center justify-center text-white/30 text-sm animate-pulse">…</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 place-items-center py-2">
                <div className="relative flex flex-col items-center">
                  <span className="absolute top-0 right-0"><InfoTooltip text={t('domainStrengthTooltip')} /></span>
                  <GaugeHalfCircle
                    value={gauges?.domainStrength ?? 0}
                    label={t('domainStrengthLabel')}
                    thresholds={{ good: 70, warn: 40 }}
                    size="lg"
                  />
                </div>
                <div className="relative flex flex-col items-center">
                  <span className="absolute top-0 right-0"><InfoTooltip text={t('pageStrengthTooltip')} /></span>
                  <GaugeHalfCircle
                    value={gauges?.pageStrength ?? 0}
                    label={t('pageStrengthLabel')}
                    thresholds={{ good: 70, warn: 40 }}
                    size="lg"
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Counters grid */}
          <Section title={t('countersTitle')}>
            {gauges?.counters ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: t('counterTotal'), value: gauges.counters.total },
                  { label: t('counterReferringDomains'), value: gauges.counters.referringDomains },
                  { label: t('counterDofollow'), value: gauges.counters.dofollow },
                  { label: t('counterNofollow'), value: gauges.counters.nofollow },
                  { label: t('counterEdu'), value: gauges.counters.edu },
                  { label: t('counterGov'), value: gauges.counters.gov },
                  { label: t('counterIpCount'), value: gauges.counters.ipCount, tooltip: t('counterIpTooltip') },
                  { label: t('counterSubnetCount'), value: gauges.counters.subnetCount, tooltip: t('counterSubnetTooltip') },
                ].map((c) => (
                  <div key={c.label} className="rounded-2xl border border-white/10 bg-white/2 p-4 text-center">
                    <div className="text-2xl font-bold text-white">{(c.value ?? 0).toLocaleString()}</div>
                    <div className="text-xs text-white/40 mt-0.5 flex items-center justify-center gap-1">
                      {c.label}
                      {c.tooltip && <InfoTooltip text={c.tooltip} />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/30 text-center py-6">{t('noBacklinks')}</p>
            )}
          </Section>

          {/* Category filter — show all by default, drill into dofollow/nofollow */}
          {(backlinks?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2">
              {([
                { id: 'all', label: `Tümü (${backlinks?.length ?? 0})` },
                { id: 'dofollow', label: `Dofollow (${(backlinks ?? []).filter((b) => b.isDofollow).length})` },
                { id: 'nofollow', label: `Nofollow (${(backlinks ?? []).filter((b) => !b.isDofollow).length})` },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setBlFilter(f.id)}
                  className={['px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', blFilter === f.id ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50 hover:text-white'].join(' ')}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="rounded-xl border border-white/10 h-16 animate-pulse" />)}</div>
          ) : (
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Kaynak Site', 'Hedef Sayfa', 'Bağlantı Metni', 'Tür', 'DR', 'Durum'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-white/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(!backlinks || backlinks.length === 0) && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-white/30">{t('noBacklinks')}</td></tr>
                  )}
                  {(backlinks || []).filter((bl) => blFilter === 'all' || (blFilter === 'dofollow' ? bl.isDofollow : !bl.isDofollow)).map((bl) => (
                    <tr key={bl.id} className="border-b border-white/5 hover:bg-white/2 align-top">
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{bl.sourceDomain}</td>
                      <td className="px-4 py-3 text-white/50 text-xs max-w-[220px] break-all">{bl.targetUrl || '—'}</td>
                      <td className="px-4 py-3 text-white/70 text-xs max-w-[280px] break-words whitespace-normal">{bl.anchorText || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          title={bl.isDofollow ? 'Dofollow: Bu bağlantı SEO değeri (link juice) aktarır ve sıralamanıza katkı sağlar.' : 'Nofollow: Bu bağlantı SEO değeri aktarmaz ancak trafik ve görünürlük sağlayabilir.'}
                          className={['text-xs px-2 py-0.5 rounded-full font-medium cursor-help', bl.isDofollow ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'].join(' ')}>
                          {bl.isDofollow ? 'Dofollow' : 'Nofollow'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold" title="DR (Domain Rating, 0-100): Bağlantıyı veren sitenin otoritesi. 0-30 düşük, 30-50 orta, 50-70 güçlü, 70+ elit.">
                        {bl.domainRating != null ? (
                          <span className={drColorClass(bl.domainRating)}>{bl.domainRating}</span>
                        ) : <span className="text-white/30">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={['text-xs px-2 py-0.5 rounded-full font-medium', bl.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'].join(' ')}>
                          {bl.status === 'ACTIVE' ? t('active') : t('lost')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top backlinks */}
          <Section title={t('topBacklinksTitle')}>
            {!topBacklinks || topBacklinks.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-6">{t('noTopBacklinks')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {[t('colDR'), t('colSourceUrl'), t('colSourceTitle'), t('colAnchor'), t('colType')].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-medium text-white/40">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topBacklinks.map((b, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/2 align-top">
                        <td className="px-3 py-2 font-bold"><span className={drColorClass(b.domainRating)}>{b.domainRating ?? '—'}</span></td>
                        <td className="px-3 py-2 text-white/60 text-xs max-w-[220px] break-all">{b.sourceUrl}</td>
                        <td className="px-3 py-2 text-white/50 text-xs max-w-[200px] break-words whitespace-normal">{b.sourceTitle || '—'}</td>
                        <td className="px-3 py-2 text-white/70 text-xs max-w-[200px] break-words whitespace-normal">{b.anchorText || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={['text-xs px-2 py-0.5 rounded-full font-medium', b.isDofollow ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'].join(' ')}>
                            {b.isDofollow ? 'Dofollow' : 'Nofollow'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Top linked pages */}
          <Section title={t('topPagesTitle')}>
            {!topPages || topPages.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-6">{t('noTopPages')}</p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const max = Math.max(...topPages.map((p) => p.backlinkCount), 1);
                  return topPages.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-white/60 truncate flex-1" title={p.url}>{p.url}</span>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden w-32 flex-shrink-0">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(p.backlinkCount / max) * 100}%` }} />
                      </div>
                      <span className="text-xs text-white/70 font-semibold w-10 text-right flex-shrink-0">{p.backlinkCount}</span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </Section>

          {/* Top anchor texts */}
          <Section title={t('anchorsTitle')}>
            {!anchors || anchors.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-6">{t('noAnchors')}</p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const max = Math.max(...anchors.map((a) => a.count), 1);
                  return anchors.map((a, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-white/60 truncate flex-1" title={a.anchor}>{a.anchor || '—'}</span>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden w-32 flex-shrink-0">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(a.count / max) * 100}%` }} />
                      </div>
                      <span className="text-xs text-white/70 font-semibold w-10 text-right flex-shrink-0">{a.count}</span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </Section>

          {/* Geography */}
          <Section title={t('geographyTitle')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-white/50 mb-2">{t('tldDistribution')}</p>
                <DonutChart data={(geography?.byTld ?? []).map((x) => ({ label: x.tld, value: x.count }))} size="sm" />
              </div>
              <div>
                <p className="text-xs text-white/50 mb-2">{t('countryDistribution')}</p>
                {geography?.byCountry && geography.byCountry.length > 0 ? (
                  <DonutChart data={geography.byCountry.map((x) => ({ label: x.country, value: x.count }))} size="sm" />
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm">
                    {t('noCountryData')}
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* Link split */}
          <Section title={t('linkSplitTitle')}>
            {linkSplit && linkSplit.internalLinks == null && linkSplit.externalDofollow == null && linkSplit.externalNofollow == null ? (
              <div className="rounded-2xl border border-white/10 bg-white/2 p-6 text-center text-white/40 text-sm">
                {t('linkSplitHint')}
              </div>
            ) : (
              <DonutChart
                data={[
                  { label: t('internalLinks'), value: linkSplit?.internalLinks ?? 0 },
                  { label: t('externalDofollow'), value: linkSplit?.externalDofollow ?? 0 },
                  { label: t('externalNofollow'), value: linkSplit?.externalNofollow ?? 0 },
                ]}
                size="sm"
              />
            )}
          </Section>

          {/* Toxic backlinks */}
          <Section title={t('toxicTitle')}>
            {!toxic || toxic.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-6">{t('noToxic')}</p>
            ) : (
              <div className="space-y-2">
                {toxic.map((tb, i) => (
                  <div key={tb.id ?? i} className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{tb.sourceDomain || tb.sourceUrl}</p>
                      <p className="text-xs text-white/40 truncate">{tb.anchorText || '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-white/50 flex items-center gap-1">
                        {t('toxicScoreLabel')}: <span className="text-red-400 font-bold">{tb.toxicScore}</span>
                        <InfoTooltip text={t('toxicScoreTooltip')} />
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">{t('disavowRecommended')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Link velocity */}
          <Section title={t('velocityTitle')}>
            {!velocity || velocity.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-white/30 text-sm">{t('noVelocityData')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={velocity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="newBacklinks" stroke="#0ca30c" strokeWidth={2} dot={{ r: 2 }} name={t('newBacklinksLabel')} />
                  <Line type="monotone" dataKey="lostBacklinks" stroke="#d03b3b" strokeWidth={2} dot={{ r: 2 }} name={t('lostBacklinksLabel')} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Section>
        </div>
      )}

      {tab === 'market' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketLoading ? (
            <div className="col-span-3 space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-xl border border-white/10 h-32 animate-pulse" />)}</div>
          ) : (!market || (market as unknown[]).length === 0) ? (
            <div className="col-span-3 rounded-2xl border border-white/10 p-12 text-center text-sm text-white/30">Şu an uygun liste yok</div>
          ) : (
            (market as Array<{ id: string; price: number | string; drTier?: string; linkType: string; publisherSite?: { domain: string; domainRating?: number; organicTraffic?: number; category?: string } }>).map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/2 p-5">
                <div className="flex justify-between mb-3">
                  <div>
                    <p className="font-semibold text-white">{item.publisherSite?.domain ?? '—'}</p>
                    <p className="text-xs text-white/40">{item.publisherSite?.category ?? item.linkType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-indigo-400 font-bold">DR {item.publisherSite?.domainRating ?? item.drTier ?? '—'}</p>
                    <p className="text-xs text-white/30">{((item.publisherSite?.organicTraffic) || 0).toLocaleString()} {t('visitsPerMonth')}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-white">{Number(item.price || 0).toLocaleString()} TL</span>
                  <button className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all">{t('buyBtn')}</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {[t('colDomain'), t('colAmount'), t('colStatus'), t('colDate')].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-white/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!orders || (orders as unknown[]).length === 0) && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-white/30">{t('noOrders')}</td></tr>
              )}
              {(orders as Array<{ id: string; domain: string; amount: number; status: string; createdAt: string }> || []).map((o) => (
                <tr key={o.id} className="border-b border-white/5 hover:bg-white/2">
                  <td className="px-4 py-3 text-white font-medium">{o.domain}</td>
                  <td className="px-4 py-3 text-white">{(o.amount || 0).toLocaleString()} TL</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{o.status}</span></td>
                  <td className="px-4 py-3 text-white/40 text-xs">{o.createdAt ? new Date(o.createdAt).toLocaleDateString(locale) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
