'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    q: 'FunBreak SEO hangi arama motorlarını destekliyor?',
    a: 'Google, Bing ve Yandex için teknik SEO ve sıralama takibi sunuyoruz. GEO özellikleri ise ChatGPT, Gemini, Perplexity, Claude, Google AI Overviews ve Google AI Mode platformlarını kapsar.',
  },
  {
    q: 'Ücretsiz deneme süresinde kredi kartı bilgisi girmem gerekiyor mu?',
    a: 'Hayır. 14 günlük ücretsiz deneme için kredi kartı bilgisi istenmez. Deneme süresi dolduğunda size hatırlatma yapılır ve dilediğiniz plana geçebilirsiniz.',
  },
  {
    q: 'GEO / AI Görünürlük özelliği nasıl çalışır?',
    a: 'Sektörünüze ve markanıza özel prompt\'lar oluşturuyoruz. Bu promptları düzenli aralıklarla ChatGPT, Gemini gibi platformlara gönderip cevapları analiz ediyoruz. Markanızın kaç kez mention edildiğini, kaç kez kaynak gösterildiğini (citation) ölçüyoruz.',
  },
  {
    q: 'Backlink Market\'te siparişlerim güvende mi?',
    a: 'Evet. Escrow sistemi kullanıyoruz: ödeme önce platformda tutulur, link yayınlandıktan ve doğrulandıktan sonra yayıncıya aktarılır. Herhangi bir sorun durumunda iade garantisi sunuyoruz.',
  },
  {
    q: 'Ajanssam, müşterilerimi platformda yönetebilir miyim?',
    a: 'Kesinlikle. Growth ve üzeri planlarda multi-proje yönetimi, white-label raporlar ve ekip üyesi davet özelliği bulunur. Kurumsal planda özel hesap yöneticisi desteği de alabilirsiniz.',
  },
  {
    q: 'Veri güvenliği nasıl sağlanıyor?',
    a: 'Verileriniz şifreli (AES-256) olarak Türkiye\'deki sunucularda saklanır. KVKK ve GDPR gerekliliklerine tam uyum sağlıyoruz. Verilerinizi hiçbir zaman üçüncü taraflarla satmıyoruz.',
  },
  {
    q: 'Fatura işlemleri nasıl oluyor?',
    a: 'Bireysel ve kurumsal fatura seçeneği sunuyoruz. Kurumsal faturada KDV muafiyeti uygulanır. Tüm faturalarınız platform üzerinden indirilebilir PDF formatında oluşturulur.',
  },
  {
    q: 'Aboneliği istediğim zaman iptal edebilir miyim?',
    a: 'Evet, dilediğiniz zaman iptal edebilirsiniz. İptal sonrası mevcut dönem sonuna kadar platforma erişiminiz devam eder. Aylık aboneliklerde iade politikası için İade ve İptal sayfamızı inceleyiniz.',
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8" id="sss">
      {/* JSON-LD FAQPage schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            })),
          }),
        }}
      />

      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Sık Sorulan Sorular</h2>
          <p className="text-white/50">Aklınızdaki soruların cevapları burada</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/5 transition-colors"
                aria-expanded={open === i}
              >
                <span className="text-sm font-medium text-white">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-white/40 flex-shrink-0 transition-transform',
                    open === i && 'rotate-180'
                  )}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-white/60 leading-relaxed border-t border-white/5 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
