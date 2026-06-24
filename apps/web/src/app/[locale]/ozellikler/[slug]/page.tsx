import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const featureData: Record<string, { title: string; desc: string; longDesc: string; highlights: string[] }> = {
  'anahtar-kelime-takibi': {
    title: 'Anahtar Kelime Takibi',
    desc: 'Google ve Bing siralamalarinizi gercek zamanli izleyin.',
    longDesc: 'FunBreak SEO anahtar kelime takibi modulu, sitenizin Google ve Bing arama sonuclarindaki konumunu gunluk olarak olcer. Rakip karsilastirmasi, tarihsel trend grafikleri ve pozisyon degisim uyarilari ile hic bir hareketi kacirmazsiniz.',
    highlights: ['Gunluk konum guncelleme', 'Rakip analizi', 'Sehir bazli yerel takip', 'Mobil vs masaustu karsilastirma', 'Excel/CSV export'],
  },
  'site-denetimi': {
    title: 'Teknik SEO Denetimi',
    desc: '150+ SEO kurali ile sitenizi tarayin.',
    longDesc: 'Otomatik site tarayicimiz 150+ teknik SEO kuralini kontrol eder: sayfa hizi, meta etiketler, yinelenen icerik, kirik baglanti, hreflang hatasi, yapısal veri eksikligi ve daha fazlasi. Her sorun icin adim adim duzeltme rehberi sunulur.',
    highlights: ['150+ SEO kurali', 'JavaScript render destegi', 'Sorun onceliklendirme', 'Duzeltme rehberi', 'PDF rapor'],
  },
  'ai-icerik-uretimi': {
    title: 'AI Icerik Uretimi',
    desc: 'GPT-4o destekli SEO optimizasyonlu icerik ureti.',
    longDesc: 'GPT-4o ve ozel SEO modelimiz ile hedef anahtar kelimenize yonelik blog yazisi, landing page ve urun aciklamasi uretin. E-E-A-T uyumlu, Turkce ve 7 dil destegi. Uretilen icerik SEO skoru ile puanlanir.',
    highlights: ['GPT-4o modeli', 'SEO skoru analizi', '8 dil destegi', 'E-E-A-T uyumlu', 'Taslak & yayimlama akisi'],
  },
  'geo-ai-gorunurluk': {
    title: 'GEO / AI Gorunurluk',
    desc: 'Yapay zeka aramalarinda markanizin gorunurlugunu olcun.',
    longDesc: '6 yapay zeka platformunu (ChatGPT, Gemini, Perplexity, Claude, Google AI Overview, Google AI Mode) duzenli olarak tarayarak markanizin mention ve citation oranini olceriz. Rakip karsilastirma ve iyilestirme onerileri ile GEO stratejinizi sekillendiriniz.',
    highlights: ['6 AI platformu takibi', 'Mention & citation olcumu', 'Rakip karsilastirma', 'Haftalik rapor', 'GEO iyilestirme onerileri'],
  },
  'backlink-analizi': {
    title: 'Backlink Analizi & Market',
    desc: 'Backlink profilinizi analiz edin, kaliteli link satin alin.',
    longDesc: 'Backlink profilinizi DR, DA ve spam skoru bazinda analiz edin. Rakiplerinizin backlink kaynaklarini kopyalayin. Backlink Market uzerinden Turk medyasi ve blog sitelerinden manuel olarak onaylanan linkler satin alin.',
    highlights: ['DR/DA analizi', 'Rakip backlink ifsa', 'Backlink Market', 'Manuel onay sureci', 'Dosya satin alma'],
  },
  'raporlama': {
    title: 'Otomatik Raporlama',
    desc: 'PDF raporlar ve zamanlanmis e-posta ozeti.',
    longDesc: 'Musteri veya yonetici icin hazir PDF raporlar oluturun. Haftalik veya aylik otomatik e-posta ozetleri goenderin. Beyaz etiket (white-label) modu ile raporlari kendi markaniz altinda sunabilirsiniz.',
    highlights: ['PDF rapor uretimi', 'Zamanlanmis e-posta', 'Beyaz etiket modu', 'Musteri portali', 'Excel export'],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = featureData[slug];
  if (!f) return {};
  return { title: f.title + ' | FunBreak SEO', description: f.desc };
}

export function generateStaticParams() {
  return Object.keys(featureData).flatMap((slug) => ['tr', 'en', 'de', 'fr', 'es', 'ar', 'ru', 'hi'].map((locale) => ({ locale, slug })));
}

export default async function FeatureDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = featureData[slug];
  if (!f) notFound();

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <Link href="/ozellikler" className="text-sm text-indigo-400 hover:text-indigo-300">
              Tum Ozellikler
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">{f.title}</h1>
          <p className="text-lg text-white/60 mb-8">{f.longDesc}</p>
          <div className="rounded-2xl border border-white/10 bg-white/2 p-6 mb-8">
            <h2 className="text-base font-semibold text-white mb-4">One Cikan Ozellikler</h2>
            <ul className="space-y-2">
              {f.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2 text-sm text-white/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-center">
            <Link href="/kayit" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white hover:bg-indigo-500 transition-all">
              Ucretsiz Dene
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}