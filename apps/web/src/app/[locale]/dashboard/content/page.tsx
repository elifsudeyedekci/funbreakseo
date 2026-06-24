'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentApi } from '@/lib/api';

const PROJECT_ID = 'current';

type ContentStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED';

const statusStyles: Record<ContentStatus, string> = {
  DRAFT: 'bg-white/10 text-[var(--text-secondary)]',
  IN_REVIEW: 'bg-yellow-400/10 text-yellow-400',
  APPROVED: 'bg-blue-400/10 text-blue-400',
  PUBLISHED: 'bg-green-400/10 text-green-400',
};

const ScoreBar = ({ value, color }: { value: number; color: string }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
    </div>
    <span className="text-xs w-6 text-right" style={{ color: 'var(--text-secondary)' }}>{value}</span>
  </div>
);

export default function ContentPage() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [genTopic, setGenTopic] = useState('');
  const [genKeyword, setGenKeyword] = useState('');
  const qc = useQueryClient();

  const { data: content, isLoading } = useQuery({
    queryKey: ['content', PROJECT_ID],
    queryFn: () => contentApi.list(PROJECT_ID),
  });

  const generateMutation = useMutation({
    mutationFn: (data: { topic: string; keyword: string }) =>
      contentApi.generate(PROJECT_ID, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content', PROJECT_ID] });
      setShowGenerate(false);
      setGenTopic('');
      setGenKeyword('');
    },
  });

  const statusCounts = (content ?? []).reduce(
    (acc: Record<string, number>, item: any) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            AI-generated and managed content with SEO + GEO scoring.
          </p>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          + Generate Content
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED'] as ContentStatus[]).map((s) => (
          <div key={s} className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{s.replace('_', ' ')}</p>
            <p className="text-2xl font-bold">{statusCounts[s] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Content List */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Title', 'Status', 'SEO Score', 'GEO Score', 'Words', 'Updated'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(content ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No content yet. Generate your first article above.
                  </td>
                </tr>
              )}
              {(content ?? []).map((item: any) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-xs">{item.title}</p>
                    <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: 'var(--text-muted)' }}>{item.keyword}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[item.status as ContentStatus] ?? ''}`}>
                      {item.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-32">
                    <ScoreBar value={item.seoScore ?? 0} color="var(--accent)" />
                  </td>
                  <td className="px-4 py-3 w-32">
                    <ScoreBar value={item.geoScore ?? 0} color="var(--geo-accent)" />
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {item.wordCount?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate Dialog */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-semibold">Generate Content</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Topic</label>
                <input
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="e.g. Best SEO tools in 2025"
                  className="w-full px-4 py-2 rounded-lg outline-none text-sm"
                  style={{ background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Target Keyword</label>
                <input
                  value={genKeyword}
                  onChange={(e) => setGenKeyword(e.target.value)}
                  placeholder="e.g. seo tools"
                  className="w-full px-4 py-2 rounded-lg outline-none text-sm"
                  style={{ background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            {generateMutation.isError && (
              <p className="text-xs text-red-400">Failed to generate content. Please try again.</p>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowGenerate(false)} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button
                onClick={() => generateMutation.mutate({ topic: genTopic, keyword: genKeyword })}
                disabled={!genTopic || generateMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {generateMutation.isPending ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
