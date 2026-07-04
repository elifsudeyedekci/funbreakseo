import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { TrendingUp, ArrowRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface CaseStudy {
  slug: string;
  title: string;
  clientName: string;
  industry?: string | null;
  summary?: string | null;
  resultsJson?: Record<string, string> | null;
  locale: string;
}

async function fetchCaseStudies(locale: string): Promise<CaseStudy[]> {
  try {
    const res = await fetch(`${API_URL}/public/case-studies?locale=${locale}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json?.data ?? json;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'caseStudies' });
  return {
    title: `${t('title')} | FunBreak SEO`,
    description: t('subtitle'),
  };
}

const CARD_GRADIENTS = ['from-blue-500/20', 'from-purple-500/20', 'from-emerald-500/20'];

export default async function CaseStudiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'caseStudies' });
  const apiStudies = await fetchCaseStudies(locale);

  const fallbackItems = t.raw('items') as Array<{
    company: string;
    industry: string;
    result: string;
    detail: string;
  }>;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('title'),
    description: t('subtitle'),
    url: `https://funbreakseo.com/${locale}/vaka-calismalari`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">{t('title')}</h1>
            <p className="text-white/50 text-lg max-w-xl mx-auto">{t('subtitle')}</p>
          </div>

          {apiStudies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {apiStudies.map((cs, i) => {
                const results = cs.resultsJson && typeof cs.resultsJson === 'object'
                  ? Object.values(cs.resultsJson).slice(0, 1)
                  : [];
                return (
                  <Link
                    key={cs.slug}
                    href={`/${locale}/vaka-calismalari/${cs.slug}`}
                    className={`group rounded-2xl border border-white/10 bg-gradient-to-b ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]} to-transparent p-7 transition-colors hover:border-white/25`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-lg bg-white/10">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      </div>
                      {cs.industry && (
                        <span className="text-xs text-white/40 uppercase tracking-wide">{cs.industry}</span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-1">{cs.title}</h2>
                    <p className="text-sm text-white/40 mb-3">{cs.clientName}</p>
                    {results.length > 0 && (
                      <p className="text-2xl font-bold gradient-text mb-2">{results[0]}</p>
                    )}
                    {cs.summary && <p className="text-sm text-white/50 line-clamp-3">{cs.summary}</p>}
                    <span className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-400 group-hover:gap-2 transition-all">
                      {t('readMore')} <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {fallbackItems.map((c, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border border-white/10 bg-gradient-to-b ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]} to-transparent p-6`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-white/10">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span className="text-xs text-white/40 uppercase tracking-wide">{c.industry}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-white mb-1">{c.company}</h2>
                  <p className="text-2xl font-bold gradient-text mb-2">{c.result}</p>
                  <p className="text-sm text-white/50">{c.detail}</p>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-20 text-center rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-10">
            <h2 className="text-2xl font-bold text-white mb-3">{t('ctaTitle')}</h2>
            <p className="text-white/50 mb-6 max-w-lg mx-auto">{t('ctaSubtitle')}</p>
            <Link
              href={`/${locale}/ucretsiz-analiz`}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors"
            >
              {t('ctaButton')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
