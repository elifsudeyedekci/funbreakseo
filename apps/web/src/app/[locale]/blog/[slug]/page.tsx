import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SUPPORTED_LOCALES } from '@funbreakseo/shared';

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  date: string;
  readTime: number;
  author: string;
}

// In production this would come from a CMS or DB
async function getPost(slug: string): Promise<BlogPost | null> {
  const posts: Record<string, BlogPost> = {
    'geo-nedir-yapay-zeka-arama-optimizasyonu': {
      slug: 'geo-nedir-yapay-zeka-arama-optimizasyonu',
      title: 'GEO Nedir? Yapay Zeka Arama Optimizasyonu Rehberi',
      excerpt: 'ChatGPT ve Gemini çağında markanızı nasıl konumlandırırsınız?',
      content: 'GEO (Generative Engine Optimization), markanızın ChatGPT, Gemini, Perplexity ve diğer yapay zeka araçlarında doğru şekilde temsil edilmesi için uygulanan optimizasyon stratejileridir. Geleneksel SEO Google arama sıralamalarına odaklanırken, GEO büyük dil modellerinin (LLM) markanızı nasıl yorumladığını ve önerdiğini hedefler.',
      category: 'GEO',
      date: '2025-06-01',
      readTime: 8,
      author: 'FunBreak SEO Ekibi',
    },
  };
  return posts[slug] || null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.title + ' | FunBreak SEO Blog',
    description: post.excerpt,
    openGraph: { type: 'article', publishedTime: post.date },
  };
}

export function generateStaticParams() {
  const slugs = ['geo-nedir-yapay-zeka-arama-optimizasyonu', 'teknik-seo-kontrol-listesi-2025'];
  return SUPPORTED_LOCALES.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export default async function BlogPostPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug, locale } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'FunBreak SEO', url: 'https://funbreakseo.com' },
    publisher: { '@type': 'Organization', name: 'FunBreak SEO', logo: { '@type': 'ImageObject', url: 'https://funbreakseo.com/logo.png' } },
  };

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
          <div className="mb-4">
            <Link href={'/' + (locale === 'tr' ? '' : locale + '/') + 'blog'} className="text-sm text-indigo-400 hover:text-indigo-300">
              ← Blog'a Dön
            </Link>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs rounded-full bg-indigo-500/20 text-indigo-400 px-2 py-0.5">{post.category}</span>
            <span className="text-xs text-white/30">{post.readTime} dk okuma</span>
            <span className="text-xs text-white/30">·</span>
            <span className="text-xs text-white/30">{new Date(post.date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-snug">{post.title}</h1>
          <p className="text-lg text-white/60 mb-8 leading-relaxed">{post.excerpt}</p>
          <div className="rounded-2xl border border-white/10 bg-white/2 h-56 flex items-center justify-center mb-8">
            <span className="text-6xl opacity-20">📝</span>
          </div>
          <div className="prose prose-invert max-w-none">
            <p className="text-white/70 leading-relaxed">{post.content}</p>
          </div>
          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-sm text-white/40">Yazar: <span className="text-white/60">{post.author}</span></p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}