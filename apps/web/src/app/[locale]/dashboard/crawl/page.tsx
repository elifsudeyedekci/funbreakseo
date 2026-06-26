'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crawlerApi, projectApi } from '@/lib/api';

const ISSUE_CATEGORIES = [
  { key: 'title', label: 'Title Tags' },
  { key: 'meta', label: 'Meta Descriptions' },
  { key: 'canonical', label: 'Canonical Tags' },
  { key: 'h1', label: 'H1 Tags' },
  { key: 'loadSpeed', label: 'Load Speed' },
  { key: 'mobile', label: 'Mobile Issues' },
  { key: 'schema', label: 'Schema Markup' },
  { key: 'internalLinks', label: 'Internal Links' },
  { key: 'brokenLinks', label: 'Broken Links' },
];

const statusStyles: Record<string, string> = {
  completed: 'bg-green-400/10 text-green-400',
  running: 'bg-blue-400/10 text-blue-400',
  failed: 'bg-red-400/10 text-red-400',
  pending: 'bg-yellow-400/10 text-yellow-400',
};

export default function CrawlPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list().then(r => (Array.isArray(r.data) ? r.data : (r.data?.data ?? [])) as { id: string }[]),
  });
  const projectId = projects?.[0]?.id;

  const { data: history, isLoading } = useQuery({
    queryKey: ['crawl-history', projectId],
    enabled: !!projectId,
    queryFn: () => crawlerApi.history(projectId!).then(r => (Array.isArray(r.data) ? r.data : (r.data?.data ?? [])) as any[]),
    refetchInterval: 10_000,
  });

  const startMutation = useMutation({
    mutationFn: () => crawlerApi.start(projectId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crawl-history', projectId] }),
  });

  const activeCrawl = selected
    ? (history ?? []).find((c: any) => c.id === selected)
    : (history ?? [])[0];

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Site Crawler</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Audit technical SEO issues across your site.
          </p>
        </div>
        <button
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
          className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {startMutation.isPending ? 'Starting…' : '+ Start New Crawl'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crawl History */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold">Crawl History</h2>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (history ?? []).length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              No crawls yet. Start your first crawl.
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {(history ?? []).map((crawl: any) => (
                <button
                  key={crawl.id}
                  onClick={() => setSelected(crawl.id)}
                  className={`w-full text-left px-4 py-3 transition hover:bg-white/[0.03] ${selected === crawl.id ? 'bg-white/[0.04]' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {new Date(crawl.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[crawl.status] ?? 'text-[var(--text-muted)]'}`}>
                      {crawl.status}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {crawl.pagesFound ?? 0} pages &middot; {crawl.issuesFound ?? 0} issues
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Issue Categories */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold mb-4">
              {activeCrawl
                ? `Issues — ${new Date(activeCrawl.createdAt).toLocaleDateString()}`
                : 'Issues'}
            </h2>
            {!activeCrawl ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Select a crawl to view its issues.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ISSUE_CATEGORIES.map((cat) => {
                  const count = activeCrawl?.issues?.[cat.key] ?? 0;
                  const severity = count === 0 ? 'ok' : count < 5 ? 'warn' : 'error';
                  const colorMap = { ok: 'text-green-400 bg-green-400/10', warn: 'text-yellow-400 bg-yellow-400/10', error: 'text-red-400 bg-red-400/10' };
                  return (
                    <div
                      key={cat.key}
                      className="rounded-lg p-3 flex items-center justify-between"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{cat.label}</span>
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${colorMap[severity]}`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary stats */}
          {activeCrawl && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Pages Crawled', value: activeCrawl.pagesFound ?? 0 },
                { label: 'Total Issues', value: activeCrawl.issuesFound ?? 0 },
                { label: 'Duration', value: activeCrawl.durationMs ? `${(activeCrawl.durationMs / 1000).toFixed(1)}s` : '—' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Running indicator */}
          {activeCrawl?.status === 'running' && (
            <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(91,141,239,0.08)', border: '1px solid rgba(91,141,239,0.2)' }}>
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-sm" style={{ color: 'var(--accent)' }}>
                Crawl in progress… Results will update automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
