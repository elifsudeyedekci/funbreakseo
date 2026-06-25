'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl'
import { useParams } from 'next/navigation';
import { outreachApi } from '@/lib/api';

type Tab = 'profile' | 'market' | 'orders';

export default function BacklinksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslations('backlinksPage');
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>('profile');

  const { data: backlinks, isLoading } = useQuery({
    queryKey: ['backlinks', projectId],
    queryFn: () => outreachApi.backlinks(projectId).then((r) => r.data?.data ?? null),
    enabled: tab === 'profile',
  });

  const { data: market } = useQuery({
    queryKey: ['backlink-market', projectId],
    queryFn: () => outreachApi.marketListings({ projectId }).then((r) => r.data?.data ?? null),
    enabled: tab === 'market',
  });

  const { data: orders } = useQuery({
    queryKey: ['backlink-orders', projectId],
    queryFn: () => outreachApi.orders(projectId).then((r) => r.data?.data ?? null),
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
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="rounded-xl border border-white/10 h-16 animate-pulse" />)}</div>
          ) : (
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {[t('colDomain'), t('colDR'), t('colAnchor'), t('colType'), t('colStatus')].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-white/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(!backlinks || (backlinks as unknown[]).length === 0) && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-white/30">{t('noBacklinks')}</td></tr>
                  )}
                  {(backlinks as Array<{ id: string; sourceDomain: string; domainRating: number; anchorText: string; linkType: string; isActive: boolean }> || []).map((bl) => (
                    <tr key={bl.id} className="border-b border-white/5 hover:bg-white/2">
                      <td className="px-4 py-3 text-white font-medium">{bl.sourceDomain}</td>
                      <td className="px-4 py-3 text-indigo-400 font-bold">{bl.domainRating}</td>
                      <td className="px-4 py-3 text-white/60 font-mono text-xs">{bl.anchorText}</td>
                      <td className="px-4 py-3 text-white/50 text-xs">{bl.linkType}</td>
                      <td className="px-4 py-3">
                        <span className={['text-xs px-2 py-0.5 rounded-full font-medium', bl.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'].join(' ')}>
                          {bl.isActive ? t('active') : t('lost')}
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
          {(!market || (market as unknown[]).length === 0) ? (
            <div className="col-span-3 rounded-2xl border border-white/10 p-12 text-center text-sm text-white/30">{t('marketLoading')}</div>
          ) : (
            (market as Array<{ id: string; domain: string; dr: number; traffic: number; price: number; category: string }>).map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/2 p-5">
                <div className="flex justify-between mb-3">
                  <div>
                    <p className="font-semibold text-white">{item.domain}</p>
                    <p className="text-xs text-white/40">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-indigo-400 font-bold">DR {item.dr}</p>
                    <p className="text-xs text-white/30">{(item.traffic || 0).toLocaleString()} {t('visitsPerMonth')}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-white">{(item.price || 0).toLocaleString()} TL</span>
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