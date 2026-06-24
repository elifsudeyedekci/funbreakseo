import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Blog | FunBreak SEO',
  description: 'SEO ve GEO hakkında güncel makaleler, ipuçları ve en iyi uygulamalar.',
};

// Static placeholder posts — real posts come from CMS/API via ISR
const posts = [
  { slug: 'geo-nedir-yapay-zeka-arama-optimizasyonu', title: 'GEO Nedir? Yapay Zeka Arama Optimizasyonu Rehberi', excerpt: 'ChatGPT ve Gemini çağında markanızı nasıl konumlandırırsınız?', category: 'GEO', date: '2025-06-01', readTime: 8 },
  { slug: 'teknik-seo-kontrol-listesi-2025', title: '2025 Teknik SEO Kontrol Listesi: 47 Madde', excerpt: 'Core Web Vitals, indexing, hreflang ve daha fazlası.', category: 'Teknik SEO', date: '2025-05-20', readTime: 12 },
  { slug: 'chatgpt-markanizi-onermiyor-mu', title: 'ChatGPT Markanızı Önermiyorsa Ne Yapmalısınız?', excerpt: 'Pratik GEO optimizasyon adımları ve içerik stratejisi.', category: 'GEO', date: '2025-05-10', readTime: 6 },
  { slug: 'backlink-kalitesi-nasil-olculmeli', title: 'Backlink Kalitesi Nasıl Ölçülmeli? DR vs DA', excerpt: 'Domain Rating ve Domain Authority farkı ile doğru backlink seçimi.', category: 'Link Building', date: '2025-04-28', readTime: 7 },
  { slug: 'ai-icerik-uretimi-seo-etkileri', title: 'AI ile İçerik Üretiminin SEO Etkileri', excerpt: 'Google, AI üretimi içerikleri nasıl değerlendiriyor? E-E-A-T rehberi.', category: 'İçerik', date: '2025-04-15', readTime: 9 },
  { slug: 'yerel-seo-google-business-profile', title: 'Yerel SEO ve Google Business Profile Optimizasyonu', excerpt: 'Yerel aramalarda üst sıralara çıkmak için kapsamlı rehber.', category: 'Yerel SEO', date: '2025-03-30', readTime: 10 },
];

const categories = ['Tümü', 'GEO', 'Teknik SEO', 'Link Building', 'İçerik', 'Yerel SEO'];

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Blog</h1>
            <p className="text-white/50">SEO ve GEO hakkında güncel makaleler</p>
          </div>

          <div className="flex gap-2 flex-wrap justify-center mb-10">
            {categories.map((c) => (
              <span key={c} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 cursor-pointer hover:bg-white/10 transition-colors">
                {c}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.slug} href={'/blog/' + post.slug}
                className="group rounded-2xl border border-white/10 bg-white/2 overflow-hidden hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all">
                <div className="h-40 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 flex items-center justify-center">
                  <span className="text-4xl opacity-40">📝</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs rounded-full bg-indigo-500/20 text-indigo-400 px-2 py-0.5">{post.category}</span>
                    <span className="text-xs text-white/30">{post.readTime} dk okuma</span>
                  </div>
                  <h2 className="font-semibold text-white mb-2 group-hover:text-indigo-300 transition-colors leading-snug">{post.title}</h2>
                  <p className="text-xs text-white/50 leading-relaxed mb-3">{post.excerpt}</p>
                  <p className="text-xs text-white/30">{new Date(post.date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
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