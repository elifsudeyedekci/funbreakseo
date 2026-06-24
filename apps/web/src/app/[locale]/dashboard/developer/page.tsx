'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: string;
  createdAt: string;
}

export default function DeveloperPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: keys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/developer/keys').then((r: any) => r.data?.data ?? r.data ?? []),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      api.post('/developer/keys', { name }).then((r: any) => r.data?.data ?? r.data),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKeyValue(data?.key ?? data?.token ?? null);
      setShowCreate(false);
      setKeyName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/developer/keys/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Developer</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage API keys and integrate FunBreakSEO into your workflow.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="https://api.funbreakseo.com/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-sm transition hover:bg-white/5"
            style={{ color: 'var(--accent)', border: '1px solid rgba(91,141,239,0.3)' }}
          >
            API Docs
          </a>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            + Create API Key
          </button>
        </div>
      </div>

      {/* New Key Banner */}
      {newKeyValue && (
        <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(91,141,239,0.08)', border: '1px solid rgba(91,141,239,0.25)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Your new API key — copy it now, it won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 rounded-lg px-3 py-2 text-xs font-mono overflow-x-auto"
              style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {newKeyValue}
            </code>
            <button
              onClick={() => copyToClipboard(newKeyValue, 'new')}
              className="px-3 py-2 rounded-lg text-xs transition hover:opacity-80"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {copiedId === 'new' ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={() => setNewKeyValue(null)} className="px-3 py-2 rounded-lg text-xs" style={{ color: 'var(--text-muted)' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* API Keys Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold">API Keys</h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{(keys ?? []).length} key{(keys ?? []).length !== 1 ? 's' : ''}</span>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Name', 'Key Prefix', 'Scopes', 'Last Used', 'Created', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(keys ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No API keys yet. Create one to get started.
                  </td>
                </tr>
              )}
              {(keys ?? []).map((key) => (
                <tr key={key.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 font-medium">{key.name}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                      {key.prefix}••••••••
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(key.scopes ?? []).map((scope) => (
                        <span key={scope} className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(91,141,239,0.1)', color: 'var(--accent)' }}>
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                    {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteMutation.mutate(key.id)}
                      disabled={deleteMutation.isPending}
                      className="text-xs transition hover:underline disabled:opacity-40"
                      style={{ color: '#ef4444' }}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Docs callout */}
      <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-2xl">📖</div>
        <div className="flex-1">
          <p className="font-medium text-sm">API Documentation</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Full REST API reference with examples, authentication guides, and webhooks.
          </p>
        </div>
        <a
          href="https://api.funbreakseo.com/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90 whitespace-nowrap"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Open Docs
        </a>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-semibold">Create API Key</h2>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Key Name</label>
              <input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Production Integration"
                className="w-full px-4 py-2 rounded-lg outline-none text-sm"
                style={{ background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
              <button
                onClick={() => createMutation.mutate(keyName)}
                disabled={!keyName || createMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {createMutation.isPending ? 'Creating…' : 'Create Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
