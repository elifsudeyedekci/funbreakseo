'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Play, AlertCircle, AlertTriangle, Info, RefreshCw, Download } from 'lucide-react';
import { auditApi } from '@/lib/api';
import { cn, exportToCSV } from '@/lib/utils';
import type { IssueSeverity, IssueCategory } from '@funbreakseo/shared';

interface AuditIssue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  message: string;
  url?: string;
  count: number;
  howToFix?: string;
}

interface AuditData {
  id: string;
  healthScore: number;
  crawledPages: number;
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  noticeCount: number;
  issues: AuditIssue[];
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  completedAt?: string;
}

export default function AuditPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslations('auditPage');
  const [selectedIssue, setSelectedIssue] = useState<AuditIssue | null>(null);
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'ALL'>('ALL');

  const SEVERITY_CONFIG = {
    CRITICAL: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: t('critical') },
    WARNING: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', label: t('warning') },
    NOTICE: { icon: Info, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: t('notice') },
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit', projectId],
    queryFn: () => auditApi.get(projectId).then((r) => (r.data?.data ?? []) as AuditData),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'RUNNING' || status === 'PENDING' ? 3000 : false;
    },
  });

  const crawlMutation = useMutation({
    mutationFn: () => auditApi.start(projectId),
    onSuccess: () => refetch(),
  });

  const audit = data;
  const isRunning = audit?.status === 'RUNNING' || audit?.status === 'PENDING';

  const filteredIssues = (audit?.issues || []).filter(
    (i) => severityFilter === 'ALL' || i.severity === severityFilter
  );

  const r = 56;
  const c = 2 * Math.PI * r;
  const score = audit?.healthScore ?? 0;
  const offset = c - (score / 100) * c;
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
          <p className="text-white/50 text-sm mt-1">
            {audit?.completedAt
              ? t('lastScan', { date: new Date(audit.completedAt).toLocaleString() })
              : t('noScan')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(audit?.issues?.length ?? 0) > 0 && (
            <button
              onClick={() => exportToCSV(
                (audit?.issues ?? []).map((i) => ({
                  severity: i.severity,
                  category: i.category,
                  message: i.message,
                  url: i.url ?? '',
                  count: i.count,
                })),
                [
                  { key: 'severity', label: 'Önem' },
                  { key: 'category', label: 'Kategori' },
                  { key: 'message', label: 'Sorun' },
                  { key: 'url', label: 'URL' },
                  { key: 'count', label: 'Sayı' },
                ],
                'seo-sorunlari.csv'
              )}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 transition-all"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
          )}
        <button
          onClick={() => crawlMutation.mutate()}
          disabled={isRunning || crawlMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              {t('scanning')}
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              {t('startScan')}
            </>
          )}
        </button>
        </div>
      </div>

      {/* Score + summary */}
      {audit && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Score ring */}
          <div className="rounded-2xl border border-white/10 bg-white/2 p-5 flex flex-col items-center justify-center">
            <svg className="h-36 w-36 -rotate-90" viewBox="0 0 144 144">
              <circle cx="72" cy="72" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              <circle
                cx="72" cy="72" r={r}
                fill="none"
                stroke={scoreColor}
                strokeWidth="10"
                strokeDasharray={c}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            <div className="text-center -mt-24">
              <div className="text-5xl font-bold text-white">{score}</div>
              <div className="text-xs text-white/40 mt-1">{t('healthScore')}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t('crawledPages'), value: audit.crawledPages, color: 'indigo' },
              { label: t('totalIssues'), value: audit.totalIssues, color: 'white' },
              { label: t('critical'), value: audit.criticalCount, color: 'red' },
              { label: t('warning'), value: audit.warningCount, color: 'orange' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/2 p-4 text-center">
                <div className={`text-3xl font-bold ${
                  s.color === 'red' ? 'text-red-400' :
                  s.color === 'orange' ? 'text-orange-400' :
                  s.color === 'indigo' ? 'text-indigo-400' : 'text-white'
                }`}>{s.value}</div>
                <div className="text-xs text-white/40 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues list */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white">{t('issuesTitle')}</h2>
          <div className="flex gap-2 ml-auto">
            {(['ALL', 'CRITICAL', 'WARNING', 'NOTICE'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setSeverityFilter(f)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  severityFilter === f ? 'bg-indigo-600 text-white' : 'border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                )}
              >
                {f === 'ALL' ? t('allFilter') : SEVERITY_CONFIG[f].label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/10 h-16 animate-pulse" />
            ))}
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="rounded-2xl border border-white/10 p-8 text-center text-white/30">
            {audit ? t('noIssuesFilter') : t('startScanPrompt')}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredIssues.map((issue) => {
              const config = SEVERITY_CONFIG[issue.severity];
              const Icon = config.icon;
              return (
                <div
                  key={issue.id}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-4 cursor-pointer hover:brightness-110 transition-all',
                    config.bg
                  )}
                  onClick={() => setSelectedIssue(selectedIssue?.id === issue.id ? null : issue)}
                >
                  <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{issue.message}</span>
                      <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">{issue.category}</span>
                      {issue.count > 1 && (
                        <span className="text-xs text-white/30 ml-auto flex-shrink-0">{t('affectedPages', { count: issue.count })}</span>
                      )}
                    </div>
                    {issue.url && (
                      <p className="text-xs text-white/30 mt-0.5 truncate">{issue.url}</p>
                    )}
                    {selectedIssue?.id === issue.id && issue.howToFix && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs font-semibold text-white/60 mb-1">{t('howToFix')}</p>
                        <p className="text-xs text-white/50 leading-relaxed">{issue.howToFix}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
