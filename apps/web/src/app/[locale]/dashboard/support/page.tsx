'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '@/lib/api';

const ticketStatusStyles: Record<string, string> = {
  OPEN: 'bg-green-400/10 text-green-400',
  PENDING: 'bg-yellow-400/10 text-yellow-400',
  ON_HOLD: 'bg-orange-400/10 text-orange-400',
  CLOSED: 'bg-white/10 text-[var(--text-muted)]',
};

export default function SupportPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const qc = useQueryClient();

  interface Ticket {
    id: string;
    ticketNumber?: string;
    subject: string;
    status: string;
    latestMessage?: string;
    updatedAt?: string;
    createdAt?: string;
    lastReplyAt?: string;
  }

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ['support-tickets'],
    queryFn: () => supportApi.list().then((r) => (r.data?.data || []) as Ticket[]),
  });

  const createMutation = useMutation({
    mutationFn: (data: { subject: string; message: string }) => supportApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
      setShowCreate(false);
      setSubject('');
      setMessage('');
    },
  });

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Submit and track your support tickets.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          + New Ticket
        </button>
      </div>

      {/* Status Summary */}
      {!isLoading && (tickets ?? []).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(['OPEN', 'PENDING', 'ON_HOLD', 'CLOSED'] as const).map((status) => {
            const count = (tickets ?? []).filter((t) => t.status === status).length;
            return (
              <div key={status} className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{status.replace('_', ' ')}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket List */}
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
                {['#', 'Subject', 'Status', 'Last Reply', 'Created'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(tickets ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No tickets yet. Create one if you need help.
                  </td>
                </tr>
              )}
              {(tickets ?? []).map((ticket) => (
                <tr
                  key={ticket.id}
                  className="hover:bg-white/[0.02] transition cursor-pointer"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>#{ticket.ticketNumber ?? ticket.id?.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{ticket.subject}</p>
                    {ticket.latestMessage && (
                      <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: 'var(--text-muted)' }}>
                        {ticket.latestMessage}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ticketStatusStyles[ticket.status] ?? ''}`}>
                      {ticket.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {ticket.lastReplyAt ? new Date(ticket.lastReplyAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Ticket Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-semibold">Create Support Ticket</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  className="w-full px-4 py-2 rounded-lg outline-none text-sm"
                  style={{ background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Describe your issue in detail..."
                  className="w-full px-4 py-2 rounded-lg outline-none text-sm resize-none"
                  style={{ background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            {createMutation.isError && (
              <p className="text-xs text-red-400">Failed to create ticket. Please try again.</p>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate({ subject, message })}
                disabled={!subject || !message || createMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {createMutation.isPending ? 'Submitting…' : 'Submit Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
