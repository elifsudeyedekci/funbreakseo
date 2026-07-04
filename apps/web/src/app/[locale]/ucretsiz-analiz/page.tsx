'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Search, CheckCircle, AlertCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { publicApi } from '@/lib/api';

interface AuditResult {
  domain: string;
  healthScore: number;
  criticalIssues: Array<{ message: string; category: string }>;
  keywordIdeas: Array<{ keyword: string; volume: number }>;
  geoScore: number;
  summary: string;
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

  const scoreColor = result
    ? result.healthScore >= 80 ? 'text-emerald-400' : result.healthScore >= 60 ? 'text-yellow-400' : 'text-red-400'
    : '';

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
                <p className="text-white/50 text-sm mb-2">{result.domain} — {t('scoreLabel')}</p>
                <div className={`text-7xl font-bold ${scoreColor} mb-2`}>{result.healthScore}</div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden max-w-xs mx-auto mb-3">
                  <div
                    className={`h-full rounded-full ${result.healthScore >= 80 ? 'bg-emerald-500' : result.healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${result.healthScore}%` }}
                  />
                </div>
                <p className="text-white/60 text-sm">{result.summary}</p>
              </div>

              {/* Critical issues */}
              {result.criticalIssues.length > 0 && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                  <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    {t('criticalTitle')} ({result.criticalIssues.length})
                  </h2>
                  <ul className="space-y-2">
                    {result.criticalIssues.slice(0, 5).map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                        <span>{issue.message} <span className="text-xs text-white/30">({issue.category})</span></span>
                      </li>
                    ))}
                    {result.criticalIssues.length > 5 && (
                      <li className="text-xs text-white/30">+{result.criticalIssues.length - 5} {t('moreIssues')}</li>
                    )}
                  </ul>
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

              {/* GEO teaser */}
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
                <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-purple-400">{t('geoTitle')}</span>
                  <span className="text-purple-400 font-bold">{result.geoScore}/100</span>
                </h2>
                <p className="text-xs text-white/50 mb-3">
                  {t('geoHint')}
                </p>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-purple-500" style={{ width: `${result.geoScore}%` }} />
                </div>
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
