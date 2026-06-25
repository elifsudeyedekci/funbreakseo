import type { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BlogGrid } from '@/components/blog/BlogGrid';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('blog');
  return {
    title: `${t('title')} | FunBreak SEO`,
    description: t('subtitle'),
  };
}

interface BlogPost {
  slug: string;
  title: string;
  excerpt?: string;
  locale?: string;
  publishedAt?: string;
  readingMinutes?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function fetchPosts(): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${API_URL}/public/blog?limit=100`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json?.data ?? json?.items ?? json;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const locale = await getLocale();
  const t = await getTranslations('blog');
  const posts = await fetchPosts();

  const allLabel = t('all');
  const readTimeLabel = t('readTime');

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">{t('title')}</h1>
            <p className="text-white/50">{t('subtitle')}</p>
          </div>
          <BlogGrid
            posts={posts}
            locale={locale}
            allLabel={allLabel}
            readTimeLabel={readTimeLabel}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
