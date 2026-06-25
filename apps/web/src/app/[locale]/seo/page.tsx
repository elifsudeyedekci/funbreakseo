import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Search, TrendingUp, BarChart2, Link2, FileText, Globe } from 'lucide-react';

const pillarIcons = {
  technical: Search,
  content: FileText,
  offpage: Link2,
  local: Globe,
  analytics: BarChart2,
  geo: TrendingUp,
};

const pillarStyles = {
  technical: { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  content:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  offpage:   { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  local:     { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  analytics: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  geo:       { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seoPage' });
  return {
    title: `${t('title')} ${t('titleHighlight')} | FunBreak SEO`,
    description: t('subtitle'),
  };
}

export default async function SeoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seoPage' });

  const stats = t.raw('stats') as Array<{ value: string; label: string }>;

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          {/* Hero */}
          <div className="text-center mb-16">
            <span className="inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-400 mb-4">
              {t('badge')}
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
              {t('title')}<br />
              <span className="gradient-text">{t('titleHighlight')}</span>
            </h1>
            <p className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
              {t('subtitle')}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {stats.map((s) => (
              <div key={s.value} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-center">
                <div className="text-2xl font-bold gradient-text mb-2">{s.value}</div>
                <p className="text-xs text-white/40 leading-relaxed">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Main content */}
          <article className="prose prose-invert max-w-none mb-16">
            <h2>{t('howTitle')}</h2>
            <p>{t('howBody')}</p>
            <h2>{t('whyTitle')}</h2>
            <p>{t('whyBody')}</p>
            <h2>{t('changedTitle')}</h2>
            <p>{t('changedBody')}</p>
          </article>

          {/* 6 pillars */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">{t('pillarsTitle')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.entries(pillarIcons) as [keyof typeof pillarIcons, typeof Search][]).map(([key, Icon]) => {
                const style = pillarStyles[key];
                return (
                  <div key={key} className={`rounded-2xl border ${style.border} ${style.bg} p-6`}>
                    <div className="inline-flex p-2.5 rounded-xl bg-white/5 mb-4">
                      <Icon className={`h-5 w-5 ${style.color}`} />
                    </div>
                    <h3 className="font-semibold text-white mb-2">{t(`pillars.${key}.title`)}</h3>
                    <p className="text-sm text-white/45 leading-relaxed">{t(`pillars.${key}.desc`)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-900/25 to-transparent p-10 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">{t('ctaTitle')}</h2>
            <p className="text-white/45 mb-8 max-w-lg mx-auto">
              {t('ctaSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/kayit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-[0_0_28px_rgba(99,102,241,0.35)]"
              >
                {t('ctaButton')}
              </Link>
              <Link
                href="/geo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all"
              >
                {t('geoLink')}
              </Link>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
