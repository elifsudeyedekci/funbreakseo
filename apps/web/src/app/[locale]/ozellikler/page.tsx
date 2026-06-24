import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Ozellikler | FunBreak SEO',
  description: 'FunBreak SEO platformunun tum ozellikleri.',
};

const features = [
  { slug: 'anahtar-kelime-takibi', title: 'Anahtar Kelime Takibi', desc: 'Google ve Bing siralamalarinizi gercek zamanli izleyin. Rakip karsilastirma, konum gecmisi ve uyarilar.', tags: ['Google', 'Bing', 'Gunluk'] },
  { slug: 'site-denetimi', title: 'Teknik SEO Denetimi', desc: '150+ SEO kurali ile sitenizi tarariz. Hata onceliklendirmesi ve adim adim duzeltme rehberi.', tags: ['150+ Kural', 'Otomatik', 'Oncelikli'] },
  { slug: 'ai-icerik-uretimi', title: 'AI Icerik Uretimi', desc: 'SEO optimizasyonlu blog, landing page ve urun aciklamasi uretin. E-E-A-T uyumlu.', tags: ['GPT-4o', 'SEO Skoru', 'Turkce'] },
  { slug: 'geo-ai-gorunurluk', title: 'GEO / AI Gorunurluk', desc: 'ChatGPT, Gemini, Perplexity ve Claude markanizin ne siklikla onerildigini olcun.', tags: ['ChatGPT', 'Gemini', 'Perplexity'] },
  { slug: 'backlink-analizi', title: 'Backlink Analizi & Market', desc: 'Backlink profilinizi analiz edin ve guvenilir Turk medyasina link satin alin.', tags: ['DR Analizi', 'Market', 'Outreach'] },
  { slug: 'raporlama', title: 'Otomatik Raporlama', desc: 'PDF raporlar, haftalik e-posta ozeti ve ozellestirilebilir dashboard.', tags: ['PDF', 'Beyaz Etiket', 'Zamanlanmis'] },
];

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">SEO ve GEO icin Tek Platform</h1>
            <p className="text-xl text-white/50 max-w-2xl mx-auto">Geleneksel SEO araclarinin otesine gecin. Yapay zeka aramalarinda da gorunur olun.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Link key={f.slug} href={'/ozellikler/' + f.slug}
                className="group rounded-2xl border border-white/10 bg-white/2 p-6 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all">
                <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-indigo-300 transition-colors">{f.title}</h2>
                <p className="text-sm text-white/50 leading-relaxed mb-4">{f.desc}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {f.tags.map((tag) => (<span key={tag} className="text-xs border border-white/10 rounded-full px-2 py-0.5 text-white/40">{tag}</span>))}
                </div>
                <span className="text-xs text-indigo-400">Daha fazla ogrenin</span>
              </Link>
            ))}
          </div>
          <div className="mt-16 text-center">
            <p className="text-white/50 mb-6">Tum ozellikleri ucretsiz deneyin. Kredi karti gerekmez.</p>
            <Link href="/kayit" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white hover:bg-indigo-500 transition-all">
              14 Gun Ucretsiz Basla
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}