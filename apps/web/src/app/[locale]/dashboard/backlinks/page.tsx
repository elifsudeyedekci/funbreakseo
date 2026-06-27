'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { backlinkApi } from '@/lib/api';
import { useSelectedProject } from '@/lib/useSelectedProject';

export default function BacklinksPage() {
  const t = useTranslations('backlinksPage');
  const [tab, setTab] = useState<'all' | 'new' | 'lost'>('all');

  const { projectId } = useSelectedProject();

  const { data, isLoading } = useQuery({
    queryKey: ['backlinks-global', tab, projectId],
    enabled: !!projectId,
    queryFn: () =>
      backlinkApi.list(projectId!, { status: tab !== 'all' ? tab.toUpperCase() : undefined })
        // GET /backlinks now returns { summary, items }; also tolerate a bare array.
        .then((r) => (Array.isArray(r.data) ? r.data : (r.data?.items ?? r.data?.data ?? [])) as Array<{
          id: string;
          sourceUrl: string;
          sourceDomain: string;
          targetUrl: string;
          domainRating?: number;
          isDofollow: boolean;
          status: string;
        }>),
  });

  const tabLabels = { all: t('tabAll'), new: t('tabNew'), lost: t('tabLost') };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      <div className="flex gap-2">
        {(['all', 'new', 'lost'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tabLabels[key]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data?.length ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <p className="text-lg font-medium">{t('noLinksYet')}</p>
          <p className="text-sm mt-1">{t('noLinksDesc')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                <th className="px-4 py-3 text-left text-[var(--text-secondary)] font-medium">{t('colDomain')}</th>
                <th className="px-4 py-3 text-left text-[var(--text-secondary)] font-medium">{t('colTargetUrl')}</th>
                <th className="px-4 py-3 text-left text-[var(--text-secondary)] font-medium">{t('colDR')}</th>
                <th className="px-4 py-3 text-left text-[var(--text-secondary)] font-medium">{t('colType')}</th>
                <th className="px-4 py-3 text-left text-[var(--text-secondary)] font-medium">{t('colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((bl) => (
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
  );
}
