'use client';
import { useTranslations } from 'next-intl';
import { TrendingUp } from 'lucide-react';

const CASE_COLORS = ['from-blue-500/20', 'from-purple-500/20', 'from-emerald-500/20'];

export function CaseStudiesSection() {
  const t = useTranslations('caseStudies');
  const items = t.raw('items') as Array<{ company: string; industry: string; result: string; detail: string }>;

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('title')}</h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((c, i) => (
            <div
              key={i}
              className={`rounded-2xl border border-white/10 bg-gradient-to-b ${CASE_COLORS[i % CASE_COLORS.length]} to-transparent p-6`}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-white/10">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-xs text-white/40 uppercase tracking-wide">{c.industry}</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">{c.company}</h3>
              <p className="text-2xl font-bold gradient-text mb-2">{c.result}</p>
              <p className="text-sm text-white/50">{c.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
