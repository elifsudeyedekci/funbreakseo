'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { marketApi } from '@/lib/api';

const orderStatusStyles: Record<string, string> = {
  PENDING: 'bg-yellow-400/10 text-yellow-400',
  IN_PROGRESS: 'bg-blue-400/10 text-blue-400',
  COMPLETED: 'bg-green-400/10 text-green-400',
  CANCELLED: 'bg-red-400/10 text-red-400',
};

export default function MarketPage() {
  const [tab, setTab] = useState<'listings' | 'orders'>('listings');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['market-listings'],
    queryFn: () => marketApi.listListings().then(r => (r.data?.data || []) as any[]),
    enabled: tab === 'listings',
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['market-orders'],
    queryFn: () => marketApi.getOrders().then(r => (r.data?.data || []) as any[]),
    enabled: tab === 'orders',
  });

  const categories = ['all', ...Array.from(new Set((listings ?? []).map((l: any) => l.category).filter(Boolean)))];
  const filtered =
    categoryFilter === 'all'
      ? (listings ?? [])
      : (listings ?? []).filter((l: any) => l.category === categoryFilter);

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Publisher Marketplace</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Buy guest posts and sponsored links from verified publishers.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-surface)' }}>
        {(['listings', 'orders'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2 rounded-md text-sm font-medium transition capitalize"
            style={{
              background: tab === t ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {t === 'listings' ? 'Browse Listings' : 'My Orders'}
          </button>
        ))}
      </div>

      {/* Listings Tab */}
      {tab === 'listings' && (
        <>
          {/* Category Filters */}
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
                {cat === 'all' ? 'All Categories' : cat}
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
            <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>No listings found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((listing: any) => (
                <div
                  key={listing.id}
                  className="rounded-xl p-5 space-y-4 hover:border-white/10 transition"
                  style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{listing.domain}</p>
                      <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
                        {listing.category} &middot; {listing.language ?? 'EN'}
                      </p>
                    </div>
                    <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                      ${listing.price ?? 0}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-elevated)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>DA</p>
                      <p className="font-bold text-sm">{listing.da ?? '—'}</p>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-elevated)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>DR</p>
                      <p className="font-bold text-sm">{listing.dr ?? '—'}</p>
                    </div>
                  </div>

                  {listing.description && (
                    <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {listing.description}
                    </p>
                  )}

                  <button
                    className="w-full py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    Order Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {ordersLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Domain', 'Category', 'Price', 'Status', 'Ordered'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(orders ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                      No orders yet. Browse listings to place your first order.
                    </td>
                  </tr>
                )}
                {(orders ?? []).map((order: any) => (
                  <tr key={order.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3 font-medium">{order.domain}</td>
                    <td className="px-4 py-3 capitalize" style={{ color: 'var(--text-secondary)' }}>{order.category}</td>
                    <td className="px-4 py-3 font-medium">${order.price}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${orderStatusStyles[order.status] ?? ''}`}>
                        {order.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
