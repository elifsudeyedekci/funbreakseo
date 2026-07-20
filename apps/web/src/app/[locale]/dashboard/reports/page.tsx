'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Download, Plus, FileText, BarChart3, TrendingUp } from 'lucide-react';
import { api, reportsApi } from '@/lib/api';
import { useSelectedProject } from '@/lib/useSelectedProject';

async function downloadPdf(url: string, filename: string, setBusy: (v: boolean) => void) {
  setBusy(true);
  try {
    const res = await api.get(url, { responseType: 'blob', timeout: 120000 });
    const contentType = (res.headers['content-type'] as string) ?? 'application/pdf';
    const blob = new Blob([res.data], { type: contentType });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = contentType.includes('pdf') ? filename : filename.replace(/\.pdf$/, '.html');
    a.click();
    URL.revokeObjectURL(objectUrl);
  } finally {
    setBusy(false);
  }
}

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
  const [monthlyBusy, setMonthlyBusy] = useState(false);
  const [keywordBusy, setKeywordBusy] = useState(false);

  const statusLabel: Record<string, string> = {
    PENDING: t('statusPending'),
    GENERATING: t('statusGenerating'),
    READY: t('statusReady'),
    FAILED: t('statusFailed'),
  };

  const { projectId } = useSelectedProject();

  const { data: reports, isLoading, refetch } = useQuery<Report[]>({
    queryKey: ['reports', projectId],
    enabled: !!projectId,
    queryFn: () => reportsApi.list(projectId!).then(r => {
      const raw: any[] = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      return raw.map((rec: any) => ({
        id: rec.id,
        name: rec.data?.project?.name ? `${rec.data.project.name} — ${rec.format}` : `Rapor (${rec.format ?? 'JSON'})`,
        type: rec.format ?? 'JSON',
        status: 'READY' as Report['status'],
        fileUrl: null,
        createdAt: rec.createdAt,
      }));
    }),
  });

  const create = useMutation({
    mutationFn: () => reportsApi.generate(projectId!, { name: form.name, format: form.format, frequency: form.frequency }),
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

      {/* Profesyonel hazır raporlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.06] p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-[var(--text-primary)]">{t('monthlyPdfTitle')}</h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] flex-1 mb-4">{t('monthlyPdfDesc')}</p>
          <button
            onClick={() => projectId && downloadPdf(`/projects/${projectId}/reports/site-audit-pdf`, `funbreakseo-site-denetimi.pdf`, setMonthlyBusy)}
            disabled={!projectId || monthlyBusy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            {monthlyBusy ? (
              <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {monthlyBusy ? t('generating') : t('monthlyPdfBtn')}
          </button>
        </div>

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-[var(--text-primary)]">{t('keywordPdfTitle')}</h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] flex-1 mb-4">{t('keywordPdfDesc')}</p>
          <button
            onClick={() => projectId && downloadPdf(`/projects/${projectId}/reports/keywords-pdf`, `funbreakseo-kelime-raporu.pdf`, setKeywordBusy)}
            disabled={!projectId || keywordBusy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            {keywordBusy ? (
              <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {keywordBusy ? t('generating') : t('keywordPdfBtn')}
          </button>
        </div>
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
                {r.status === 'READY' && (
                  <button
                    onClick={() => reportsApi.get(projectId!, r.id).then(res => {
                      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `${r.name}.json`; a.click();
                      URL.revokeObjectURL(url);
                    })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-lg text-xs hover:text-[var(--text-primary)] transition-colors">
                    <Download className="w-3 h-3" /> {t('downloadBtn')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
