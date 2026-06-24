import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'GEO - Yapay Zeka Arama Optimizasyonu | FunBreak SEO',
  description: 'ChatGPT, Gemini ve Perplexity gibi yapay zeka araçlarında markanızın görünürlüğünü artırın. GEO nedir, nasıl çalışır?',
};

const platforms = [
  { name: 'ChatGPT', company: 'OpenAI', share: '65%', color: 'emerald' },
  { name: 'Gemini', company: 'Google', share: '20%', color: 'blue' },
  { name: 'Perplexity', company: 'Perplexity AI', share: '8%', color: 'purple' },
  { name: 'Claude', company: 'Anthropic', share: '4%', color: 'orange' },
  { name: 'Google AI Overview', company: 'Google', share: '2%', color: 'yellow' },
  { name: 'Google AI Mode', company: 'Google', share: '1%', color: 'indigo' },
];

export default function GeoPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-400 mb-4">
              Yeni: GEO Optimizasyon
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Yapay Zeka Aramalarında<br />
              <span style={{ background: 'linear-gradient(135deg, #A371F7, #5B8DEF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Öne Çıkın
              </span>
            </h1>
            <p className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
              Kullanıcıların %40'ı artık Google yerine ChatGPT ve Gemini kullanıyor.
              GEO (Generative Engine Optimization) ile bu kitlelere ulaşın.
            </p>
          </div>

          {/* Pillar content */}
          <article className="prose prose-invert max-w-none mb-12">
            <h2>GEO Nedir?</h2>
            <p>
              GEO (Generative Engine Optimization), markanızın yapay zeka tarafından üretilen yanıtlarda —
              ChatGPT, Gemini, Perplexity, Claude ve Google AI Overview dahil — doğru ve sık şekilde yer almasını
              sağlamak için uygulanan optimizasyon stratejilerinin bütününüdür. Geleneksel SEO Google arama
              sıralamalarına odaklanırken, GEO büyük dil modeli (LLM) ekosistemini hedefler.
            </p>
            <h2>Neden Önemli?</h2>
            <p>
              Yapay zeka tabanlı arama araçlarının kullanımı 2024-2025 arasında 3 kata katlandı. ChatGPT aylık
              600 milyon aktif kullanıcıya ulaştı. Bu kullanıcılar artık ürün ve hizmet önerilerini için de
              AI araçlarına başvuruyor. Markanız bu platformlarda yoksa, potansiyel müşterilerinizin büyük
              bir kısmına hiç ulaşamıyorsunuz demektir.
            </p>
            <h2>FunBreak GEO Nasıl Çalışır?</h2>
            <p>
              Platformumuz her hafta 6 farklı AI platformunu tarayarak markanızın mention (bahsedilme) ve
              citation (kaynak gösterilme) oranını ölçer. Rakiplerinizle karşılaştırır, düşen görünürlük
              için alarm kurar ve iyileştirme önerileri sunar.
            </p>
            <ul>
              <li><strong>Mention Takibi:</strong> Markanız AI yanıtlarında kaç kez geçiyor?</li>
              <li><strong>Citation Oranı:</strong> Kaynak olarak gösterilme yüzdeniz nedir?</li>
              <li><strong>Rakip Karşılaştırma:</strong> Sektörünüzdeki diğer markalarla kıyaslama</li>
              <li><strong>İçerik Önerileri:</strong> AI tarafından önerilen marka olmak için hangi içerikleri üretmelisiniz?</li>
            </ul>
          </article>

          {/* Platforms */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Takip Ettiğimiz Platformlar</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {platforms.map((p) => (
                <div key={p.name} className="rounded-2xl border border-white/10 bg-white/2 p-4 text-center">
                  <div className="text-lg font-bold text-white mb-1">{p.name}</div>
                  <div className="text-xs text-white/40 mb-2">{p.company}</div>
                  <div className={	ext-sm font-semibold text--400}>AI Pazar Payı: {p.share}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Link href="/kayit" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white hover:opacity-90 transition-all">
              GEO Takibini Ücretsiz Dene
            </Link>
            <p className="text-xs text-white/30 mt-3">14 gün ücretsiz, kredi kartı gerekmez</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}