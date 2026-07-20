'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Zap, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface ActionPlan {
  healthScore: number | null;
  autoActions: Array<{ kind: 'CONTENT'; title: string; detail: string; suggestedKeyword?: string }>;
  manualActions: Array<{ category: string; title: string; detail: string; count: number }>;
  contentSuggestions: Array<{ keyword: string; volume: number; suggestedTitle: string }>;
  summary: { autoCount: number; manualCount: number; contentCount: number };
}

interface ExecuteResult {
  queuedContent: Array<{ keyword: string; title: string; contentId?: string; error?: string }>;
  message: string;
}

export function ActionPlanPanel({ projectId }: { projectId: string }) {
  const t = useTranslations('actionPlan');
  const qc = useQueryClient();
  const [result, setResult] = useState<ExecuteResult | null>(null);

  const { data: plan } = useQuery({
    queryKey: ['action-plan', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/action-plan`);
      return (data?.data ?? data) as ActionPlan;
    },
    staleTime: 60_000,
  });

  const execute = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/projects/${projectId}/action-plan/execute`, { maxContent: 3 });
      return (data?.data ?? data) as ExecuteResult;
    },
    onSuccess: (res) => {
      setResult(res);
      qc.invalidateQueries({ queryKey: ['action-plan', projectId] });
    },
  });

  if (!plan) return null;
  const hasAnything = plan.summary.autoCount > 0 || plan.summary.manualCount > 0;
  if (!hasAnything) return null;

  const contentActions = plan.autoActions.filter((a) => a.kind === 'CONTENT');

  return (
    <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-b from-indigo-500/[0.07] to-transparent p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15">
            <Zap className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t('title')}</h2>
            <p className="text-xs text-white/40 mt-0.5">{t('subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => execute.mutate()}
          disabled={execute.isPending || contentActions.length === 0}
          className="sm:ml-auto inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white transition-colors shadow-lg shadow-indigo-500/20"
        >
          {execute.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {execute.isPending ? t('executing') : t('executeBtn')}
        </button>
      </div>

      {result && (
        <div className="mb-5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Otomatik yapılabilecekler */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">{t('autoTitle')}</h3>
            <span className="ml-auto text-xs rounded-full bg-indigo-500/15 text-indigo-300 px-2 py-0.5 font-medium">
              {plan.summary.autoCount}
            </span>
          </div>
          {contentActions.length === 0 ? (
            <p className="text-sm text-white/40">Şu anda önerilen içerik üretimi yok.</p>
          ) : (
            <ul className="space-y-2.5">
              {contentActions.slice(0, 5).map((a, i) => (
                <li key={`c${i}`} className="text-sm">
                  <p className="text-white/80 font-medium">{a.title}</p>
                  <p className="text-xs text-white/40 mt-0.5">{a.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Manuel yapılması gerekenler */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">{t('manualTitle')}</h3>
            <span className="ml-auto text-xs rounded-full bg-amber-500/15 text-amber-300 px-2 py-0.5 font-medium">
              {plan.summary.manualCount}
            </span>
          </div>
          {plan.manualActions.length === 0 ? (
            <p className="text-sm text-white/40">{t('manualEmpty')}</p>
          ) : (
            <ul className="space-y-3">
              {plan.manualActions.map((m, i) => (
                <li key={i} className="text-sm">
                  <p className="text-white/80 font-medium">
                    {m.title} <span className="text-xs text-amber-400/70">({m.count})</span>
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">{m.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
