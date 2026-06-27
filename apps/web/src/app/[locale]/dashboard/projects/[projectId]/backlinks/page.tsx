'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { outreachApi } from '@/lib/api';

type Tab = 'profile' | 'market' | 'orders';

export default function BacklinksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslations('backlinksPage');
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>('profile');

  const queryClient = useQueryClient();
  const [blFilter, setBlFilter] = useState<'all' | 'dofollow' | 'nofollow'>('all');

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

  const syncMutation = useMutation({
    mutationFn: () => outreachApi.syncBacklinks(projectId).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backlinks', projectId] }),
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
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={['flex items-center px-4 py-2.5 text-sm font-medium border-b-2 transition-colors', tab === t.id ? 'border-indigo-500 text-white' : 'border-transparent text-white/50 hover:text-white'].join(' ')}>
            {t.label}
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
                          <span className={
                            bl.domainRating >= 70 ? 'text-emerald-400'
                            : bl.domainRating >= 50 ? 'text-green-400'
                            : bl.domainRating >= 30 ? 'text-yellow-400'
                            : 'text-red-400'
                          }>{bl.domainRating}</span>
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