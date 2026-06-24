'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { geoApi } from '@/lib/api';

const PROJECT_ID = 'current';

const PLATFORMS = [
  { key: 'chatgpt', label: 'ChatGPT', icon: '🤖' },
  { key: 'gemini', label: 'Gemini', icon: '✨' },
  { key: 'perplexity', label: 'Perplexity', icon: '🔍' },
  { key: 'claude', label: 'Claude', icon: '💡' },
  { key: 'aiOverview', label: 'AI Overview', icon: '🔵' },
  { key: 'aiMode', label: 'AI Mode', icon: '⚡' },
];

const ScoreRing = ({ value }: { value: number }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (value / 100) * circumference;
  const color = value >= 70 ? '#A371F7' : value >= 40 ? '#5B8DEF' : '#52525B';
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle
        cx="26" cy="26" r={radius} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle" fontSize="11" fill={color} fontWeight="bold">{value}</text>
    </svg>
  );
};

export default function GeoPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const qc = useQueryClient();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['geo-overview', PROJECT_ID],
    queryFn: () => geoApi.overview(PROJECT_ID),
  });

  const addMutation = useMutation({
    mutationFn: (q: string) =>
      geoApi.addQuery ? geoApi.addQuery(PROJECT_ID, q) : Promise.resolve(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geo-overview', PROJECT_ID] });
      setShowAdd(false);
      setQuery('');
    },
  });

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GEO Visibility</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Track your brand mentions and citations across AI platforms.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
          style={{ background: 'var(--geo-accent)', color: '#fff' }}
        >
          + Add GEO Query
        </button>
      </div>

      {/* Overall score */}
      {!isLoading && overview?.overallScore != null && (
        <div className="rounded-xl p-6 flex items-center gap-6" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(163,113,247,0.2)' }}>
          <ScoreRing value={overview.overallScore} />
          <div>
            <p className="text-lg font-bold">Overall GEO Score: {overview.overallScore}/100</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Based on {overview.totalMentions ?? 0} mentions and {overview.totalCitations ?? 0} citations across all platforms.
            </p>
          </div>
        </div>
      )}

      {/* Platform Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? PLATFORMS.map((p) => (
              <div key={p.key} className="h-44 rounded-xl animate-pulse" style={{ background: 'var(--bg-surface)' }} />
            ))
          : PLATFORMS.map((p) => {
              const platform = overview?.platforms?.[p.key] ?? {};
              const score = platform.visibilityScore ?? 0;
              return (
                <div
                  key={p.key}
                  className="rounded-xl p-5 space-y-4"
                  style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{p.icon}</span>
                      <span className="font-semibold">{p.label}</span>
                    </div>
                    <ScoreRing value={score} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Mentions</p>
                      <p className="text-xl font-bold" style={{ color: 'var(--geo-accent)' }}>
                        {platform.mentionCount ?? 0}
                      </p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Citations</p>
                      <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                        {platform.citationCount ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${score}%`, background: 'var(--geo-accent)' }}
                      />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{score}%</span>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Queries Table */}
      {(overview?.queries ?? []).length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold">Tracked Queries</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Query', 'Platform', 'Mentioned', 'Cited', 'Position'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(overview?.queries ?? []).map((q: any) => (
                <tr key={q.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 font-medium">{q.query}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{q.platform}</td>
                  <td className="px-4 py-3">{q.mentioned ? <span className="text-green-400">Yes</span> : <span style={{ color: 'var(--text-muted)' }}>No</span>}</td>
                  <td className="px-4 py-3">{q.cited ? <span className="text-green-400">Yes</span> : <span style={{ color: 'var(--text-muted)' }}>No</span>}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{q.position ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Query Dialog */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-semibold">Add GEO Query</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Enter a query to track across AI platforms.
            </p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. best project management tools"
              className="w-full px-4 py-2 rounded-lg outline-none text-sm"
              style={{ background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button
                onClick={() => addMutation.mutate(query)}
                disabled={!query || addMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--geo-accent)', color: '#fff' }}
              >
                {addMutation.isPending ? 'Adding…' : 'Add Query'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
