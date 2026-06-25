'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Download, Plus, FileText } from 'lucide-react';
import { reportsApi } from '@/lib/api';

const PROJECT_ID = 'current';

interface Report {
  id: string;
  name: string;
  type: string;
  status: 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';
  fileUrl: string | null;
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-yellow-400/10 text-yellow-400',
  GENERATING: 'bg-blue-400/10 text-blue-400',
  READY: 'bg-green-400/10 text-green-400',
  FAILED: 'bg-red-400/10 text-red-400',
};

export default function ReportsPage() {
  const t = useTranslations('reportsPage');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', format: 'PDF', frequency: 'MONTHLY' });

  const statusLabel: Record<string, string> = {
    PENDING: t('statusPending'),
    GENERATING: t('statusGenerating'),
    READY: t('statusReady'),
    FAILED: t('statusFailed'),
  };

  const { data: reports, isLoading, refetch } = useQuery<Report[]>({
    queryKey: ['reports', PROJECT_ID],
    queryFn: () => reportsApi.list(PROJECT_ID).then(r => r.data?.data ?? []),
  });

  const create = useMutation({
    mutationFn: () => reportsApi.generate(PROJECT_ID, { name: form.name, format: form.format, frequency: form.frequency }),
    onSuccess: () => { setShowCreate(false); refetch(); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" /> {t('createBtn')}
        </button>
      </div>

      {showCreate && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-primary)]">{t('formTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={t('namePlaceholder')}
              className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
            <select
              value={form.format}
              onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
              className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="PDF">PDF</option>
              <option value="HTML">HTML</option>
              <option value="JSON">JSON</option>
            </select>
            <select
              value={form.frequency}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
              className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="WEEKLY">{t('freqWeekly')}</option>
              <option value="MONTHLY">{t('freqMonthly')}</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => create.mutate()}
              disabled={!form.name || create.isPending}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
            >
              {create.isPending ? t('creatingBtn') : t('createSubmitBtn')}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-lg text-sm hover:text-[var(--text-primary)] transition-colors"
            >
              {t('cancelBtn')}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !reports?.length ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">{t('empty')}</p>
          <p className="text-sm mt-1">{t('emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[var(--text-muted)]" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{r.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyles[r.status] ?? 'bg-zinc-500/10 text-zinc-400'}`}>
                  {statusLabel[r.status] ?? r.status}
                </span>
                {r.status === 'READY' && r.fileUrl && (
                  <a href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-lg text-xs hover:text-[var(--text-primary)] transition-colors">
                    <Download className="w-3 h-3" /> {t('downloadBtn')}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
