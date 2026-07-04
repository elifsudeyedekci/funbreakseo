'use client';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Check, Zap } from 'lucide-react';
import { PLAN_PRICES_TRY, LOCALE_CURRENCY, CURRENCY_SYMBOLS, type Locale } from '@funbreakseo/shared';
import { api } from '@/lib/api';

interface ApiPlan {
  slug: string;
  monthlyPrice: number;
  displayCurrency: string;
}

export function PricingPreview() {
  const t = useTranslations('pricing');
  const locale = useLocale();
  const localePath = (path: string) => (locale === 'tr' ? path : `/${locale}${path}`);

  const currency = LOCALE_CURRENCY[locale as Locale] ?? 'TRY';

  // Fiyatlar ziyaretçinin para biriminde, canlı kurla (fallback: TRY sabitleri)
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

  const displayPrice = (slug: keyof typeof PLAN_PRICES_TRY): string => {
    const apiPlan = planBySlug[slug];
    if (apiPlan && apiPlan.monthlyPrice > 0) {
      const symbol = CURRENCY_SYMBOLS[apiPlan.displayCurrency] ?? apiPlan.displayCurrency;
      return `${symbol}${Math.round(apiPlan.monthlyPrice).toLocaleString(currency === 'TRY' ? 'tr-TR' : 'en-US')}`;
    }
    return `₺${PLAN_PRICES_TRY[slug].monthly.toLocaleString('tr-TR')}`;
  };

  const plans = [
    {
      key: 'starter' as const,
      name: t('starter'),
      features: [`1 ${t('features.projects')}`, `50 ${t('features.keywords')}`, `5 ${t('features.blogs')}`, `25 ${t('features.geo')}`, t('features.email')],
      popular: false,
    },
    {
      key: 'growth' as const,
      name: t('growth'),
      features: [`5 ${t('features.projects')}`, `250 ${t('features.keywords')}`, `25 ${t('features.blogs')}`, `150 ${t('features.geo')}`, `2 ${t('features.outreach')}`, t('features.whatsapp')],
      popular: true,
    },
    {
      key: 'pro' as const,
      name: t('pro'),
      features: [`15 ${t('features.projects')}`, `1.000 ${t('features.keywords')}`, `100 ${t('features.blogs')}`, `750 ${t('features.geo')}`, `10 ${t('features.outreach')}`, t('features.priority'), `API`],
      popular: false,
    },
  ];

  return (
    <section className="relative py-28 px-4 sm:px-6 lg:px-8">
      {/* Section glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-indigo-800/8 blur-[130px]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm px-4 py-1.5 mb-5">
            <span className="text-xs font-medium text-white/50">{t('badge')}</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">{t('title')}</h2>
          <p className="text-white/35 text-lg">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl flex flex-col transition-all duration-300 ${
                plan.popular
                  ? 'border border-indigo-500/40 bg-gradient-to-b from-indigo-500/[0.08] to-white/[0.02] shadow-[0_0_0_1px_rgba(99,102,241,0.15),0_40px_80px_rgba(99,102,241,0.12)] hover:-translate-y-1'
                  : 'border border-white/[0.08] bg-white/[0.025] hover:border-white/15 hover:-translate-y-0.5'
              } p-7`}
            >
              {plan.popular && (
                <>
                  {/* Top gradient line */}
                  <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-indigo-500/80 to-transparent" />
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-indigo-500/40">
                    <Zap className="h-3 w-3" />
                    {t('mostPopular')}
                  </div>
                </>
              )}

              <div className="mb-7">
                <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mt-3">
                  <span className="text-4xl font-bold text-white">{displayPrice(plan.key)}</span>
                  <span className="text-white/25 text-sm mb-1.5">{t('perMonth')}</span>
                </div>
                <p className="text-xs text-white/20 mt-1">{t('includedVat')}</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/55">
                    <Check className={`h-4 w-4 flex-shrink-0 ${plan.popular ? 'text-indigo-400' : 'text-emerald-400'}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={localePath('/kayit')}
                className={`block text-center rounded-xl py-3 text-sm font-semibold transition-all duration-200 ${
                  plan.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_32px_rgba(99,102,241,0.5)]'
                    : 'border border-white/12 text-white/55 hover:bg-white/6 hover:text-white hover:border-white/22'
                }`}
              >
                {t('trialCta')}
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href={localePath('/fiyatlandirma')}
            className="text-sm text-indigo-400/60 hover:text-indigo-300 transition-colors underline underline-offset-4 decoration-indigo-500/30"
          >
            {t('compareAll')}
          </Link>
        </div>
      </div>
    </section>
  );
}
