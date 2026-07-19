'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Search, AlertCircle, TrendingUp, ArrowRight, Lock, Sparkles } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { publicApi } from '@/lib/api';
import {
  LetterGradeRing,
  CategoryRingRow,
  SerpPreview,
  PriorityRecommendationList,
  type CategoryRingItem,
} from '@/components/audit';

interface CategoryScore {
  score: number;
  grade: string;
}

interface AuditResult {
  domain: string;
  healthScore: number;
  overallGrade: string;
  categoryScores: {
    onPage: CategoryScore;
    geo: CategoryScore;
    performance: CategoryScore;
    usability: CategoryScore;
    backlink: { locked: true };
  };
  criticalIssues: Array<{ message: string; category: string }>;
  keywordIdeas: Array<{ keyword: string; volume: number }>;
  geoScore: number;
  summary: string;
  serpPreview: { url: string; title: string; description: string } | null;
}

export default function FreeAuditPage() {
  const locale = useLocale();
  const t = useTranslations('freeAudit');
  const searchParams = useSearchParams();
  const localePath = (path: string) => locale === 'tr' ? path : `/${locale}${path}`;

  const [domain, setDomain] = useState(searchParams.get('domain') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const d = searchParams.get('domain');
    if (d) {
      setDomain(d);
      runAudit(d);
    }
  }, []);

  async function runAudit(d?: string) {
    const target = d || domain;
    if (!target.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await publicApi.freeAudit(target.trim().replace(/^https?:\/\//, ''));
      setResult(res.data?.data ?? res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || t('errorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  const categoryRingItems: CategoryRingItem[] = result
    ? [
        { key: 'onPage', label: t('categoryOnPage'), score: result.categoryScores.onPage.score, grade: result.categoryScores.onPage.grade },
        { key: 'geo', label: t('categoryGeo'), score: result.categoryScores.geo.score, grade: result.categoryScores.geo.grade },
        { key: 'performance', label: t('categoryPerformance'), score: result.categoryScores.performance.score, grade: result.categoryScores.performance.grade },
        { key: 'usability', label: t('categoryUsability'), score: result.categoryScores.usability.score, grade: result.categoryScores.usability.grade },
      ]
    : [];

  const upsellBullets = [
    t('upsellRadar'),
    t('upsellBacklink'),
    t('upsellScreenshots'),
    t('upsellCompetitor'),
    t('upsellPdf'),
    t('upsellRecommendations'),
  ];

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">{t('title')}</h1>
            <p className="text-white/50 text-lg">{t('subtitle')}</p>
          </div>

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); runAudit(); }} className="flex gap-2 mb-10">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">https://</span>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-16 pr-4 py-4 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                placeholder="example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="flex-shrink-0 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {t('analyzeBtn')}
            </button>
          </form>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-6">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block h-12 w-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
              <p className="text-white/60">{t('analyzing')}</p>
              <p className="text-white/30 text-sm mt-1">{t('analyzingHint')}</p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-fade-in">
              {/* Score */}
              <div className="rounded-2xl border border-white/10 bg-white/2 p-6 text-center">
                <p className="text-white/50 text-sm mb-4">{result.domain} — {t('scoreLabel')}</p>
                <div className="flex justify-center mb-4">
                  <LetterGradeRing score={result.healthScore} grade={result.overallGrade} size="lg" label={t('gradeLabel')} />
                </div>
                <p className="text-white/60 text-sm max-w-lg mx-auto">{result.summary}</p>
              </div>

              {/* Category rings */}
              <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <CategoryRingRow categories={categoryRingItems} />
                  <div className="flex flex-shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/2 p-4 w-[140px] opacity-70">
                    <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
                      <svg width={96} height={96} viewBox="0 0 96 96">
                        <circle cx={48} cy={48} r={40} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} strokeDasharray="6 6" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="h-6 w-6 text-white/30" />
                      </div>
                    </div>
                    <p className="text-xs text-white/40 text-center leading-tight">{t('categoryBacklink')}</p>
                    <Link
                      href={localePath('/kayit')}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 text-center leading-tight"
                    >
                      {t('backlinkLockedText')}
                    </Link>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3 text-xs text-white/60">
                  {t('geoHint')}
                </div>
              </div>

              {/* SERP preview */}
              {result.serpPreview && (
                <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
                  <h2 className="text-sm font-semibold text-white mb-3">{t('serpPreviewTitle')}</h2>
                  <SerpPreview
                    url={result.serpPreview.url}
                    title={result.serpPreview.title}
                    description={result.serpPreview.description}
                  />
                </div>
              )}

              {/* Critical issues */}
              {result.criticalIssues.length > 0 && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                  <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    {t('criticalTitle')} ({result.criticalIssues.length})
                  </h2>
                  <PriorityRecommendationList
                    items={result.criticalIssues.slice(0, 5).map((issue, i) => ({
                      code: `${issue.category}-${i}`,
                      title: issue.message,
                      category: issue.category,
                      priority: 'MEDIUM' as const,
                      howToFix: '',
                    }))}
                  />
                  {result.criticalIssues.length > 5 && (
                    <p className="text-xs text-white/30 mt-2">+{result.criticalIssues.length - 5} {t('moreIssues')}</p>
                  )}
                </div>
              )}

              {/* Keyword ideas */}
              {result.keywordIdeas.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
                  <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-400" />
                    {t('keywordTitle')}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {result.keywordIdeas.slice(0, 6).map((kw, i) => (
                      <div key={i} className="rounded-lg border border-white/8 bg-white/3 px-3 py-2">
                        <p className="text-xs font-medium text-white">{kw.keyword}</p>
                        <p className="text-[10px] text-white/30">{kw.volume?.toLocaleString('tr-TR')} {t('searchesPerMonth')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Premium upsell */}
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  {t('upsellTitle')}
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {upsellBullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 text-center">
                <h3 className="text-lg font-bold text-white mb-2">{t('ctaTitle')}</h3>
                <p className="text-sm text-white/60 mb-4">
                  {t('ctaText')}
                </p>
                <Link
                  href={localePath('/kayit')}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-all"
                >
                  {t('ctaBtn')} <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-xs text-white/30 mt-2">{t('noCard')}</p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
