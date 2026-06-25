import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

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
  excerpt: string;
  category: string;
  date: string;
  readTime: number;
}

const STATIC_POSTS: BlogPost[] = [
  { slug: 'geo-nedir-yapay-zeka-arama-optimizasyonu', title: 'GEO Nedir? Yapay Zeka Arama Optimizasyonu Rehberi', excerpt: 'ChatGPT ve Gemini çağında markanızı nasıl konumlandırırsınız?', category: 'GEO', date: '2025-06-01', readTime: 8 },
  { slug: 'teknik-seo-kontrol-listesi-2025', title: '2025 Teknik SEO Kontrol Listesi: 47 Madde', excerpt: 'Core Web Vitals, indexing, hreflang ve daha fazlası.', category: 'Teknik SEO', date: '2025-05-20', readTime: 12 },
  { slug: 'chatgpt-markanizi-onermiyor-mu', title: 'ChatGPT Markanızı Önermiyorsa Ne Yapmalısınız?', excerpt: 'Pratik GEO optimizasyon adımları ve içerik stratejisi.', category: 'GEO', date: '2025-05-10', readTime: 6 },
  { slug: 'backlink-kalitesi-nasil-olculmeli', title: 'Backlink Kalitesi Nasıl Ölçülmeli? DR vs DA', excerpt: 'Domain Rating ve Domain Authority farkı ile doğru backlink seçimi.', category: 'Link Building', date: '2025-04-28', readTime: 7 },
  { slug: 'ai-icerik-uretimi-seo-etkileri', title: 'AI ile İçerik Üretiminin SEO Etkileri', excerpt: 'Google, AI üretimi içerikleri nasıl değerlendiriyor? E-E-A-T rehberi.', category: 'İçerik', date: '2025-04-15', readTime: 9 },
  { slug: 'yerel-seo-google-business-profile', title: 'Yerel SEO ve Google Business Profile Optimizasyonu', excerpt: 'Yerel aramalarda üst sıralara çıkmak için kapsamlı rehber.', category: 'Yerel SEO', date: '2025-03-30', readTime: 10 },
];

async function fetchPosts(locale: string): Promise<BlogPost[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
    const res = await fetch(`${apiUrl}/public/blog?locale=${locale}&limit=50`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return STATIC_POSTS;
    const json = await res.json();
    const data = json?.data ?? json?.items ?? json;
    return Array.isArray(data) && data.length > 0 ? data : STATIC_POSTS;
  } catch {
    return STATIC_POSTS;
  }
}

export default async function BlogPage() {
  const locale = await getLocale();
  const t = await getTranslations('blog');
  const posts = await fetchPosts(locale);

  const allCategories = [t('all'), ...Array.from(new Set(posts.map((p) => p.category)))];
  const dateLocale = locale === 'tr' ? 'tr-TR' : locale === 'ar' ? 'ar-SA' : locale === 'hi' ? 'hi-IN' : locale === 'ru' ? 'ru-RU' : locale === 'de' ? 'de-DE' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'en-US';

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">{t('title')}</h1>
            <p className="text-white/50">{t('subtitle')}</p>
          </div>

          <div className="flex gap-2 flex-wrap justify-center mb-10">
            {allCategories.map((c) => (
              <span key={c} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 cursor-pointer hover:bg-white/10 transition-colors">
                {c}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}
                className="group rounded-2xl border border-white/10 bg-white/2 overflow-hidden hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all">
                <div className="h-40 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 flex items-center justify-center">
                  <span className="text-4xl opacity-40">📝</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs rounded-full bg-indigo-500/20 text-indigo-400 px-2 py-0.5">{post.category}</span>
                    <span className="text-xs text-white/30">{post.readTime} {t('readTime')}</span>
                  </div>
                  <h2 className="font-semibold text-white mb-2 group-hover:text-indigo-300 transition-colors leading-snug">{post.title}</h2>
                  <p className="text-xs text-white/50 leading-relaxed mb-3">{post.excerpt}</p>
                  <p className="text-xs text-white/30">{new Date(post.date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
