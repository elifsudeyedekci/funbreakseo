'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CreditCard, Download, AlertCircle } from 'lucide-react';
import { billingApi } from '@/lib/api';
import { PLAN_PRICES_TRY, DEFAULT_PLAN_LIMITS } from '@funbreakseo/shared';
import { formatDate } from '@/lib/utils';
import type { SubscriptionStatus } from '@funbreakseo/shared';

function UsageBar({ label, used, limit, unlimited }: { label: string; used: number; limit: number; unlimited: string }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="text-white/60">{label}</span>
        <span className="text-white/40">
          {used.toLocaleString()} / {limit >= 999999 ? unlimited : limit.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-orange-500' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const locale = useLocale();
  const t = useTranslations('billingPage');
  const localePath = (path: string) => locale === 'tr' ? path : `/${locale}${path}`;

  const STATUS_LABELS: Record<SubscriptionStatus, { label: string; color: string }> = {
    TRIALING: { label: t('statusTrialing'), color: 'bg-blue-500/20 text-blue-400' },
    ACTIVE: { label: t('statusActive'), color: 'bg-emerald-500/20 text-emerald-400' },
    PAST_DUE: { label: t('statusPastDue'), color: 'bg-red-500/20 text-red-400' },
    SUSPENDED: { label: t('statusSuspended'), color: 'bg-orange-500/20 text-orange-400' },
    CANCELED: { label: t('statusCanceled'), color: 'bg-white/10 text-white/40' },
  };

  const { data, isLoading } = useQuery({
    queryKey: ['billing'],
    queryFn: async () => {
      const [sub, usage, invoices, wallet] = await Promise.all([
        billingApi.subscription(),
        billingApi.usage(),
        billingApi.invoices({ limit: 10 }),
        billingApi.wallet(),
      ]);
      return {
        subscription: sub.data.data,
        usage: usage.data.data,
        invoices: invoices.data.data || [],
        wallet: wallet.data.data,
      };
    },
  });

  const subscription = data?.subscription as {
    planKey: string;
    status: SubscriptionStatus;
    billingCycle: 'MONTHLY' | 'YEARLY';
    currentPeriodEnd: string;
    trialEndsAt?: string;
  } | undefined;

  const usage = data?.usage as {
    keywords: { used: number; limit: number };
    crawls: { used: number; limit: number };
    aiBlogs: { used: number; limit: number };
    geoQueries: { used: number; limit: number };
  } | undefined;

  const invoices = (data?.invoices || []) as Array<{
    id: string; amount: number; currency: string; status: string; dueDate: string; pdfUrl: string;
  }>;

  const planKey = subscription?.planKey || 'starter';
  const limits = DEFAULT_PLAN_LIMITS[planKey as keyof typeof DEFAULT_PLAN_LIMITS];
  const prices = PLAN_PRICES_TRY[planKey as keyof typeof PLAN_PRICES_TRY];
  const status = subscription?.status;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('title')}</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 h-40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current plan */}
          <div className="rounded-2xl border border-white/10 bg-white/2 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-white/40 mb-1">{t('currentPlan')}</p>
                <h2 className="text-xl font-bold text-white capitalize">{planKey}</h2>
                {status && (
                  <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[status]?.color}`}>
                    {STATUS_LABELS[status]?.label}
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {!prices || (prices.monthly === 0 && prices.yearly === 0)
                    ? t('custom')
                    : `₺${(subscription?.billingCycle === 'YEARLY' ? prices?.yearly : prices?.monthly)?.toLocaleString()}`}
                </div>
                <div className="text-xs text-white/30">{subscription?.billingCycle === 'YEARLY' ? t('perYear') : t('perMonth')}</div>
              </div>
            </div>

            {subscription?.currentPeriodEnd && (
              <p className="text-xs text-white/40 mb-4">
                {t('nextRenewal', { date: formatDate(subscription.currentPeriodEnd) })}
              </p>
            )}

            {subscription?.trialEndsAt && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 mb-4">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <p className="text-xs text-blue-300">
                  {t('trialEnds', { date: formatDate(subscription.trialEndsAt) })}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Link
                href={localePath('/fiyatlandirma')}
                className="flex-1 text-center rounded-xl border border-white/20 py-2 text-xs font-medium text-white/60 hover:bg-white/10 transition-colors"
              >
                {t('changePlan')}
              </Link>
              <button className="flex-1 rounded-xl border border-red-500/20 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors">
                {t('cancelSub')}
              </button>
            </div>
          </div>

          {/* Usage quotas */}
          <div className="rounded-2xl border border-white/10 bg-white/2 p-6">
            <h2 className="text-sm font-semibold text-white mb-4">{t('usageQuotas')}</h2>
            <div className="space-y-4">
              <UsageBar label={t('usageKeywords')} used={usage?.keywords?.used || 0} limit={limits?.keywords || 50} unlimited={t('unlimited')} />
              <UsageBar label={t('usageCrawls')} used={usage?.crawls?.used || 0} limit={limits?.monthlyCrawls || 5} unlimited={t('unlimited')} />
              <UsageBar label={t('usageAiBlogs')} used={usage?.aiBlogs?.used || 0} limit={limits?.aiBlogsPerProject || 5} unlimited={t('unlimited')} />
              <UsageBar label={t('usageGeoQueries')} used={usage?.geoQueries?.used || 0} limit={limits?.geoQueries || 25} unlimited={t('unlimited')} />
            </div>
          </div>

          {/* Wallet */}
          <div className="rounded-2xl border border-white/10 bg-white/2 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">{t('wallet')}</h2>
              <CreditCard className="h-4 w-4 text-white/30" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              ₺{((data?.wallet as { balance?: number })?.balance || 0).toLocaleString()}
            </div>
            <p className="text-xs text-white/40 mb-4">{t('balance')}</p>
            <button className="w-full rounded-xl border border-indigo-500/30 py-2 text-xs font-medium text-indigo-400 hover:bg-indigo-500/10 transition-colors">
              {t('addBalance')}
            </button>
          </div>

          {/* Invoices */}
          <div className="rounded-2xl border border-white/10 bg-white/2 p-6">
            <h2 className="text-sm font-semibold text-white mb-4">{t('recentInvoices')}</h2>
            {invoices.length === 0 ? (
              <p className="text-sm text-white/30">{t('noInvoices')}</p>
            ) : (
              <div className="space-y-2">
                {invoices.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-white/5">
                    <div>
                      <p className="text-xs font-medium text-white">{formatDate(inv.dueDate)}</p>
                      <p className="text-[10px] text-white/30">{inv.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        ₺{inv.amount.toLocaleString()}
                      </span>
                      {inv.pdfUrl && (
                        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer"
                          className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
