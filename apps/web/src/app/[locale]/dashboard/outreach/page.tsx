'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { outreachApi } from '@/lib/api';

const PROJECT_ID = 'current';

const campaignStatusStyles: Record<string, string> = {
  ACTIVE: 'bg-green-400/10 text-green-400',
  PAUSED: 'bg-yellow-400/10 text-yellow-400',
  DRAFT: 'bg-white/10 text-[var(--text-secondary)]',
  COMPLETED: 'bg-blue-400/10 text-blue-400',
};

export default function OutreachPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const qc = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['outreach', PROJECT_ID],
    queryFn: () => outreachApi.list(PROJECT_ID).then(r => (r.data?.data || []) as any[]),
  });

  const createMutation = useMutation({
    mutationFn: (campaignName: string) => outreachApi.create(PROJECT_ID, { name: campaignName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach', PROJECT_ID] });
      setShowCreate(false);
      setName('');
    },
  });

  const totals = (campaigns ?? []).reduce(
    (acc: Record<string, number>, c: any) => ({
      prospects: acc.prospects + (c.prospectsCount ?? 0),
      sent: acc.sent + (c.sent ?? 0),
      opens: acc.opens + (c.opens ?? 0),
      replies: acc.replies + (c.replies ?? 0),
    }),
    { prospects: 0, sent: 0, opens: 0, replies: 0 }
  );

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Outreach</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage link-building campaigns and prospect outreach.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          + Create Campaign
        </button>
      </div>

      {/* Summary stats */}
      {!isLoading && (campaigns ?? []).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Prospects', value: totals.prospects },
            { label: 'Emails Sent', value: totals.sent },
            { label: 'Opens', value: totals.opens, sub: totals.sent ? `${Math.round((totals.opens / totals.sent) * 100)}%` : '—' },
            { label: 'Replies', value: totals.replies, sub: totals.sent ? `${Math.round((totals.replies / totals.sent) * 100)}%` : '—' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
              {s.sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.sub} rate</p>}
            </div>
          ))}
        </div>
      )}

      {/* Campaign List */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Campaign', 'Status', 'Prospects', 'Sent', 'Opens', 'Replies', 'Reply Rate'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(campaigns ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No campaigns yet. Create your first outreach campaign.
                  </td>
                </tr>
              )}
              {(campaigns ?? []).map((c: any) => {
                const replyRate = c.sent > 0 ? Math.round((c.replies / c.sent) * 100) : 0;
                const openRate = c.sent > 0 ? Math.round((c.opens / c.sent) * 100) : 0;
                return (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Created {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${campaignStatusStyles[c.status] ?? ''}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{c.prospectsCount ?? 0}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{c.sent ?? 0}</td>
                    <td className="px-4 py-3">
                      <span>{c.opens ?? 0}</span>
                      <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>({openRate}%)</span>
                    </td>
                    <td className="px-4 py-3">
                      <span>{c.replies ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${replyRate}%`, background: 'var(--accent)' }} />
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{replyRate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-semibold">Create Campaign</h2>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Campaign Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Guest Post Outreach Q3"
                className="w-full px-4 py-2 rounded-lg outline-none text-sm"
                style={{ background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
              <button
                onClick={() => createMutation.mutate(name)}
                disabled={!name || createMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
