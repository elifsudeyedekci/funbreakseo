import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ArrowLeft, TrendingUp } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface CaseStudyDetail {
  slug: string;
  title: string;
  clientName: string;
  industry?: string | null;
  summary?: string | null;
  resultsJson?: Record<string, string> | null;
  bodyMarkdown?: string | null;
  coverImageUrl?: string | null;
  locale: string;
  updatedAt?: string;
}

async function fetchCaseStudy(slug: string): Promise<CaseStudyDetail | null> {
  try {
    const res = await fetch(`${API_URL}/public/case-studies/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data ?? json;
    return data && data.slug ? data : null;
  } catch {
    return null;
  }
}

// Minimal, güvenli markdown → HTML (başlık, kalın, liste, paragraf)
function renderMarkdown(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const blocks = md.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('### ')) return `<h3>${inline(escape(trimmed.slice(4)))}</h3>`;
      if (trimmed.startsWith('## ')) return `<h2>${inline(escape(trimmed.slice(3)))}</h2>`;
      if (trimmed.startsWith('# ')) return `<h2>${inline(escape(trimmed.slice(2)))}</h2>`;
      if (/^[-*] /m.test(trimmed)) {
        const items = trimmed
          .split('\n')
          .filter((l) => /^[-*] /.test(l.trim()))
          .map((l) => `<li>${inline(escape(l.trim().slice(2)))}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${inline(escape(trimmed))}</p>`;
    })
    .join('\n');

  function inline(s: string): string {
    return s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cs = await fetchCaseStudy(slug);
  if (!cs) return { title: 'FunBreak SEO' };
  return {
    title: `${cs.title} | FunBreak SEO`,
    description: cs.summary ?? undefined,
  };
}

export default async function CaseStudyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const cs = await fetchCaseStudy(slug);
  if (!cs) notFound();

  const t = await getTranslations({ locale, namespace: 'caseStudies' });
  const results =
    cs.resultsJson && typeof cs.resultsJson === 'object' ? Object.entries(cs.resultsJson) : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: cs.title,
    description: cs.summary ?? undefined,
    author: { '@type': 'Organization', name: 'FunBreak SEO' },
    publisher: { '@type': 'Organization', name: 'FunBreak SEO' },
    dateModified: cs.updatedAt,
    mainEntityOfPage: `https://funbreakseo.com/${locale}/vaka-calismalari/${cs.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/${locale}/vaka-calismalari`}
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> {t('backToList')}
          </Link>

          <div className="mb-10">
            {cs.industry && (
              <span className="text-xs text-indigo-400 uppercase tracking-wide">{cs.industry}</span>
            )}
            <h1 className="text-3xl sm:text-4xl font-bold text-white mt-2 mb-3 tracking-tight">{cs.title}</h1>
            <p className="text-white/40">{cs.clientName}</p>
          </div>

          {results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
              {results.map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                  <TrendingUp className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xl font-bold gradient-text">{String(value)}</p>
                  <p className="text-xs text-white/40 mt-1">{key}</p>
                </div>
              ))}
            </div>
          )}

          {cs.summary && <p className="text-lg text-white/60 leading-relaxed mb-10">{cs.summary}</p>}

          {cs.bodyMarkdown && (
            <article
              className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-white/60 prose-li:text-white/60 prose-strong:text-white"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(cs.bodyMarkdown) }}
            />
          )}

          <div className="mt-16 text-center rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-10">
            <h2 className="text-2xl font-bold text-white mb-3">{t('ctaTitle')}</h2>
            <p className="text-white/50 mb-6">{t('ctaSubtitle')}</p>
            <Link
              href={`/${locale}/ucretsiz-analiz`}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors"
            >
              {t('ctaButton')}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
