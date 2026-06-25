import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  ArrowRight,
  Search,
  Brain,
  FileText,
  Link2,
  Mail,
  BarChart2,
  Hash,
  Users,
  Download,
  Globe2,
  Bot,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Features | FunBreak SEO',
  description:
    'All features of the FunBreak SEO platform — technical SEO, GEO/AI visibility, content production, backlink, outreach, rank tracking and more.',
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'seo-tarama': Search,
  'siralama-takibi': BarChart2,
  'anahtar-kelime': Hash,
  'rakip-analizi': Users,
  'geo-ai-gorunurluk': Brain,
  autopilot: Bot,
  'icerik-motoru': FileText,
  'cok-dilli-seo': Globe2,
  'backlink-market': Link2,
  outreach: Mail,
  'white-label': Download,
};

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('ozelliklerPage');

  const categories = [
    {
      label: t('cats.seoAnalysis'),
      color: 'text-indigo-400',
      borderColor: 'border-indigo-500/20',
      features: [
        { slug: 'seo-tarama', tKey: 'seoScan', iconColor: 'text-indigo-400', iconBg: 'bg-indigo-500/12' },
        { slug: 'siralama-takibi', tKey: 'rankTracking', iconColor: 'text-indigo-400', iconBg: 'bg-indigo-500/12' },
        { slug: 'anahtar-kelime', tKey: 'keywordResearch', iconColor: 'text-yellow-400', iconBg: 'bg-yellow-500/12' },
        { slug: 'rakip-analizi', tKey: 'competitorAnalysis', iconColor: 'text-red-400', iconBg: 'bg-red-500/12' },
      ],
    },
    {
      label: t('cats.geoAi'),
      color: 'text-purple-400',
      borderColor: 'border-purple-500/20',
      features: [
        { slug: 'geo-ai-gorunurluk', tKey: 'geoAiVisibility', iconColor: 'text-purple-400', iconBg: 'bg-purple-500/12' },
        { slug: 'autopilot', tKey: 'autopilot', iconColor: 'text-violet-400', iconBg: 'bg-violet-500/12' },
      ],
    },
    {
      label: t('cats.contentProd'),
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
      features: [
        { slug: 'icerik-motoru', tKey: 'aiContent', iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/12' },
        { slug: 'cok-dilli-seo', tKey: 'multilingualSeo', iconColor: 'text-blue-400', iconBg: 'bg-blue-500/12' },
      ],
    },
    {
      label: t('cats.backlinkOutreach'),
      color: 'text-orange-400',
      borderColor: 'border-orange-500/20',
      features: [
        { slug: 'backlink-market', tKey: 'backlinkMarket', iconColor: 'text-orange-400', iconBg: 'bg-orange-500/12' },
        { slug: 'outreach', tKey: 'outreach', iconColor: 'text-rose-400', iconBg: 'bg-rose-500/12' },
      ],
    },
    {
      label: t('cats.reportingAgency'),
      color: 'text-teal-400',
      borderColor: 'border-teal-500/20',
      features: [
        { slug: 'white-label', tKey: 'whiteLabel', iconColor: 'text-teal-400', iconBg: 'bg-teal-500/12' },
      ],
    },
  ];

  const kayitHref = locale === 'tr' ? '/kayit' : `/${locale}/kayit`;

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">

          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm px-4 py-1.5 mb-5">
              <span className="text-xs font-medium text-white/50">{t('badge')}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5 tracking-tight">
              {t('title')}<br />
              <span className="gradient-text">{t('titleHighlight')}</span>
            </h1>
            <p className="text-lg text-white/40 max-w-2xl mx-auto leading-relaxed">
              {t('subtitle')}
            </p>
          </div>

          {/* Feature categories */}
          <div className="space-y-14">
            {categories.map((cat) => (
              <div key={cat.label}>
                <div className="flex items-center gap-3 mb-6">
                  <span className={`text-xs font-semibold uppercase tracking-widest ${cat.color}`}>{cat.label}</span>
                  <div className={`flex-1 h-px bg-gradient-to-r from-current to-transparent opacity-20 ${cat.color}`} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                  {cat.features.map((f) => {
                    const Icon = ICON_MAP[f.slug] ?? FileText;
                    const title = t(`features.${f.tKey}.title` as Parameters<typeof t>[0]);
                    const desc = t(`features.${f.tKey}.desc` as Parameters<typeof t>[0]);
                    const tags = t.raw(`features.${f.tKey}.tags` as Parameters<typeof t>[0]) as string[];
                    const featureHref =
                      locale === 'tr'
                        ? `/ozellikler/${f.slug}`
                        : `/${locale}/ozellikler/${f.slug}`;

                    return (
                      <Link
                        key={f.slug}
                        href={featureHref}
                        className={`group relative rounded-2xl border ${cat.borderColor} bg-white/[0.025] hover:bg-white/[0.045] p-6 transition-all duration-200 hover:-translate-y-0.5`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`flex-shrink-0 inline-flex p-2.5 rounded-xl ${f.iconBg}`}>
                            <Icon className={`h-5 w-5 ${f.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h2 className="text-base font-semibold text-white group-hover:text-white">{title}</h2>
                              <ArrowRight className={`h-4 w-4 ${f.iconColor} opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0`} />
                            </div>
                            <p className="text-sm text-white/40 leading-relaxed mb-4">{desc}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] rounded-full border border-white/8 bg-white/5 px-2.5 py-0.5 text-white/35"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-20 text-center rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-900/20 to-transparent p-12">
            <h2 className="text-2xl font-bold text-white mb-3">{t('cta.title')}</h2>
            <p className="text-white/40 mb-8 max-w-md mx-auto">{t('cta.subtitle')}</p>
            <Link
              href={kayitHref}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white hover:bg-indigo-500 transition-all shadow-[0_0_32px_rgba(99,102,241,0.4)]"
            >
              {t('cta.button')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
