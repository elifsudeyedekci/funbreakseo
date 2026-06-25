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
  category?: string;
  date?: string;
  publishedAt?: string;
  readTime?: number;
  readingMinutes?: number;
}

const STATIC_POSTS: BlogPost[] = [
  // Turkish
  { slug: 'geo-nedir-yapay-zeka-arama-optimizasyonu', title: 'GEO Nedir? Yapay Zeka Arama Optimizasyonu Rehberi', excerpt: 'ChatGPT ve Gemini çağında markanızı nasıl konumlandırırsınız?', category: 'GEO', date: '2025-06-01', readTime: 8 },
  { slug: 'teknik-seo-kontrol-listesi-2025', title: '2025 Teknik SEO Kontrol Listesi: 47 Madde', excerpt: 'Core Web Vitals, indexing, hreflang ve daha fazlası.', category: 'Teknik SEO', date: '2025-05-20', readTime: 12 },
  { slug: 'chatgpt-markanizi-onermiyor-mu', title: 'ChatGPT Markanızı Önermiyorsa Ne Yapmalısınız?', excerpt: 'Pratik GEO optimizasyon adımları ve içerik stratejisi.', category: 'GEO', date: '2025-05-10', readTime: 6 },
  { slug: 'backlink-kalitesi-nasil-olculmeli', title: 'Backlink Kalitesi Nasıl Ölçülmeli? DR vs DA', excerpt: 'Domain Rating ve Domain Authority farkı ile doğru backlink seçimi.', category: 'Link Building', date: '2025-04-28', readTime: 7 },
  { slug: 'ai-icerik-uretimi-seo-etkileri', title: 'AI ile İçerik Üretiminin SEO Etkileri', excerpt: 'Google, AI üretimi içerikleri nasıl değerlendiriyor? E-E-A-T rehberi.', category: 'İçerik', date: '2025-04-15', readTime: 9 },
  { slug: 'yerel-seo-google-business-profile', title: 'Yerel SEO ve Google Business Profile Optimizasyonu', excerpt: 'Yerel aramalarda üst sıralara çıkmak için kapsamlı rehber.', category: 'Yerel SEO', date: '2025-03-30', readTime: 10 },
  // English
  { slug: 'what-is-geo-generative-engine-optimization', title: 'What is GEO? A Complete Guide to Generative Engine Optimization', excerpt: 'How to position your brand in the age of ChatGPT and Gemini.', category: 'GEO', date: '2025-06-01', readTime: 8 },
  { slug: 'technical-seo-checklist-2025', title: 'Technical SEO Checklist 2025: 47 Essential Points', excerpt: 'Core Web Vitals, indexing, hreflang and more.', category: 'Technical SEO', date: '2025-05-20', readTime: 12 },
  { slug: 'chatgpt-not-recommending-your-brand', title: "What to Do When ChatGPT Doesn't Recommend Your Brand", excerpt: 'Practical GEO optimization steps and content strategy.', category: 'GEO', date: '2025-05-10', readTime: 6 },
  { slug: 'backlink-quality-dr-vs-da', title: 'How to Measure Backlink Quality: DR vs DA', excerpt: 'The difference between Domain Rating and Domain Authority for smarter link selection.', category: 'Link Building', date: '2025-04-28', readTime: 7 },
  { slug: 'ai-content-seo-impact', title: 'The SEO Impact of AI-Generated Content', excerpt: "How Google evaluates AI content. The complete E-E-A-T guide.", category: 'Content', date: '2025-04-15', readTime: 9 },
  // German
  { slug: 'was-ist-geo-ai-suchoptimierung', title: 'Was ist GEO? Ein umfassender Leitfaden zur KI-Suchoptimierung', excerpt: 'Wie Sie Ihre Marke im Zeitalter von ChatGPT und Gemini positionieren.', category: 'GEO', date: '2025-06-01', readTime: 8 },
  { slug: 'technisches-seo-checkliste-2025', title: 'Technische SEO-Checkliste 2025: 47 wesentliche Punkte', excerpt: 'Core Web Vitals, Indexierung, Hreflang und mehr.', category: 'Technisches SEO', date: '2025-05-20', readTime: 12 },
  { slug: 'backlink-qualitaet-dr-vs-da', title: 'Wie misst man Backlink-Qualität? DR vs DA', excerpt: 'Der Unterschied zwischen Domain Rating und Domain Authority.', category: 'Link Building', date: '2025-04-28', readTime: 7 },
  // French
  { slug: 'quest-ce-que-le-geo-optimisation', title: "Qu'est-ce que le GEO ? Guide complet d'optimisation pour moteurs génératifs", excerpt: "Comment positionner votre marque à l'ère de ChatGPT et Gemini.", category: 'GEO', date: '2025-06-01', readTime: 8 },
  { slug: 'checklist-seo-technique-2025', title: 'Checklist SEO Technique 2025 : 47 Points Essentiels', excerpt: 'Core Web Vitals, indexation, hreflang et plus encore.', category: 'SEO Technique', date: '2025-05-20', readTime: 12 },
  { slug: 'qualite-backlinks-dr-vs-da', title: 'Comment mesurer la qualité des backlinks : DR vs DA', excerpt: 'La différence entre Domain Rating et Domain Authority.', category: 'Link Building', date: '2025-04-28', readTime: 7 },
  // Spanish
  { slug: 'que-es-geo-optimizacion-motores-generativos', title: '¿Qué es GEO? Guía completa de Optimización para Motores Generativos', excerpt: 'Cómo posicionar tu marca en la era de ChatGPT y Gemini.', category: 'GEO', date: '2025-06-01', readTime: 8 },
  { slug: 'checklist-seo-tecnico-2025', title: 'Lista de Verificación SEO Técnico 2025: 47 Puntos Esenciales', excerpt: 'Core Web Vitals, indexación, hreflang y más.', category: 'SEO Técnico', date: '2025-05-20', readTime: 12 },
  { slug: 'calidad-backlinks-dr-vs-da', title: 'Cómo medir la calidad de los backlinks: DR vs DA', excerpt: 'La diferencia entre Domain Rating y Domain Authority.', category: 'Link Building', date: '2025-04-28', readTime: 7 },
  // Arabic
  { slug: 'ma-huwa-geo-tahsin-dharik-dhaki', title: 'ما هو GEO؟ دليل شامل لتحسين محركات البحث الذكية', excerpt: 'كيفية تحديد موضع علامتك التجارية في عصر ChatGPT وGemini.', category: 'GEO', date: '2025-06-01', readTime: 8 },
  { slug: 'qaimat-seo-alfikni-2025', title: 'قائمة تحقق SEO التقني 2025: 47 نقطة أساسية', excerpt: 'Core Web Vitals والفهرسة وhreflang والمزيد.', category: 'SEO التقني', date: '2025-05-20', readTime: 12 },
  { slug: 'jaudhat-rawabet-dr-vs-da', title: 'كيف تقيس جودة الروابط الخلفية: DR مقابل DA', excerpt: 'الفرق بين Domain Rating وDomain Authority.', category: 'Link Building', date: '2025-04-28', readTime: 7 },
  // Russian
  { slug: 'chto-takoe-geo-optimizaciya-dlya-ii', title: 'Что такое GEO? Полное руководство по оптимизации для ИИ-поисковиков', excerpt: 'Как позиционировать бренд в эпоху ChatGPT и Gemini.', category: 'GEO', date: '2025-06-01', readTime: 8 },
  { slug: 'tekhnicheskiy-seo-cheklistom-2025', title: 'Технический SEO чеклист 2025: 47 основных пунктов', excerpt: 'Core Web Vitals, индексирование, hreflang и многое другое.', category: 'Технический SEO', date: '2025-05-20', readTime: 12 },
  { slug: 'kachestvo-ssylok-dr-vs-da', title: 'Как измерить качество обратных ссылок: DR против DA', excerpt: 'Разница между Domain Rating и Domain Authority.', category: 'Линкбилдинг', date: '2025-04-28', readTime: 7 },
  // Hindi
  { slug: 'geo-kya-hai-ai-search-optimization', title: 'GEO क्या है? AI सर्च ऑप्टिमाइज़ेशन का संपूर्ण गाइड', excerpt: 'ChatGPT और Gemini के युग में अपने ब्रांड को कैसे स्थापित करें।', category: 'GEO', date: '2025-06-01', readTime: 8 },
  { slug: 'technical-seo-checklist-2025-hindi', title: 'तकनीकी SEO चेकलिस्ट 2025: 47 आवश्यक बिंदु', excerpt: 'Core Web Vitals, इंडेक्सिंग, hreflang और बहुत कुछ।', category: 'तकनीकी SEO', date: '2025-05-20', readTime: 12 },
  { slug: 'backlink-quality-dr-vs-da-hindi', title: 'बैकलिंक की गुणवत्ता कैसे मापें: DR बनाम DA', excerpt: 'Domain Rating और Domain Authority के बीच अंतर।', category: 'Link Building', date: '2025-04-28', readTime: 7 },
];

async function fetchPosts(): Promise<BlogPost[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
    const res = await fetch(`${apiUrl}/public/blog?limit=100`, {
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
  const posts = await fetchPosts();

  const normalizedPosts = posts.map((p) => ({
    ...p,
    category: p.category ?? 'SEO',
    date: p.date ?? p.publishedAt ?? '',
    readTime: p.readTime ?? p.readingMinutes ?? 5,
  }));
  const allCategories = [t('all'), ...Array.from(new Set(normalizedPosts.map((p) => p.category)))];
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
            {normalizedPosts.map((post) => (
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
