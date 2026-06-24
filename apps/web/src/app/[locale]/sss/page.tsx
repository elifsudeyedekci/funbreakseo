import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Sık Sorulan Sorular | FunBreak SEO',
  description: 'FunBreak SEO hakkında en çok sorulan soruların cevapları.',
};

const faqs = [
  { q: 'FunBreak SEO nedir?', a: 'FunBreak SEO, işletmenizin Google ve yapay zeka aramalarında (ChatGPT, Gemini, Perplexity) görünürlüğünü artırmak için geliştirilen bir SEO + GEO platformudur.' },
  { q: 'Deneme süresi var mı?', a: 'Evet, 14 günlük ücretsiz deneme sunuyoruz. Kredi kartı bilgisi gerekmez, hemen başlayabilirsiniz.' },
  { q: 'GEO (Generative Engine Optimization) ne demektir?', a: 'GEO, markanızın ChatGPT, Gemini, Perplexity gibi yapay zeka araçlarında daha sık ve doğru şekilde önerilmesi için yapılan optimizasyon çalışmasıdır.' },
  { q: 'Kaç proje ekleyebilirim?', a: 'Planınıza bağlı olarak 1\'den başlayıp sınırsıza kadar proje ekleyebilirsiniz. Starter planda 1, Pro\'da 10, Agency\'de sınırsız proje bulunur.' },
  { q: 'Faturalar KDV dahil mi?', a: 'Evet, gösterilen tüm fiyatlar KDV dahildir. Faturanızda KDV ayrı olarak gösterilir.' },
  { q: 'Veri güvenliği nasıl sağlanıyor?', a: 'Verileriniz AES-256 ile şifrelenerek Türkiye ve AB veri merkezlerinde saklanır. KVKK ve GDPR uyumluyuz.' },
  { q: 'API entegrasyonu mümkün mü?', a: 'Evet, REST API ve webhook desteğimiz mevcuttur. Developer sayfasından API anahtarı oluşturabilirsiniz.' },
  { q: 'İptal politikası nedir?', a: 'İstediğiniz zaman iptal edebilirsiniz. Mevcut dönem sonuna kadar erişiminiz devam eder. İptal ücreti yoktur.' },
  { q: 'Backlink satın alabilir miyim?', a: 'Evet, Backlink Market özelliğimizle güvenilir Türk medyasından ve blog sitelerinden backlink satın alabilirsiniz.' },
  { q: 'Türkçe dil desteği var mı?', a: 'Platform tam Türkçe desteklidir. Ayrıca 8 dil seçeneği mevcuttur: Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, Arapça, Rusça ve Hintçe.' },
];

export default function SSSPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Sık Sorulan Sorular</h1>
            <p className="text-white/50">Bulamadığınız sorunuz varsa destek@funbreakseo.com adresine yazın</p>
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
            }) }}
          />
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="rounded-2xl border border-white/10 bg-white/2 group">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none">
                  <span className="font-medium text-white text-sm">{faq.q}</span>
                  <span className="text-white/40 group-open:rotate-180 transition-transform ml-4">&#9660;</span>
                </summary>
                <div className="px-6 pb-4 text-sm text-white/60 leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}