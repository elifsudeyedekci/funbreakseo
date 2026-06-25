import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Search, TrendingUp, BarChart2, Link2, FileText, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'SEO Nedir? Arama Motoru Optimizasyonu Rehberi | FunBreak SEO',
  description: 'SEO (Arama Motoru Optimizasyonu) nedir, nasıl çalışır? Teknik SEO, içerik optimizasyonu, backlink stratejileri ve 2025 için en güncel SEO rehberi.',
};

const pillars = [
  {
    Icon: Search,
    title: 'Teknik SEO',
    desc: 'Site hızı, Core Web Vitals, crawl bütçesi, hreflang, yapısal veri ve mobil uyum. Arama motorlarının sitenizi doğru taraması ve indexlemesi için temel.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  {
    Icon: FileText,
    title: 'İçerik Optimizasyonu',
    desc: 'Hedef anahtar kelimelere yönelik E-E-A-T uyumlu içerik üretimi, başlık optimizasyonu, meta açıklamalar ve iç linkleme stratejisi.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    Icon: Link2,
    title: 'Off-Page SEO & Backlink',
    desc: 'Otorite ve güven puanını artıran kaliteli backlink profili. Domain Rating (DR), anchor text dağılımı ve link çeşitliliği.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  {
    Icon: Globe,
    title: 'Yerel & Uluslararası SEO',
    desc: 'Google Business profili, yerel anahtar kelimeler, hreflang etiketleri ve çok dilli içerik stratejisiyle küresel pazara açılın.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    Icon: BarChart2,
    title: 'SEO Analitik & Ölçüm',
    desc: 'Organik trafik, sıralama değişimleri, CTR optimizasyonu ve ROI ölçümü. Google Search Console ve FunBreak SEO dashboardıyla veriye dayalı kararlar.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  {
    Icon: TrendingUp,
    title: 'SEO + GEO Entegrasyonu',
    desc: "2025'te sadece Google yetmez. ChatGPT, Gemini ve Perplexity'de de sıralama almak için GEO stratejisini SEO ile birlikte yönetin.",
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
];

const stats = [
  { value: '%68', label: 'Tüm web trafiğinin organik aramadan geldiği tahmini oran' },
  { value: '#1', label: "Google'da birinci sıranın ortalama tıklama oranı %27,6" },
  { value: '3 sn', label: 'Sayfa yüklenme süresi 3 saniyeyi geçerse kullanıcıların %53\'ü terk eder' },
  { value: '200+', label: "Google'ın sıralama algoritmasındaki faktör sayısı" },
];

export default function SeoPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          {/* Hero */}
          <div className="text-center mb-16">
            <span className="inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-400 mb-4">
              Kapsamlı Rehber — 2025
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
              SEO Nedir?<br />
              <span className="gradient-text">Arama Motoru Optimizasyonu</span>
            </h1>
            <p className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
              Google ve diğer arama motorlarında üst sıralara çıkmak için uyguladığınız teknik,
              içerik ve otorite stratejilerinin bütünüdür. 2025'te SEO, yapay zeka aramaları (GEO) ile birlikte çalışır.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {stats.map((s) => (
              <div key={s.value} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-center">
                <div className="text-2xl font-bold gradient-text mb-2">{s.value}</div>
                <p className="text-xs text-white/40 leading-relaxed">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Main content */}
          <article className="prose prose-invert max-w-none mb-16">
            <h2>SEO Nasıl Çalışır?</h2>
            <p>
              Google her gün milyarlarca web sayfasını tarar (crawl), içeriklerini indexler ve
              kullanıcı sorgusuna en alakalı sayfaları 200&apos;den fazla faktörü değerlendirerek
              sıralar. SEO, bu faktörleri anlayıp sitenizi arama motorlarının ve kullanıcıların
              tercih edeceği şekilde optimize etme sürecidir.
            </p>
            <h2>Neden Önemli?</h2>
            <p>
              Organik arama, tüm web trafiğinin %68'ini oluşturuyor ve ücretli reklamların aksine
              kampanya bütçesi bitince durmuyor. İyi optimize edilmiş bir site, yıllarca düşük
              maliyetle nitelikli trafik almaya devam eder. Google'da #1 sıraya çıkan sayfa
              ortalama %27,6 tıklama oranı alırken, #10'daki sayfa yalnızca %2,4 alır.
            </p>
            <h2>2025'te SEO Nasıl Değişti?</h2>
            <p>
              Yapay zeka tabanlı arama araçlarının yükselişiyle SEO artık tek başına yeterli değil.
              ChatGPT, Gemini ve Perplexity gibi platformlar milyonlarca sorguya cevap veriyor ve
              markaları kendi kararlarıyla önerip önermemeyi seçiyor. Bu yeni ortamda{' '}
              <strong>GEO (Generative Engine Optimization)</strong> ile SEO&apos;nun birlikte
              uygulanması kritik hale geldi.
            </p>
          </article>

          {/* 6 pillars */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">SEO&apos;nun 6 Temel Direği</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pillars.map((p) => (
                <div key={p.title} className={`rounded-2xl border ${p.border} ${p.bg} p-6`}>
                  <div className={`inline-flex p-2.5 rounded-xl bg-white/5 mb-4`}>
                    <p.Icon className={`h-5 w-5 ${p.color}`} />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-900/25 to-transparent p-10 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Sitenizin SEO Skorunu Ücretsiz Öğrenin</h2>
            <p className="text-white/45 mb-8 max-w-lg mx-auto">
              150+ teknik kontrol, Core Web Vitals analizi ve öncelikli aksiyon listesi ile
              sitenizin nerede durduğunu 5 dakikada görün.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/kayit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-[0_0_28px_rgba(99,102,241,0.35)]"
              >
                Ücretsiz SEO Taraması Başlat
              </Link>
              <Link
                href="/geo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all"
              >
                GEO Nedir? →
              </Link>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
