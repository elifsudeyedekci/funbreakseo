import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Çerez Politikası | FunBreak SEO',
};

export default function CookiePolicyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-white mb-2">Çerez Politikası</h1>
          <p className="text-white/40 text-sm mb-10">Son güncelleme: 1 Ocak 2025</p>

          <div className="prose prose-invert max-w-none space-y-8 text-white/70">
            <section>
              <h2>1. Çerez Nedir?</h2>
              <p>
                Çerezler, web sitelerinin tarayıcınıza yerleştirdiği küçük metin dosyalarıdır. Oturum
                bilgilerini saklamak, tercihlerinizi hatırlamak ve site deneyimini kişiselleştirmek için kullanılırlar.
              </p>
            </section>

            <section>
              <h2>2. Kullandığımız Çerez Türleri</h2>
              <h3>Zorunlu Çerezler (Her zaman aktif)</h3>
              <p>Platform&apos;un temel işlevleri için gereklidir. Bu çerezler olmadan platform düzgün çalışmaz ve kapatılamazlar.</p>
              <ul>
                <li><strong>session_id:</strong> Oturum kimliği — 24 saat</li>
                <li><strong>csrf_token:</strong> CSRF saldırı koruması — oturum sonuna kadar</li>
                <li><strong>locale:</strong> Dil tercihi — 1 yıl</li>
                <li><strong>funbreak_cookie_consent:</strong> Çerez tercihinizi saklar — 1 yıl</li>
              </ul>

              <h3>Analitik Çerezler (Onayınıza bağlı)</h3>
              <p>Platform kullanımını anlamamıza yardımcı olur. Bu veriler ürünü geliştirmemize katkı sağlar.</p>
              <ul>
                <li><strong>_analytics_session:</strong> Ziyaret istatistikleri — 30 dakika</li>
                <li><strong>_pageview_count:</strong> Sayfa görüntüleme sayısı — 90 gün</li>
              </ul>

              <h3>Pazarlama Çerezleri (Onayınıza bağlı)</h3>
              <p>Size ilgili reklamlar sunmak ve pazarlama kampanyalarının etkinliğini ölçmek için kullanılır.</p>
              <ul>
                <li><strong>_fbp:</strong> Meta (Facebook) piksel — 90 gün</li>
                <li><strong>_gcl_au:</strong> Google Ads dönüşüm takibi — 90 gün</li>
              </ul>
            </section>

            <section>
              <h2>3. Çerez Tercihlerinizi Yönetme</h2>
              <p>
                Platform&apos;a ilk girişinizde gösterilen çerez banner&apos;ı üzerinden tercihlerinizi belirleyebilirsiniz.
                Tercihlerinizi istediğiniz zaman güncellemek için sayfanın alt kısmındaki &quot;Çerez Tercihleri&quot;
                seçeneğine tıklayabilirsiniz.
              </p>
              <p>
                Tarayıcınızın ayarları üzerinden de tüm çerezleri veya belirli çerezleri engelleyebilirsiniz.
                Ancak zorunlu çerezleri engellemeniz durumunda platform bazı işlevlerini yerine getiremeyebilir.
              </p>
            </section>

            <section>
              <h2>4. Üçüncü Taraf Çerezler</h2>
              <p>
                Platform&apos;da yalnızca kendi çerezlerimizi kullanıyoruz. Üçüncü taraf analitik veya reklam
                çerezleri, yalnızca açık onayınız alındıktan sonra etkinleştirilir.
              </p>
            </section>

            <section>
              <h2>5. İletişim</h2>
              <p>
                Çerez politikamıza ilişkin sorularınız için: <strong>destek@funbreakseo.com</strong>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
