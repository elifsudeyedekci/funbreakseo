'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keywordApi } from '@/lib/api';

const PROJECT_ID = 'current';

const difficultyColor = (d: number) =>
  d < 30 ? 'text-green-400' : d < 60 ? 'text-yellow-400' : 'text-red-400';

const changeColor = (c: number) =>
  c > 0 ? 'text-green-400' : c < 0 ? 'text-red-400' : 'text-[var(--text-muted)]';

export default function KeywordsPage() {
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const qc = useQueryClient();

  const { data: keywords, isLoading: kwLoading } = useQuery({
    queryKey: ['keywords', PROJECT_ID],
    queryFn: () => keywordApi.list(PROJECT_ID),
  });

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['keywords-summary', PROJECT_ID],
    queryFn: () => keywordApi.summary(PROJECT_ID),
  });

  const addMutation = useMutation({
    mutationFn: (kw: string) =>
      keywordApi.add ? keywordApi.add(PROJECT_ID, kw) : Promise.resolve(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['keywords', PROJECT_ID] });
      setShowAdd(false);
      setNewKeyword('');
    },
  });

  const rankBuckets = [
    { label: 'Top 3', value: summary?.top3 ?? 0, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: '4–10', value: summary?.top10 ?? 0, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: '11–20', value: summary?.top20 ?? 0, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: '20+', value: summary?.beyond20 ?? 0, color: 'text-[var(--text-muted)]', bg: 'bg-white/5' },
  ];

  const tags: string[] = ['all', ...Array.from(new Set((keywords ?? []).flatMap((k: any) => k.tags ?? [])))];
  const filtered =
    tagFilter === 'all'
      ? (keywords ?? [])
      : (keywords ?? []).filter((k: any) => k.tags?.includes(tagFilter));

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Keywords</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Track rankings, volume, and AI Overview appearances.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 rounded-lg text-sm border border-white/10 hover:border-white/20 transition"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            Bulk Import
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            + Add Keyword
          </button>
        </div>
      </div>

      {/* Rank Distribution */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {rankBuckets.map((b) => (
          <div key={b.label} className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{b.label}</p>
            {sumLoading ? (
              <div className="h-7 w-12 rounded bg-white/5 animate-pulse" />
            ) : (
              <p className={`text-2xl font-bold ${b.color}`}>{b.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Tag filters */}
      <div className="flex gap-2 flex-wrap">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setTagFilter(t)}
            className={`px-3 py-1 rounded-full text-xs transition ${
              tagFilter === t ? 'font-semibold' : 'opacity-60 hover:opacity-80'
            }`}
            style={{
              background: tagFilter === t ? 'var(--accent)' : 'var(--bg-elevated)',
              color: tagFilter === t ? '#fff' : 'var(--text-secondary)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {t === 'all' ? 'All Tags' : t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {kwLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Keyword', 'Rank', 'Change', 'Volume', 'Difficulty', 'AI Overview', 'Tags'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No keywords yet. Add your first keyword above.
                  </td>
                </tr>
              )}
              {filtered.map((kw: any) => (
                <tr key={kw.id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 font-medium">{kw.keyword}</td>
                  <td className="px-4 py-3">{kw.rank ?? '—'}</td>
                  <td className={`px-4 py-3 font-medium ${changeColor(kw.change ?? 0)}`}>
                    {kw.change > 0 ? `+${kw.change}` : kw.change ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {kw.volume?.toLocaleString() ?? '—'}
                  </td>
                  <td className={`px-4 py-3 font-medium ${difficultyColor(kw.difficulty ?? 0)}`}>
                    {kw.difficulty ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {kw.aiOverview ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
                        Yes
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(kw.tags ?? []).map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Keyword Dialog */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-semibold">Add Keyword</h2>
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Enter keyword..."
              className="w-full px-4 py-2 rounded-lg outline-none text-sm"
              style={{ background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button
                onClick={() => addMutation.mutate(newKeyword)}
                disabled={!newKeyword || addMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {addMutation.isPending ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Dialog */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-semibold">Bulk Import Keywords</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Paste keywords below, one per line.
            </p>
            <textarea
              rows={8}
              placeholder="keyword one&#10;keyword two&#10;keyword three"
              className="w-full px-4 py-2 rounded-lg outline-none text-sm resize-none"
              style={{ background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button
                onClick={() => setShowImport(false)}
                className="px-4 py-2 text-sm rounded-lg font-medium"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
