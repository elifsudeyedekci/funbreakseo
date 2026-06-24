'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function HeroSection() {
  const t = useTranslations('hero');
  const locale = useLocale();
  const router = useRouter();
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);

  const localePath = (path: string) =>
    locale === 'tr' ? path : `/${locale}${path}`;

  async function handleAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    setLoading(true);
    router.push(`${localePath('/ucretsiz-analiz')}?domain=${encodeURIComponent(domain.trim())}`);
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute top-3/4 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 mb-8">
          <Zap className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-xs font-medium text-indigo-300">{t('badge')}</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white leading-tight mb-6">
          {t('title')}{' '}
          <span className="gradient-text">{t('titleHighlight')}</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto max-w-2xl text-lg sm:text-xl text-white/60 mb-10 leading-relaxed">
          {t('subtitle')}
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href={localePath('/kayit')}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white hover:bg-indigo-500 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
          >
            {t('cta')}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={localePath('/ucretsiz-analiz')}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-all"
          >
            {t('ctaSecondary')}
          </Link>
        </div>

        <p className="text-xs text-white/30 mb-12">{t('freeTrial')}</p>

        {/* Free audit box */}
        <div className="mx-auto max-w-xl">
          <p className="text-sm font-medium text-white/50 mb-3">{t('freeAudit')}</p>
          <form onSubmit={handleAudit} className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">https://</span>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder={t('freeAuditPlaceholder')}
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-16 pr-4 py-3.5 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                t('freeAuditBtn')
              )}
            </button>
          </form>
        </div>

        {/* Trust indicators */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 opacity-40">
          {['500+', '1M+', '50M+'].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-bold text-white">{stat}</div>
              <div className="text-xs text-white/60 mt-0.5">
                {['Aktif proje', 'Takip edilen kelime', 'Analiz edilen sayfa'][i]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
