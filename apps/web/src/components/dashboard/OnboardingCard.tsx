'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, Rocket } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface OnboardingStatus {
  steps: Array<{ step: string; completed: boolean }>;
  percentage: number;
  isComplete: boolean;
}

const STEP_LINKS: Record<string, string> = {
  add_project: '/dashboard/projects',
  connect_gsc: '/dashboard/settings',
  add_keywords: '/dashboard/keywords',
  start_crawl: '/dashboard/crawl',
  generate_content: '/dashboard/content',
};

export function OnboardingCard({ onAddProject }: { onAddProject?: () => void }) {
  const t = useTranslations('onboarding');
  const locale = useLocale();
  const localePath = (path: string) => (locale === 'tr' ? path : `/${locale}${path}`);

  const { data } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: async () => {
      const { data } = await api.get('/onboarding/status');
      return (data?.data ?? data) as OnboardingStatus;
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  if (!data || data.isComplete || !Array.isArray(data.steps)) return null;

  return (
    <div className="mb-8 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/[0.08] to-purple-500/[0.05] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/15">
            <Rocket className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">{t('title')}</h2>
            <p className="text-xs text-white/40 mt-0.5">{t('progress', { pct: data.percentage })}</p>
          </div>
        </div>
        <div className="sm:ml-auto flex-1 sm:max-w-[200px]">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${data.percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {data.steps.map(({ step, completed }) => {
          const label = t(`steps.${step}`);
          const inner = (
            <span
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs transition-colors w-full',
                completed
                  ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400/80'
                  : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-indigo-500/40 hover:text-white',
              )}
            >
              {completed ? (
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
              ) : (
                <Circle className="h-3.5 w-3.5 flex-shrink-0 text-white/25" />
              )}
              <span className={cn(completed && 'line-through opacity-70')}>{label}</span>
            </span>
          );

          if (completed) return <div key={step}>{inner}</div>;

          if (step === 'add_project' && onAddProject) {
            return (
              <button key={step} type="button" onClick={onAddProject} className="text-left">
                {inner}
              </button>
            );
          }

          return (
            <Link key={step} href={localePath(STEP_LINKS[step] ?? '/dashboard/projects')}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
