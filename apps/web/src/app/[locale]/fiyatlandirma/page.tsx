'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Check, X, Minus } from 'lucide-react';
import {
  PLAN_PRICES_TRY,
  DEFAULT_PLAN_LIMITS,
  LOCALE_CURRENCY,
  CURRENCY_SYMBOLS,
  type Locale,
} from '@funbreakseo/shared';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { cn } from '@/lib/utils';

type BillingCycle = 'monthly' | 'yearly';

const CURRENCY_OPTIONS = ['TRY', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'RUB', 'INR'];

interface ApiPlan {
  slug: string;
  monthlyPrice: number;
  yearlyPrice: number;
  displayCurrency: string;
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const formatted = Math.round(amount).toLocaleString(currency === 'TRY' ? 'tr-TR' : 'en-US');
  return currency === 'TRY' ? `${symbol}${formatted}` : `${symbol}${formatted}`;
}

function formatLimitValue(
  value: number | boolean | string,
  t: ReturnType<typeof useTranslations<'pricing'>>
): React.ReactNode {
  if (typeof value === 'boolean') {
    return value ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <X className="h-4 w-4 text-white/20 mx-auto" />;
  }
  if (typeof value === 'number') {
    if (value >= 999999) return <span className="text-emerald-400">{t('unlimited')}</span>;
    return value.toLocaleString();
  }
  if (value === 'FIRST_PAGE') return t('firstPage');
  if (value === 'TOP_100') return 'Top 100';
  return value;
}

export default function PricingPage() {
  const t = useTranslations('pricing');
  const locale = useLocale();
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [currency, setCurrency] = useState<string>(
    LOCALE_CURRENCY[locale as Locale] ?? 'TRY',
  );

  const localePath = (path: string) => locale === 'tr' ? path : `/${locale}${path}`;

  // Canlı kurla dönüştürülmüş plan fiyatları (backend CurrencyRate cache'inden)
  const { data: apiPlans } = useQuery({
    queryKey: ['public-plans', locale, currency],
    queryFn: async () => {
      const { data } = await api.get(`/plans?locale=${locale}&currency=${currency}`);
      return (data?.data ?? data) as ApiPlan[];
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const planBySlug = Array.isArray(apiPlans)
    ? Object.fromEntries(apiPlans.map((p) => [p.slug, p]))
    : {};

  const PLANS: Array<{
    key: string;
    name: string;
    desc: string;
    color: string;
    popular: boolean;
    custom?: boolean;
  }> = [
    { key: 'starter', name: t('starter'), desc: t('starterDesc'), color: 'border-white/10', popular: false },
    { key: 'growth', name: t('growth'), desc: t('growthDesc'), color: 'border-indigo-500/50', popular: true },
    { key: 'pro', name: t('pro'), desc: t('proDesc'), color: 'border-purple-500/30', popular: false },
    { key: 'enterprise', name: t('enterprise'), desc: t('enterpriseDesc'), color: 'border-white/10', popular: false, custom: true },
  ];

  const COMPARISON_ROWS = [
    { label: t('features.projects'), key: 'projects' as const },
    { label: t('features.keywords'), key: 'keywords' as const },
    { label: t('features.crawls'), key: 'monthlyCrawls' as const },
    { label: t('features.blogs'), key: 'aiBlogsPerProject' as const },
    { label: t('features.geo'), key: 'geoQueries' as const },
    { label: t('features.outreach'), key: 'outreachCampaigns' as const },
    { label: t('features.seats'), key: 'teamSeats' as const },
    { label: t('features.reports'), key: 'whitelabelReports' as const },
    { label: t('features.api'), key: 'customerApi' as const },
    { label: t('features.support'), key: 'prioritySupport' as const },
    { label: t('features.tracking'), key: 'trackingDepth' as const },
  ];

  function getPrice(planKey: string): { amount: number; currency: string; yearlyTotal: number } | null {
    const apiPlan = planBySlug[planKey];
    if (apiPlan && (apiPlan.monthlyPrice > 0 || apiPlan.yearlyPrice > 0)) {
      return {
        amount: cycle === 'monthly' ? apiPlan.monthlyPrice : Math.floor(apiPlan.yearlyPrice / 12),
        currency: apiPlan.displayCurrency ?? currency,
        yearlyTotal: apiPlan.yearlyPrice,
      };
    }
    // API'ye ulaşılamazsa TRY sabitleriyle göster
    const prices = PLAN_PRICES_TRY[planKey as keyof typeof PLAN_PRICES_TRY];
    if (!prices || (prices.monthly === 0 && prices.yearly === 0)) return null;
    return {
      amount: cycle === 'monthly' ? prices.monthly : Math.floor(prices.yearly / 12),
      currency: 'TRY',
      yearlyTotal: prices.yearly,
    };
  }

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">{t('title')}</h1>
            <p className="text-lg text-white/50 mb-8">{t('subtitle')}</p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-1.5">
              <button
                onClick={() => setCycle('monthly')}
                className={cn(
                  'rounded-lg px-5 py-2 text-sm font-medium transition-all',
                  cycle === 'monthly' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                )}
              >
                {t('monthly')}
              </button>
              <button
                onClick={() => setCycle('yearly')}
                className={cn(
                  'rounded-lg px-5 py-2 text-sm font-medium transition-all flex items-center gap-2',
                  cycle === 'yearly' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                )}
              >
                {t('yearly')}
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
                  {t('yearlyBadge')}
                </span>
              </button>
            </div>

            {/* Para birimi seçici */}
            <div className="mt-4">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-label="Currency"
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 focus:border-indigo-500/50 focus:outline-none"
                style={{ background: '#1a1a24', colorScheme: 'dark' }}
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {CURRENCY_SYMBOLS[c] ?? ''} {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-20">
            {PLANS.map((plan) => {
              const price = getPrice(plan.key);
              const limits = DEFAULT_PLAN_LIMITS[plan.key as keyof typeof DEFAULT_PLAN_LIMITS];

              return (
                <div
                  key={plan.key}
                  className={cn(
                    'relative rounded-2xl border p-6 flex flex-col',
                    plan.popular ? 'bg-indigo-500/5 shadow-xl shadow-indigo-500/10' : 'bg-white/2',
                    plan.color
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-0.5 text-xs font-bold text-white">
                      {t('mostPopular')}
                    </div>
                  )}

                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-white mb-1">{plan.name}</h2>
                    <p className="text-xs text-white/50 leading-relaxed mb-4">{plan.desc}</p>

                    {plan.custom || !price ? (
                      <div className="text-2xl font-bold text-white">{t('customQuote')}</div>
                    ) : (
                      <>
                        <div className="flex items-end gap-1">
                          <span className="text-4xl font-bold text-white">
                            {formatCurrency(price.amount, price.currency)}
                          </span>
                          <span className="text-white/40 text-sm mb-1">{t('perMonth')}</span>
                        </div>
                        <p className="text-xs text-white/30 mt-1">
                          {t('includedVat')}
                          {cycle === 'yearly' && (
                            <span className="ml-1 text-emerald-400">
                              ({t('yearlyTotal')} {formatCurrency(price.yearlyTotal, price.currency)})
                            </span>
                          )}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Key limits */}
                  <ul className="space-y-2 mb-6 flex-1 text-sm">
                    <li className="flex justify-between">
                      <span className="text-white/50">{t('project')}</span>
                      <span className="text-white font-medium">
                        {limits?.projects >= 999999 ? t('unlimited') : limits?.projects}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-white/50">{t('keywordTracking')}</span>
                      <span className="text-white font-medium">
                        {limits?.keywords >= 999999 ? t('unlimited') : limits?.keywords?.toLocaleString()}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-white/50">{t('geoQuery')}</span>
                      <span className="text-white font-medium">
                        {limits?.geoQueries >= 999999 ? t('unlimited') : limits?.geoQueries}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-white/50">{t('teamMember')}</span>
                      <span className="text-white font-medium">
                        {limits?.teamSeats >= 999999 ? t('unlimited') : limits?.teamSeats}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-white/50">{t('support')}</span>
                      <span className="text-white font-medium text-right text-xs">
                        {plan.key === 'starter'
                          ? t('features.email')
                          : plan.key === 'growth'
                          ? t('features.whatsapp')
                          : plan.key === 'pro'
                          ? t('features.priority')
                          : t('features.dedicated')}
                      </span>
                    </li>
                  </ul>

                  <Link
                    href={plan.custom ? localePath('/iletisim') : localePath('/kayit')}
                    className={cn(
                      'block text-center rounded-xl py-2.5 text-sm font-semibold transition-all',
                      plan.popular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                        : 'border border-white/20 text-white/70 hover:bg-white/10'
                    )}
                  >
                    {plan.custom ? t('contactUs') : t('trialCta')}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Full comparison table */}
          <div className="mb-20">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">{t('compareTitle')}</h2>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-6 py-4 text-white/50 font-medium w-1/3">{t('feature')}</th>
                    {PLANS.map((p) => (
                      <th key={p.key} className={cn('px-4 py-4 text-center font-semibold', p.popular ? 'text-indigo-400' : 'text-white')}>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={row.key} className={cn('border-b border-white/5 hover:bg-white/2 transition-colors', i % 2 === 0 ? '' : 'bg-white/1')}>
                      <td className="px-6 py-3.5 text-white/70">{row.label}</td>
                      {PLANS.map((plan) => {
                        const limits = DEFAULT_PLAN_LIMITS[plan.key as keyof typeof DEFAULT_PLAN_LIMITS];
                        const value = limits?.[row.key as keyof typeof limits];
                        return (
                          <td key={plan.key} className="px-4 py-3.5 text-center text-white/80">
                            {value !== undefined ? formatLimitValue(value as never, t) : <Minus className="h-4 w-4 text-white/20 mx-auto" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">{t('faqTitle')}</h2>
            <div className="space-y-4">
              {(t.raw('faqs') as Array<{ q: string; a: string }>).map((faq, i) => (
                <div key={i} className="rounded-xl border border-white/10 p-5">
                  <h3 className="text-sm font-semibold text-white mb-2">{faq.q}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
