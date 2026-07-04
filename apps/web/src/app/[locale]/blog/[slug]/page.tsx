import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

interface FaqItem {
  question?: string;
  answer?: string;
  q?: string;
  a?: string;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  bodyHtml?: string;
  content?: string;
  locale?: string;
  publishedAt?: string;
  updatedAt?: string;
  readingMinutes?: number;
  authorName?: string;
  faqSection?: FaqItem[] | null;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
  metaTitle?: string;
  metaDescription?: string;
}

interface BlogListItem {
  slug: string;
  title: string;
  locale?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${API_URL}/public/blog/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const post = json?.data ?? json;
    if (!post?.id) return null;
    return post as BlogPost;
  } catch {
    return null;
  }
}

async function getRelatedPosts(locale: string, excludeSlug: string): Promise<BlogListItem[]> {
  try {
    const res = await fetch(`${API_URL}/public/blog?locale=${locale}&limit=4`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json?.data ?? json;
    const posts: BlogListItem[] = Array.isArray(data) ? data : (data?.data ?? []);
    return posts.filter((p) => p.slug !== excludeSlug).slice(0, 3);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: (post.metaTitle || post.title) + ' | FunBreak SEO Blog',
    description: post.metaDescription || post.excerpt || '',
    openGraph: { type: 'article', publishedTime: post.publishedAt },
  };
}

function getDateLocale(locale: string) {
  const map: Record<string, string> = {
    tr: 'tr-TR', ar: 'ar-SA', hi: 'hi-IN', ru: 'ru-RU',
    de: 'de-DE', es: 'es-ES', fr: 'fr-FR',
  };
  return map[locale] ?? 'en-US';
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug, locale } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const t = await getTranslations('blog');
  const blogHref = locale === 'tr' ? '/blog' : `/${locale}/blog`;
  const related = await getRelatedPosts(post.locale ?? locale, slug);

  // FAQ öğelerini normalize et ({question,answer} veya {q,a})
  const faqs = (Array.isArray(post.faqSection) ? post.faqSection : [])
    .map((f) => ({ q: f.question ?? f.q ?? '', a: f.answer ?? f.a ?? '' }))
    .filter((f) => f.q && f.a);

  // Yapılandırılmış veri: seed'deki jsonLd varsa onu kullan, yoksa Article + FAQPage üret
  const structuredData: Record<string, unknown>[] = [];
  if (post.jsonLd) {
    structuredData.push(...(Array.isArray(post.jsonLd) ? post.jsonLd : [post.jsonLd]));
  } else {
    structuredData.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt ?? undefined,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
      author: { '@type': 'Organization', name: post.authorName ?? 'FunBreak SEO' },
      publisher: { '@type': 'Organization', name: 'FunBreak SEO' },
      mainEntityOfPage: `https://funbreakseo.com/${post.locale ?? locale}/blog/${post.slug}`,
    });
    if (faqs.length > 0) {
      structuredData.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      });
    }
  }

  const dateStr = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(getDateLocale(locale), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const htmlContent = post.bodyHtml || post.content || '';

  return (
    <>
      {structuredData.map((sd, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sd) }}
        />
      ))}
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4">
            <Link href={blogHref} className="text-sm text-indigo-400 hover:text-indigo-300">
              {t('backToBlog')}
            </Link>
          </div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {post.readingMinutes && (
              <span className="text-xs text-white/30">
                {post.readingMinutes} {t('readTime')}
              </span>
            )}
            {dateStr && (
              <>
                <span className="text-xs text-white/30">·</span>
                <span className="text-xs text-white/30">{dateStr}</span>
              </>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-snug">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-lg text-white/60 mb-8 leading-relaxed">{post.excerpt}</p>
          )}
          <div className="rounded-2xl border border-white/10 bg-white/2 h-56 flex items-center justify-center mb-8">
            <span className="text-6xl opacity-20">📝</span>
          </div>
          <div className="prose prose-invert max-w-none">
            {htmlContent ? (
              <div
                className="text-white/70 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            ) : (
              <p className="text-white/40 italic">{post.excerpt}</p>
            )}
          </div>
          {/* FAQ bölümü (FAQPage schema ile eşleşir) */}
          {faqs.length > 0 && (
            <section className="mt-12 pt-8 border-t border-white/10">
              <h2 className="text-xl font-bold text-white mb-5">{t('faqTitle')}</h2>
              <div className="space-y-3">
                {faqs.map((f, i) => (
                  <details key={i} className="group rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4">
                    <summary className="cursor-pointer text-sm font-semibold text-white/80 group-open:text-white list-none flex items-center justify-between">
                      {f.q}
                      <span className="text-white/30 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                    </summary>
                    <p className="mt-3 text-sm text-white/55 leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-sm text-white/40">
              {t('author')}:{' '}
              <span className="text-white/60">
                {post.authorName ?? 'FunBreak SEO'}
              </span>
            </p>
          </div>

          {/* İlgili yazılar */}
          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="text-lg font-bold text-white mb-4">{t('relatedTitle')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`${blogHref}/${r.slug}`}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-indigo-500/40 transition-colors"
                  >
                    <p className="text-sm font-medium text-white/80 line-clamp-3">{r.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Ürün CTA */}
          <div className="mt-12 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-2">{t('ctaTitle')}</h2>
            <p className="text-sm text-white/50 mb-5">{t('ctaText')}</p>
            <Link
              href={locale === 'tr' ? '/ucretsiz-analiz' : `/${locale}/ucretsiz-analiz`}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors"
            >
              {t('ctaBtn')}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
