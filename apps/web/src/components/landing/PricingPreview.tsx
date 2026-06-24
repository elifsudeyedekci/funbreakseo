import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Check } from 'lucide-react';
import { PLAN_PRICES_TRY } from '@funbreakseo/shared';

export function PricingPreview() {
  const t = useTranslations('pricing');
  const locale = useLocale();
  const localePath = (path: string) => locale === 'tr' ? path : `/${locale}${path}`;

  const plans = [
    {
      key: 'starter',
      name: t('starter'),
      price: PLAN_PRICES_TRY.starter.monthly,
      features: ['1 proje', '50 kelime', '5 AI blog', '25 GEO sorgu', 'E-posta destek'],
      popular: false,
    },
    {
      key: 'growth',
      name: t('growth'),
      price: PLAN_PRICES_TRY.growth.monthly,
      features: ['5 proje', '250 kelime', '25 AI blog', '150 GEO sorgu', '2 outreach kampanya', 'E-posta + WhatsApp'],
      popular: true,
    },
    {
      key: 'pro',
      name: t('pro'),
      price: PLAN_PRICES_TRY.pro.monthly,
      features: ['15 proje', '1.000 kelime', '100 AI blog', '750 GEO sorgu', '10 kampanya', 'Öncelikli destek', 'API erişimi'],
      popular: false,
    },
  ];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('title')}</h2>
          <p className="text-white/50 text-lg">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl border p-6 ${
                plan.popular
                  ? 'border-indigo-500/50 bg-indigo-500/5 shadow-xl shadow-indigo-500/10'
                  : 'border-white/10 bg-white/2'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-0.5 text-xs font-semibold text-white">
                  {t('mostPopular')}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-white">₺{plan.price}</span>
                  <span className="text-white/40 text-sm mb-1">{t('perMonth')}</span>
                </div>
                <p className="text-xs text-white/30 mt-1">{t('includedVat')}</p>
              </div>

              <ul className="space-y-2.5 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                    <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={localePath('/kayit')}
                className={`block text-center rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  plan.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                    : 'border border-white/20 text-white/70 hover:bg-white/10'
                }`}
              >
                {t('trialCta')}
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href={localePath('/fiyatlandirma')}
            className="text-sm text-indigo-400 hover:text-indigo-300 underline transition-colors"
          >
            Tüm özellikleri ve Kurumsal planı karşılaştır →
          </Link>
        </div>
      </div>
    </section>
  );
}
