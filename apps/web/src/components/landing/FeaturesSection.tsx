import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import {
  Search, FileText, Brain, Link2, Mail, BarChart2, ArrowRight
} from 'lucide-react';

const FEATURE_ICONS = [Search, FileText, Brain, Link2, Mail, BarChart2];
const FEATURE_SLUGS = [
  'seo-tarama',
  'icerik-motoru',
  'geo-ai-gorunurluk',
  'backlink-market',
  'outreach',
  'siralama-takibi',
];
const FEATURE_COLORS = [
  'from-blue-500/20 to-indigo-500/10 border-blue-500/20',
  'from-emerald-500/20 to-teal-500/10 border-emerald-500/20',
  'from-purple-500/20 to-violet-500/10 border-purple-500/20',
  'from-orange-500/20 to-amber-500/10 border-orange-500/20',
  'from-rose-500/20 to-pink-500/10 border-rose-500/20',
  'from-cyan-500/20 to-sky-500/10 border-cyan-500/20',
];
const ICON_COLORS = [
  'text-blue-400',
  'text-emerald-400',
  'text-purple-400',
  'text-orange-400',
  'text-rose-400',
  'text-cyan-400',
];
const FEATURE_KEYS = ['seo', 'content', 'geo', 'backlink', 'outreach', 'rank'] as const;

export function FeaturesSection() {
  const t = useTranslations('features');
  const locale = useLocale();

  const localePath = (path: string) =>
    locale === 'tr' ? path : `/${locale}${path}`;

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8" id="ozellikler">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURE_KEYS.map((key, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <Link
                key={key}
                href={localePath(`/ozellikler/${FEATURE_SLUGS[i]}`)}
                className={`group relative rounded-2xl border bg-gradient-to-br ${FEATURE_COLORS[i]} p-6 transition-all hover:-translate-y-1 hover:shadow-2xl`}
              >
                <div className={`inline-flex p-2.5 rounded-xl bg-white/5 mb-4 ${ICON_COLORS[i]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {t(`${key}.title`)}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {t(`${key}.desc`)}
                </p>
                <div className={`mt-4 flex items-center gap-1 text-xs font-medium ${ICON_COLORS[i]} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Daha fazla bilgi <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
