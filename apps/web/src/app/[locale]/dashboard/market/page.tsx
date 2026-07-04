'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { X, FileText, CheckCircle2, MessageSquare } from 'lucide-react';
import { marketApi } from '@/lib/api';
import { useSelectedProject } from '@/lib/useSelectedProject';

const orderStatusStyles: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-400/10 text-yellow-400',
  ESCROW_HELD: 'bg-blue-400/10 text-blue-400',
  CONTENT_READY: 'bg-purple-400/10 text-purple-400',
  PUBLISHED: 'bg-emerald-400/10 text-emerald-400',
  VERIFIED: 'bg-emerald-400/10 text-emerald-400',
  COMPLETED: 'bg-green-400/10 text-green-400',
  DISPUTED: 'bg-red-400/10 text-red-400',
  REFUNDED: 'bg-red-400/10 text-red-400',
};

interface OrderRow {
  id: string;
  status: string;
  price: number;
  topic?: string | null;
  contentDraft?: string | null;
  contentApprovedAt?: string | null;
  createdAt?: string;
  listing?: { publisherSite?: { domain?: string; category?: string; domainRating?: number } };
  project?: { domain?: string };
}

/** Basit markdown görüntüleme (taslak önizlemesi için) */
function draftToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return md
    .split(/\n{2,}/)
    .map((b) => {
      const t = b.trim();
      if (!t) return '';
      if (t.startsWith('### ')) return `<h3>${esc(t.slice(4))}</h3>`;
      if (t.startsWith('## ')) return `<h2>${esc(t.slice(3))}</h2>`;
      if (t.startsWith('# ')) return `<h1>${esc(t.slice(2))}</h1>`;
      const inner = esc(t)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#818cf8;text-decoration:underline">$1</a>');
      return `<p>${inner.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');
}

export default function MarketPage() {
  const t = useTranslations('marketPage');
  const { projectId } = useSelectedProject();
  const qc = useQueryClient();

  const [tab, setTab] = useState<'listings' | 'orders'>('listings');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Sipariş modalı
  const [orderListing, setOrderListing] = useState<{ id: string; domain: string; price: number } | null>(null);
  const [topic, setTopic] = useState('');
  const [kw1, setKw1] = useState({ anchor: '', url: '' });
  const [kw2, setKw2] = useState({ anchor: '', url: '' });
  const [brand, setBrand] = useState({ anchor: '', url: '' });
  const [orderError, setOrderError] = useState('');

  // İçerik inceleme modalı
  const [reviewOrder, setReviewOrder] = useState<OrderRow | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [showRevisionBox, setShowRevisionBox] = useState(false);

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['market-listings'],
    queryFn: () =>
      marketApi.listListings().then((r) => {
        const raw = r.data?.items ?? r.data?.data ?? r.data;
        return (Array.isArray(raw) ? raw : []) as any[];
      }),
    enabled: tab === 'listings',
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['market-orders'],
    queryFn: () =>
      marketApi.getOrders().then((r) => (Array.isArray(r.data) ? r.data : (r.data?.data ?? [])) as OrderRow[]),
    enabled: tab === 'orders',
    refetchInterval: 15_000,
  });

  const orderMutation = useMutation({
    mutationFn: () => {
      const links = [
        kw1.anchor && { url: kw1.url, anchor: kw1.anchor, type: 'KEYWORD' as const },
        kw2.anchor && { url: kw2.url, anchor: kw2.anchor, type: 'KEYWORD' as const },
        brand.anchor && { url: brand.url, anchor: brand.anchor, type: 'BRAND' as const },
      ].filter(Boolean);
      return marketApi.createOrder({
        listingId: orderListing!.id,
        projectId,
        targetUrl: kw1.url || brand.url,
        topic,
        links,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['market-orders'] });
      setOrderListing(null);
      setTab('orders');
    },
    onError: (e: any) => setOrderError(e?.response?.data?.message ?? t('orderError')),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => marketApi.approveOrderContent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['market-orders'] });
      setReviewOrder(null);
    },
  });

  const revisionMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => marketApi.requestOrderRevision(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['market-orders'] });
      setReviewOrder(null);
      setShowRevisionBox(false);
      setRevisionNote('');
    },
  });

  const openOrderModal = (listing: any) => {
    const domain = listing.publisherSite?.domain ?? listing.domain ?? '';
    setOrderListing({ id: listing.id, domain, price: Number(listing.price ?? 0) });
    setTopic('');
    setKw1({ anchor: '', url: '' });
    setKw2({ anchor: '', url: '' });
    setBrand({ anchor: '', url: '' });
    setOrderError('');
  };

  const orderStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING_PAYMENT: t('statusPending'),
      ESCROW_HELD: t('statusInProgress'),
      CONTENT_READY: t('statusContentReady'),
      PUBLISHED: t('statusPublished'),
      VERIFIED: t('statusPublished'),
      COMPLETED: t('statusCompleted'),
      DISPUTED: t('statusCancelled'),
      REFUNDED: t('statusCancelled'),
    };
    return map[status] ?? status;
  };

  const categories = [
    'all',
    ...Array.from(new Set((listings ?? []).map((l: any) => l.publisherSite?.category ?? l.category).filter(Boolean))),
  ];
  const filtered =
    categoryFilter === 'all'
      ? (listings ?? [])
      : (listings ?? []).filter((l: any) => (l.publisherSite?.category ?? l.category) === categoryFilter);

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('subtitle')}</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-surface)' }}>
        {(['listings', 'orders'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-5 py-2 rounded-md text-sm font-medium transition"
            style={{
              background: tab === key ? 'var(--bg-elevated)' : 'transparent',
              color: tab === key ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {key === 'listings' ? t('tabListings') : t('tabOrders')}
          </button>
        ))}
      </div>

      {/* Havuz */}
      {tab === 'listings' && (
        <>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs capitalize transition ${categoryFilter === cat ? 'font-semibold' : 'opacity-60 hover:opacity-80'}`}
                style={{
                  background: categoryFilter === cat ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: categoryFilter === cat ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {cat === 'all' ? t('filterAll') : cat}
              </button>
            ))}
          </div>

          {listingsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-52 rounded-xl animate-pulse" style={{ background: 'var(--bg-surface)' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>{t('noListings')}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((listing: any) => {
                const site = listing.publisherSite ?? {};
                return (
                  <div
                    key={listing.id}
                    className="rounded-xl p-5 space-y-4 hover:border-white/10 transition"
                    style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{site.domain ?? listing.domain ?? '—'}</p>
                        <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
                          {(site.category ?? listing.category ?? '—')} &middot; {(site.language ?? 'tr').toUpperCase()}
                        </p>
                      </div>
                      <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                        ₺{Number(listing.price ?? 0).toLocaleString('tr-TR')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-elevated)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>DR</p>
                        <p className="font-bold text-sm">{site.domainRating ?? listing.drTier ?? '—'}</p>
                      </div>
                      <div className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-elevated)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('colTraffic')}</p>
                        <p className="font-bold text-sm">
                          {site.organicTraffic ? Number(site.organicTraffic).toLocaleString('tr-TR') : '—'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => openOrderModal(listing)}
                      className="w-full py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
                      style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                      {t('buyBtn')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Siparişlerim */}
      {tab === 'orders' && (
        <div className="rounded-xl overflow-x-auto" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {ordersLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm" style={{ minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {[t('colDomain'), t('colTopic'), t('colPrice'), t('colStatus'), t('colContent'), t('colDate')].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(orders ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                      {t('noOrders')}
                    </td>
                  </tr>
                )}
                {(orders ?? []).map((order) => (
                  <tr key={order.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3 font-medium">{order.listing?.publisherSite?.domain ?? '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{order.topic ?? '—'}</td>
                    <td className="px-4 py-3 font-medium">₺{Number(order.price).toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${orderStatusStyles[order.status] ?? 'bg-white/10 text-white/60'}`}>
                        {orderStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {order.contentDraft ? (
                        <button
                          onClick={() => { setReviewOrder(order); setShowRevisionBox(false); setRevisionNote(''); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-90"
                          style={{
                            background: order.contentApprovedAt ? 'rgba(34,197,94,0.12)' : 'var(--accent)',
                            color: order.contentApprovedAt ? '#22c55e' : '#fff',
                          }}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {order.contentApprovedAt ? t('contentApproved') : t('reviewContent')}
                        </button>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('contentGenerating')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('tr-TR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Sipariş modalı: konu + 2 kelime + 1 marka linki ── */}
      {orderListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOrderListing(null)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-white">{t('orderModalTitle')}</h2>
              <button onClick={() => setOrderListing(null)} className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-white/40 mb-5">
              {orderListing.domain} · ₺{orderListing.price.toLocaleString('tr-TR')} — {t('orderModalHint')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">{t('topicLabel')}</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={t('topicPlaceholder')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none"
                />
              </div>

              {[
                { label: t('keyword1Label'), state: kw1, set: setKw1 },
                { label: t('keyword2Label'), state: kw2, set: setKw2 },
              ].map(({ label, state, set }) => (
                <div key={label} className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">{label}</label>
                    <input
                      value={state.anchor}
                      onChange={(e) => set({ ...state, anchor: e.target.value })}
                      placeholder={t('anchorPlaceholder')}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">URL</label>
                    <input
                      value={state.url}
                      onChange={(e) => set({ ...state, url: e.target.value })}
                      placeholder="https://siteniz.com/sayfa"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none"
                    />
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-purple-300/70 mb-1">{t('brandLabel')}</label>
                  <input
                    value={brand.anchor}
                    onChange={(e) => setBrand({ ...brand, anchor: e.target.value })}
                    placeholder={t('brandPlaceholder')}
                    className="w-full rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-purple-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-purple-300/70 mb-1">URL</label>
                  <input
                    value={brand.url}
                    onChange={(e) => setBrand({ ...brand, url: e.target.value })}
                    placeholder="https://siteniz.com"
                    className="w-full rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-purple-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-xs text-white/35 leading-relaxed">{t('orderFlowExplainer')}</p>

              {orderError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">{orderError}</div>
              )}

              <button
                onClick={() => { setOrderError(''); orderMutation.mutate(); }}
                disabled={orderMutation.isPending || !topic.trim() || !(kw1.anchor && kw1.url) || !(brand.anchor && brand.url) || !projectId}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
              >
                {orderMutation.isPending ? t('ordering') : t('confirmOrder', { price: orderListing.price.toLocaleString('tr-TR') })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── İçerik inceleme modalı: onayla / düzeltme iste ── */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setReviewOrder(null)} />
          <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{t('reviewModalTitle')}</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {reviewOrder.listing?.publisherSite?.domain} · {reviewOrder.topic}
                </p>
              </div>
              <button onClick={() => setReviewOrder(null)} className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className="prose prose-invert max-w-none flex-1 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm"
              dangerouslySetInnerHTML={{ __html: draftToHtml(reviewOrder.contentDraft ?? '') }}
            />

            {!reviewOrder.contentApprovedAt && (
              <div className="mt-4 space-y-3">
                {showRevisionBox && (
                  <textarea
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    rows={3}
                    placeholder={t('revisionPlaceholder')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:border-indigo-500/50 focus:outline-none"
                  />
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => approveMutation.mutate(reviewOrder.id)}
                    disabled={approveMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-2.5 text-sm font-semibold text-white transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" /> {t('approveBtn')}
                  </button>
                  {!showRevisionBox ? (
                    <button
                      onClick={() => setShowRevisionBox(true)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 hover:bg-white/10 py-2.5 text-sm font-medium text-white/70 transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" /> {t('revisionBtn')}
                    </button>
                  ) : (
                    <button
                      onClick={() => revisionMutation.mutate({ id: reviewOrder.id, note: revisionNote })}
                      disabled={revisionMutation.isPending || revisionNote.trim().length < 3}
                      className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 py-2.5 text-sm font-semibold text-white transition-colors"
                    >
                      {revisionMutation.isPending ? t('sending') : t('sendRevisionBtn')}
                    </button>
                  )}
                </div>
                <p className="text-xs text-white/35">{t('approvalExplainer')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
