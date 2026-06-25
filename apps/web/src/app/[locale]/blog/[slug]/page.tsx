import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  bodyHtml?: string;
  content?: string;
  locale?: string;
  publishedAt?: string;
  readingMinutes?: number;
  authorName?: string;
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.title + ' | FunBreak SEO Blog',
    description: post.excerpt ?? '',
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
          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-sm text-white/40">
              {t('author')}:{' '}
              <span className="text-white/60">
                {post.authorName ?? 'FunBreak SEO'}
              </span>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
