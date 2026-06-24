import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Kullanım Şartları | FunBreak SEO',
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-white mb-2">Kullanım Şartları</h1>
          <p className="text-white/40 text-sm mb-10">Son güncelleme: 1 Ocak 2025</p>

          <div className="prose prose-invert max-w-none space-y-8 text-white/70">
            <section>
              <h2>1. Taraflar ve Kapsam</h2>
              <p>
                Bu Kullanım Şartları (&quot;Şartlar&quot;), <strong>FunBreak Global Teknoloji Ltd. Şti.</strong>
                (&quot;FunBreak SEO&quot; veya &quot;Şirket&quot;) ile FunBreak SEO web uygulamasını (&quot;Platform&quot;) kullanan
                bireysel kullanıcı veya tüzel kişilik (&quot;Kullanıcı&quot;) arasındaki yasal sözleşmeyi oluşturur.
              </p>
              <p>
                Platforma kaydolarak veya herhangi bir şekilde kullanarak bu Şartları kabul etmiş sayılırsınız.
                Şartları kabul etmiyorsanız Platformu kullanmayınız.
              </p>
            </section>

            <section>
              <h2>2. Hizmet Tanımı</h2>
              <p>
                FunBreak SEO, aşağıdaki hizmetleri kapsayan bir SaaS (Yazılım Hizmeti) platformudur:
              </p>
              <ul>
                <li>Teknik SEO tarama ve sağlık analizi</li>
                <li>Anahtar kelime sıralama takibi</li>
                <li>GEO / Yapay Zeka görünürlük izleme</li>
                <li>AI destekli içerik üretimi</li>
                <li>Backlink profili analizi ve pazar yeri</li>
                <li>Dijital PR ve outreach kampanya yönetimi</li>
                <li>Rapor oluşturma ve planlama</li>
              </ul>
            </section>

            <section>
              <h2>3. Hesap Oluşturma ve Güvenlik</h2>
              <p>
                Platform&apos;a erişim için hesap oluşturmanız gerekmektedir. Kayıt sırasında sağladığınız
                bilgilerin doğru, güncel ve eksiksiz olmasından sorumlusunuz. Hesap güvenliğinizden
                (şifrenizi güvende tutmak, yetkisiz erişimleri bildirmek) tamamen siz sorumlusunuz.
              </p>
              <p>
                Hesabınızı başkalarıyla paylaşmamalı, satmamalı veya devretmemelisiniz. Her bir kullanıcı
                hesabı yalnızca bir kişiye aittir.
              </p>
            </section>

            <section>
              <h2>4. Abonelik ve Ödeme</h2>
              <p>
                Platform, aylık veya yıllık abonelik modeli ile sunulmaktadır. Fiyatlar KDV dahildir
                ve Türk Lirası (₺) cinsinden belirtilir.
              </p>
              <ul>
                <li>Abonelikler, iptal edilmediği sürece otomatik olarak yenilenir</li>
                <li>Ödeme, her dönem başında tahsil edilir</li>
                <li>İptal, dönem sonuna kadar geçerlidir; kullanılmayan süre için iade yapılmaz</li>
                <li>Fiyat değişiklikleri en az 30 gün önceden bildirilir</li>
                <li>Başarısız ödemeler durumunda hesap 7 gün içinde askıya alınabilir</li>
              </ul>
            </section>

            <section>
              <h2>5. Kullanım Sınırlamaları</h2>
              <p>Platformu aşağıdaki amaçlarla kullanamazsınız:</p>
              <ul>
                <li>Yasalara aykırı, yanıltıcı veya zarar verici içerik üretmek</li>
                <li>Spam, kötü amaçlı yazılım veya dolandırıcılık faaliyetleri yürütmek</li>
                <li>Platformun altyapısına aşırı yük bindirmek veya aksatmak</li>
                <li>Üçüncü tarafların fikri mülkiyet haklarını ihlal etmek</li>
                <li>Platform&apos;u rakip bir ürün geliştirmek amacıyla reverse-engineer etmek</li>
                <li>Başkalarının hesabına yetkisiz erişim sağlamak</li>
              </ul>
            </section>

            <section>
              <h2>6. Fikri Mülkiyet</h2>
              <p>
                Platform, yazılım, tasarım, logo ve içeriklerinin tüm fikri mülkiyet hakları
                FunBreak Global Teknoloji Ltd. Şti.&apos;ye aittir. Platforma erişim, bu hakların
                size devredildiği anlamına gelmez.
              </p>
              <p>
                Kullanıcılar tarafından platforma yüklenen içerikler (domain verileri, anahtar kelimeler vb.)
                kullanıcıya ait olmaya devam eder. Şirket, yalnızca hizmetin sağlanması amacıyla
                bu verileri işleme yetkisine sahiptir.
              </p>
            </section>

            <section>
              <h2>7. Gizlilik ve Veri Koruma</h2>
              <p>
                Kişisel verilerinizin nasıl işlendiği hakkında bilgi almak için{' '}
                <a href="/kvkk">KVKK Aydınlatma Metni</a>&apos;ni ve{' '}
                <a href="/gizlilik-politikasi">Gizlilik Politikamızı</a> inceleyiniz.
              </p>
            </section>

            <section>
              <h2>8. Garanti Reddi ve Sorumluluk Sınırlaması</h2>
              <p>
                FunBreak SEO, platformu &quot;olduğu gibi&quot; sunmaktadır. Sıralama artışı, trafik artışı
                veya belirli iş sonuçları garanti edilmez. SEO sonuçları pek çok faktöre bağlıdır
                ve kesin bir başarı garantisi verilemez.
              </p>
              <p>
                Şirket&apos;in sorumluluğu, herhangi bir durumda son 12 aylık abonelik bedelini
                aşamaz. Dolaylı, tesadüfi veya sonuç zararlarından Şirket sorumlu tutulamaz.
              </p>
            </section>

            <section>
              <h2>9. Hizmetin Durdurulması</h2>
              <p>
                Şirket, aşağıdaki durumlarda hesabınızı askıya alma veya sonlandırma hakkını saklı tutar:
              </p>
              <ul>
                <li>Bu Şartların ihlali</li>
                <li>Ödeme yükümlülüklerinin yerine getirilmemesi</li>
                <li>Platformun kötüye kullanımı</li>
                <li>Yasal zorunluluklar</li>
              </ul>
            </section>

            <section>
              <h2>10. Uygulanacak Hukuk ve Yetki</h2>
              <p>
                Bu Şartlar, Türkiye Cumhuriyeti hukukuna tabidir. Anlaşmazlıklarda İstanbul
                (Çağlayan) Mahkemeleri ve İcra Daireleri yetkilidir.
              </p>
            </section>

            <section>
              <h2>11. Değişiklikler</h2>
              <p>
                Şirket, bu Şartları dilediği zaman değiştirme hakkını saklı tutar. Önemli değişiklikler
                e-posta yoluyla ve Platform üzerinden duyurulur. Değişiklikten sonra Platformu kullanmaya
                devam etmeniz, yeni Şartları kabul ettiğiniz anlamına gelir.
              </p>
            </section>

            <section>
              <h2>12. İletişim</h2>
              <p>
                Bu Şartlara ilişkin sorularınız için:
                <br /><strong>E-posta:</strong> destek@funbreakseo.com
                <br /><strong>Telefon:</strong> 0533 448 82 53
                <br /><strong>Adres:</strong> Çifte Havuzlar Mah. Eski Londra Asfaltı Cad. Kuluçka Merkezi B2 Blok No:151/1C İç Kapı No:2B Esenler/İstanbul
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
