import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

const featureData: Record<string, { title: string; desc: string; longDesc: string; highlights: string[] }> = {
  /* ── Sıralama & Anahtar Kelime ── */
  'anahtar-kelime-takibi': {
    title: 'Anahtar Kelime Takibi',
    desc: 'Google ve Bing sıralamalarınızı gerçek zamanlı izleyin.',
    longDesc: 'FunBreak SEO anahtar kelime takibi modülü, sitenizin Google ve Bing arama sonuçlarındaki konumunu günlük olarak ölçer. Rakip karşılaştırması, tarihsel trend grafikleri ve pozisyon değişim uyarıları ile hiçbir hareketi kaçırmazsınız.',
    highlights: ['Günlük konum güncellemesi', 'Rakip analizi', 'Şehir bazlı yerel takip', 'Mobil vs masaüstü karşılaştırma', 'Excel/CSV export'],
  },
  'siralama-takibi': {
    title: 'Sıralama Takibi',
    desc: 'Anahtar kelimelerinizin günlük pozisyon değişimini takip edin.',
    longDesc: 'Hedeflediğiniz her anahtar kelimenin Google sıralamasını günlük olarak izleyin. Grafik görünümlü tarihsel trend analizi, rakip karşılaştırması ve anlık pozisyon uyarıları ile büyümenizi gerçek zamanlı görün.',
    highlights: ['Günlük pozisyon takibi', 'Trend grafikleri', 'Rakip karşılaştırma', 'Anlık uyarılar', 'Çoklu lokasyon desteği'],
  },
  'anahtar-kelime': {
    title: 'Anahtar Kelime Araştırması',
    desc: 'Arama hacmi ve zorluk skoru ile en değerli kelimeleri bulun.',
    longDesc: 'Milyonlarca arama sorgusunu analiz eden yapay zeka motorumuz, rekabeti düşük ve dönüşüm potansiyeli yüksek anahtar kelimeleri tespit eder. Arama hacmi, CPC, zorluk skoru ve trend verileri ile bilinçli içerik kararları alın.',
    highlights: ['Arama hacmi & trend analizi', 'Zorluk skoru', 'Rakip kelime tespiti', 'Kümeleme & önceliklendirme', 'CSV export'],
  },

  /* ── Teknik SEO ── */
  'site-denetimi': {
    title: 'Teknik SEO Denetimi',
    desc: '150+ SEO kuralı ile sitenizi tarayın.',
    longDesc: 'Otomatik site tarayıcımız 150+ teknik SEO kuralını kontrol eder: sayfa hızı, meta etiketler, yinelenen içerik, kırık bağlantı, hreflang hatası, yapısal veri eksikliği ve daha fazlası. Her sorun için adım adım düzeltme rehberi sunulur.',
    highlights: ['150+ SEO kuralı', 'JavaScript render desteği', 'Sorun önceliklendirme', 'Düzeltme rehberi', 'PDF rapor'],
  },
  'seo-tarama': {
    title: 'SEO Tarama',
    desc: '150+ teknik kontrol, Core Web Vitals ve hız analizi tek tıkla.',
    longDesc: 'Sitenizi 150+ teknik SEO kriteri ile kapsamlı şekilde tarayın. Core Web Vitals, crawl hataları, sayfa hızı, mobil uyum ve daha fazlası — her sorun için önceliklendirilmiş düzeltme rehberi ile birlikte.',
    highlights: ['Core Web Vitals analizi', 'Crawl hata tespiti', 'Sayfa hız ölçümü', 'Mobil uyum kontrolü', 'Öncelikli aksiyon listesi'],
  },

  /* ── GEO / AI ── */
  'geo-ai-gorunurluk': {
    title: 'GEO / AI Görünürlük',
    desc: 'Yapay zeka aramalarında markanızın görünürlüğünü ölçün.',
    longDesc: '6 yapay zeka platformunu (ChatGPT, Gemini, Perplexity, Claude, Google AI Overview, Google AI Mode) düzenli olarak tarayarak markanızın mention ve citation oranını ölçeriz. Rakip karşılaştırma ve iyileştirme önerileri ile GEO stratejinizi şekillendirin.',
    highlights: ['6 AI platformu takibi', 'Mention & citation ölçümü', 'Rakip karşılaştırma', 'Haftalık rapor', 'GEO iyileştirme önerileri'],
  },

  /* ── İçerik ── */
  'ai-icerik-uretimi': {
    title: 'AI İçerik Üretimi',
    desc: 'GPT-4o destekli SEO optimizasyonlu içerik üretin.',
    longDesc: 'GPT-4o ve özel SEO modelimiz ile hedef anahtar kelimenize yönelik blog yazısı, landing page ve ürün açıklaması üretin. E-E-A-T uyumlu, Türkçe ve 7 dil desteği. Üretilen içerik SEO skoru ile puanlanır.',
    highlights: ['GPT-4o modeli', 'SEO skoru analizi', '8 dil desteği', 'E-E-A-T uyumlu', 'Taslak & yayımlama akışı'],
  },
  'icerik-motoru': {
    title: 'AI İçerik Motoru',
    desc: 'SEO uyumlu makaleler, meta taglar ve briefler saniyeler içinde.',
    longDesc: 'Yapay zeka ile SEO uyumlu blog yazıları, ürün açıklamaları ve sayfa metinleri oluşturun. Hedef anahtar kelimenizi girin, içerik motoru E-E-A-T kurallarına uygun taslağı hazırlasın. 8 dil desteği ile uluslararası pazarlara açılın.',
    highlights: ['Saniyeler içinde taslak', 'SEO uyum skoru', 'Meta tag üretimi', '8 dil desteği', 'İçerik brief oluşturucu'],
  },

  /* ── Backlink ── */
  'backlink-analizi': {
    title: 'Backlink Analizi & Market',
    desc: 'Backlink profilinizi analiz edin, kaliteli link satın alın.',
    longDesc: 'Backlink profilinizi DR, DA ve spam skoru bazında analiz edin. Rakiplerinizin backlink kaynaklarını kopyalayın. Backlink Market üzerinden Türk medyası ve blog sitelerinden manuel olarak onaylanan linkler satın alın.',
    highlights: ['DR/DA analizi', 'Rakip backlink ifşa', 'Backlink Market', 'Manuel onay süreci', 'Toplu satın alma'],
  },
  'backlink-market': {
    title: 'Backlink Market',
    desc: 'Kaliteli backlink fırsatlarını keşfedin ve tek tıkla sipariş edin.',
    longDesc: 'Onlarca Türk medyası ve niş blog sitesinden manuel olarak onaylanmış backlink fırsatlarına ulaşın. DA/DR ve tematik uyum filtresi ile sitenize en değerli linkleri bulun ve doğrudan sipariş edin.',
    highlights: ['DA/DR filtreleme', 'Tematik uyum skoru', 'Manuel onay güvencesi', 'Toplu sipariş', 'Teslim takibi'],
  },

  /* ── Outreach ── */
  'outreach': {
    title: 'Outreach Kampanya',
    desc: 'AI ile kişiselleştirilmiş e-posta şablonları ve otomatik takip.',
    longDesc: 'Yapay zeka ile kişiselleştirilmiş outreach e-postaları oluşturun, otomatik takip dizileri kurun ve yanıt oranlarını artırın. Backlink kampanyaları, konuk yazarlık teklifleri ve iş birliği istekleri için hazır şablonlar ile zaman kazanın.',
    highlights: ['AI e-posta kişiselleştirme', 'Otomatik takip dizisi', 'Açılma & tıklama takibi', 'CRM entegrasyonu', 'Hazır şablon kütüphanesi'],
  },

  /* ── Rakip & Araştırma ── */
  'rakip-analizi': {
    title: 'Rakip Analizi',
    desc: 'Rakiplerinizin trafik kaynaklarını ve kazanımlarını takip edin.',
    longDesc: "Rakiplerinizin organik trafik kaynaklarını, en değerli anahtar kelimelerini, backlink profillerini ve içerik stratejilerini analiz edin. Rakiplerinizin yeni kazandığı sıralamalar ve kaybettiği pozisyonlar hakkında otomatik uyarı alın.",
    highlights: ['Rakip trafik analizi', 'Kazanılan/kaybedilen sıralamalar', 'Backlink profil karşılaştırma', 'İçerik boşluk analizi', 'Otomatik uyarılar'],
  },

  /* ── Raporlama & White Label ── */
  'raporlama': {
    title: 'Otomatik Raporlama',
    desc: 'PDF raporlar ve zamanlanmış e-posta özeti.',
    longDesc: 'Müşteri veya yönetici için hazır PDF raporlar oluşturun. Haftalık veya aylık otomatik e-posta özetleri gönderin. Beyaz etiket (white-label) modu ile raporları kendi markanız altında sunabilirsiniz.',
    highlights: ['PDF rapor üretimi', 'Zamanlanmış e-posta', 'Beyaz etiket modu', 'Müşteri portali', 'Excel export'],
  },
  'white-label': {
    title: 'White Label Raporlar',
    desc: 'Markalı PDF ve Excel raporlar — ajans müşterilerinize kendi logonuzla sunun.',
    longDesc: 'Ajans kullanıcıları için özel white-label rapor modu: kendi logonuz, renkleriniz ve domain adınızla profesyonel SEO raporları oluşturun. PDF, Excel ve interaktif müşteri portalı formatları ile müşteri memnuniyetini artırın.',
    highlights: ['Özel logo & renk', 'PDF / Excel / Portal', 'Müşteri e-posta gönderimi', 'Şablon editörü', 'Sınırsız müşteri'],
  },

  /* ── Çok Dilli ── */
  'cok-dilli-seo': {
    title: 'Çok Dilli SEO',
    desc: '8 dilde hreflang, çeviri ve uluslararası sıralama takibi.',
    longDesc: 'Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, Arapça, Rusça ve Hintçe olmak üzere 8 dilde SEO stratejinizi yönetin. Hreflang etiketi doğrulama, otomatik çeviri önerileri ve ülke bazlı sıralama takibi ile global pazara açılın.',
    highlights: ['8 dil desteği', 'Hreflang doğrulama', 'Ülke bazlı sıralama', 'Çeviri önerileri', 'Çok lokasyonlu dashboard'],
  },

  /* ── Autopilot ── */
  'autopilot': {
    title: 'Autopilot',
    desc: 'Tarama, içerik, backlink ve raporlamayı otomatikleştirin.',
    longDesc: 'FunBreak SEO Autopilot, SEO iş akışınızı baştan sona otomatikleştirir: haftalık site taraması, AI içerik üretimi, backlink fırsat tespiti ve müşteri raporu gönderimi tek bir akışta çalışır. Siz büyümeye odaklanın, platform geri kalanını halleder.',
    highlights: ['Haftalık otomatik tarama', 'AI içerik üretimi', 'Backlink fırsat tespiti', 'Otomatik rapor gönderimi', 'Özelleştirilebilir iş akışı'],
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

          {/* Back link */}
          <Link
            href="/ozellikler"
            className="inline-flex items-center gap-1.5 text-sm text-white/35 hover:text-white/60 transition-colors mb-10 group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Tüm Özellikler
          </Link>

          {/* Hero */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 mb-5">
              <span className="text-xs font-medium text-indigo-400">FunBreak SEO Özelliği</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight leading-tight">{f.title}</h1>
            <p className="text-lg text-white/45 leading-relaxed">{f.longDesc}</p>
          </div>

          {/* Highlights */}
          <div className="relative rounded-2xl border border-indigo-500/18 bg-indigo-500/[0.04] p-7 mb-10 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-5">Öne Çıkan Özellikler</h2>
            <ul className="space-y-3">
              {f.highlights.map((h) => (
                <li key={h} className="flex items-center gap-3 text-sm text-white/65">
                  <CheckCircle2 className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-900/20 to-transparent p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">{f.title} özelliğini hemen deneyin</h3>
            <p className="text-white/40 text-sm mb-6">14 gün ücretsiz, kredi kartı gerekmez.</p>
            <Link
              href="/kayit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-[0_0_28px_rgba(99,102,241,0.35)] hover:-translate-y-0.5"
            >
              Ücretsiz Dene <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}