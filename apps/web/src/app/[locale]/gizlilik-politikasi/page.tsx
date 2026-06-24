import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | FunBreak SEO',
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-white mb-2">Gizlilik Politikası</h1>
          <p className="text-white/40 text-sm mb-10">Son güncelleme: 1 Ocak 2025</p>

          <div className="prose prose-invert max-w-none space-y-8 text-white/70">
            <section>
              <h2>1. Giriş</h2>
              <p>
                FunBreak Global Teknoloji Ltd. Şti. (&quot;biz&quot;, &quot;Şirket&quot;) olarak gizliliğinize önem
                veriyoruz. Bu Gizlilik Politikası, funbreakseo.com platformunu kullanırken topladığımız,
                işlediğimiz ve sakladığımız bilgiler hakkında sizi bilgilendirmek amacıyla hazırlanmıştır.
              </p>
            </section>

            <section>
              <h2>2. Topladığımız Bilgiler</h2>
              <h3>Doğrudan Sağladığınız Bilgiler</h3>
              <ul>
                <li>Ad, soyad ve şirket bilgileri</li>
                <li>E-posta adresi ve telefon numarası</li>
                <li>Fatura ve ödeme bilgileri</li>
                <li>Destek talepleri ve iletişim geçmişi</li>
              </ul>
              <h3>Otomatik Toplanan Bilgiler</h3>
              <ul>
                <li>IP adresi ve coğrafi konum (şehir düzeyinde)</li>
                <li>Tarayıcı türü ve işletim sistemi</li>
                <li>Sayfa ziyaret geçmişi ve tıklama davranışları (onay verilmesi halinde)</li>
                <li>Oturum süreleri ve özellik kullanım istatistikleri</li>
              </ul>
              <h3>Entegrasyonlardan Gelen Bilgiler</h3>
              <ul>
                <li>Google Search Console verisi (bağlandığında)</li>
                <li>Yetkilendirdiğiniz üçüncü taraf platformlar</li>
              </ul>
            </section>

            <section>
              <h2>3. Bilgilerin Kullanım Amaçları</h2>
              <ul>
                <li>Platform hizmetinin sağlanması ve yönetimi</li>
                <li>Abonelik ve faturalama işlemleri</li>
                <li>Müşteri desteği</li>
                <li>Ürün geliştirme ve hizmet kalitesinin artırılması</li>
                <li>Güvenlik ve dolandırıcılık önleme</li>
                <li>Yasal yükümlülüklerin karşılanması</li>
                <li>Pazarlama iletişimleri (açık rıza ile)</li>
              </ul>
            </section>

            <section>
              <h2>4. Bilgi Paylaşımı</h2>
              <p>Kişisel bilgilerinizi üçüncü taraflarla şu durumlarda paylaşabiliriz:</p>
              <ul>
                <li><strong>Hizmet Sağlayıcılar:</strong> Platform altyapısı, e-posta servisi ve ödeme işleme için KVKK/GDPR uyumlu iş ortakları</li>
                <li><strong>Yasal Zorunluluklar:</strong> Yargı kararı veya yasal mevzuat gerektirdiğinde yetkili makamlar</li>
                <li><strong>İş Devri:</strong> Şirket birleşmesi veya satışı durumunda, yeni sahip aynı gizlilik yükümlülüklerini devralır</li>
              </ul>
              <p><strong>Verilerinizi reklam amaçlı üçüncü taraflarla hiçbir zaman paylaşmıyor veya satmıyoruz.</strong></p>
            </section>

            <section>
              <h2>5. Veri Güvenliği</h2>
              <p>
                Verilerinizin güvenliği için endüstri standardı güvenlik önlemleri uygulanmaktadır:
              </p>
              <ul>
                <li>Transit ve depolama sırasında AES-256 şifreleme</li>
                <li>SSL/TLS 1.3 protokolü</li>
                <li>İki faktörlü kimlik doğrulama seçeneği</li>
                <li>Düzenli güvenlik denetimleri ve penetrasyon testleri</li>
                <li>Rol tabanlı erişim kontrolü (RBAC)</li>
              </ul>
            </section>

            <section>
              <h2>6. Çerezler</h2>
              <p>
                Platform&apos;da zorunlu teknik çerezler ve isteğe bağlı analitik/pazarlama çerezleri kullanılmaktadır.
                Çerez tercihlerinizi her zaman platform üzerindeki Çerez Tercihleri panelinden yönetebilirsiniz.
                Ayrıntılar için <a href="/cerez-politikasi">Çerez Politikamızı</a> inceleyiniz.
              </p>
            </section>

            <section>
              <h2>7. Uluslararası Veri Aktarımları</h2>
              <p>
                Verileriniz öncelikle Türkiye&apos;deki sunucularda saklanır. Hizmet altyapısı kapsamında
                AB ülkelerine veri aktarımı yapılabilir; bu aktarımlar GDPR Madde 46 kapsamında
                standart sözleşme hükümleri ile güvence altına alınmaktadır.
              </p>
            </section>

            <section>
              <h2>8. Haklarınız</h2>
              <p>KVKK ve GDPR kapsamında aşağıdaki haklara sahipsiniz:</p>
              <ul>
                <li>Verilerinize erişim ve kopyasını talep etme</li>
                <li>Yanlış verilerin düzeltilmesini isteme</li>
                <li>Verilerinizin silinmesini talep etme (&quot;unutulma hakkı&quot;)</li>
                <li>İşlemenin kısıtlanmasını talep etme</li>
                <li>Veri taşınabilirliği hakkı</li>
                <li>Meşru menfaate dayalı işlemeye itiraz etme</li>
                <li>Pazarlama iletişimlerinden çıkma</li>
              </ul>
              <p>Haklarınızı kullanmak için: <strong>destek@funbreakseo.com</strong></p>
            </section>

            <section>
              <h2>9. İletişim</h2>
              <p>
                Gizlilik politikamıza ilişkin sorularınız için:<br />
                <strong>FunBreak Global Teknoloji Ltd. Şti.</strong><br />
                Çifte Havuzlar Mah. Eski Londra Asfaltı Cad. Kuluçka Merkezi B2 Blok No:151/1C Esenler/İstanbul<br />
                E-posta: destek@funbreakseo.com | Tel: 0533 448 82 53
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
