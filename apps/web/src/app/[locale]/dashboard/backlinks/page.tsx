'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { backlinkApi } from '@/lib/api';

const PROJECT_ID = 'current';

export default function BacklinksPage() {
  const [tab, setTab] = useState<'all' | 'new' | 'lost'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['backlinks', PROJECT_ID, tab],
    queryFn: () => backlinkApi.list(PROJECT_ID, { status: tab !== 'all' ? tab.toUpperCase() : undefined }).then(r => (r.data?.data ?? []) as any[]),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Backlinkler</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Sitenize yönelen geri bağlantıları takip edin</p>
      </div>

      <div className="flex gap-2">
        {(['all', 'new', 'lost'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t === 'all' ? 'Tümü' : t === 'new' ? 'Yeni' : 'Kaybedilen'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data?.length ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <p className="text-lg font-medium">Henüz backlink yok</p>
          <p className="text-sm mt-1">Outreach kampanyaları ile yeni backlinkler kazanabilirsiniz.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                <th className="px-4 py-3 text-left text-[var(--text-secondary)] font-medium">Kaynak Domain</th>
                <th className="px-4 py-3 text-left text-[var(--text-secondary)] font-medium">Hedef URL</th>
                <th className="px-4 py-3 text-left text-[var(--text-secondary)] font-medium">DR</th>
                <th className="px-4 py-3 text-left text-[var(--text-secondary)] font-medium">Tip</th>
                <th className="px-4 py-3 text-left text-[var(--text-secondary)] font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {data.map((bl: any) => (
                <tr key={bl.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="px-4 py-3">
                    <a href={bl.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                      {bl.sourceDomain}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] max-w-xs truncate">{bl.targetUrl}</td>
                  <td className="px-4 py-3 text-[var(--text-primary)]">{bl.domainRating ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${bl.isDofollow ? 'bg-green-500/10 text-green-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
                      {bl.isDofollow ? 'Dofollow' : 'Nofollow'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${bl.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {bl.status === 'ACTIVE' ? 'Aktif' : 'Kayıp'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
