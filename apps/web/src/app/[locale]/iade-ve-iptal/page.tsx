import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'İade ve İptal Politikası | FunBreak SEO',
};

export default function RefundPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-white mb-2">İade ve İptal Politikası</h1>
          <p className="text-white/40 text-sm mb-10">Son güncelleme: 1 Ocak 2025</p>

          <div className="prose prose-invert max-w-none space-y-8 text-white/70">
            <section>
              <h2>1. İptal</h2>
              <p>
                Aboneliğinizi platform ayarlarından (<strong>Hesabım &gt; Faturalama &gt; Aboneliği İptal Et</strong>)
                istediğiniz zaman iptal edebilirsiniz. İptal sonrası mevcut abonelik dönemi sonuna kadar
                platforma erişiminiz devam eder; bir sonraki dönem için ödeme alınmaz.
              </p>
            </section>

            <section>
              <h2>2. İade Koşulları</h2>
              <p>
                FunBreak SEO, dijital hizmet niteliğindedir. Genel kural olarak teslim edilmiş dijital
                hizmetler için iade yapılmamaktadır. Bununla birlikte aşağıdaki özel durumlar geçerlidir:
              </p>
              <ul>
                <li>
                  <strong>14 Günlük Deneme:</strong> Ücretsiz deneme süresinde herhangi bir ücret tahsil
                  edilmediğinden iade süreci başlamaz.
                </li>
                <li>
                  <strong>Teknik Hata:</strong> Platform&apos;un teknik bir arızası nedeniyle hizmetin
                  kullanılamaması durumunda, kanıtlanabilir kesinti süresine orantılı gün bazlı iade
                  değerlendirilebilir.
                </li>
                <li>
                  <strong>Yanlış Ücretlendirme:</strong> Sistemimizden kaynaklanan fazla veya hatalı
                  ücretlendirme durumlarında tam iade yapılır.
                </li>
                <li>
                  <strong>İlk Ay İptali:</strong> İlk abonelik ödemesinden itibaren 3 iş günü içinde
                  iptal talebinde bulunulması ve hizmetin kullanılmamış olması halinde, tam iade
                  değerlendirilir.
                </li>
              </ul>
            </section>

            <section>
              <h2>3. İade Kapsamı Dışı</h2>
              <ul>
                <li>Aktif olarak kullanılmış abonelik dönemleri</li>
                <li>Backlink market siparişleri (yayınlanmış olanlar)</li>
                <li>Wallet&apos;a yüklenmiş ve harcanmış bakiyeler</li>
                <li>Özel kurumsal projeler ve danışmanlık hizmetleri</li>
              </ul>
            </section>

            <section>
              <h2>4. İade Süreci</h2>
              <p>
                İade talebinizi <strong>destek@funbreakseo.com</strong> adresine e-posta ile veya
                platform destek sistemi üzerinden iletebilirsiniz. Talebiniz 3 iş günü içinde
                değerlendirilerek tarafınıza bilgi verilir. Onaylanan iadeler 5-10 iş günü içinde
                orijinal ödeme yönteminize yansır.
              </p>
            </section>

            <section>
              <h2>5. Backlink Market İade</h2>
              <p>
                Backlink market siparişlerinde escrow sistemi geçerlidir:
              </p>
              <ul>
                <li>Sipariş oluşturma aşamasında ödeme escrow&apos;da tutulur</li>
                <li>Link yayınlanmadıysa tam iade yapılır</li>
                <li>Link yayınlandı ancak doğrulanamadıysa tam iade yapılır</li>
                <li>Link yayınlanıp doğrulandıktan sonra itiraz 30 gün içinde yapılabilir</li>
              </ul>
            </section>

            <section>
              <h2>6. İletişim</h2>
              <p>
                İade ve iptal talepleriniz için:<br />
                <strong>E-posta:</strong> destek@funbreakseo.com<br />
                <strong>Telefon:</strong> 0533 448 82 53<br />
                <strong>Çalışma Saatleri:</strong> Pazartesi-Cuma 09:00-18:00
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
