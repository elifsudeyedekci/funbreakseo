import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'İade ve İptal Politikası | FunBreak SEO',
  description:
    'FunBreak SEO abonelik iptali, iade koşulları ve cayma hakkı hakkında kapsamlı bilgi.',
};

export default function RefundPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-white mb-2">İade ve İptal Politikası</h1>
          <p className="text-white/40 text-sm mb-10">Son güncelleme: Haziran 2026</p>

          <div className="prose prose-invert max-w-none space-y-10 text-white/70 leading-relaxed">

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Genel Bilgi</h2>
              <p>
                Bu İade ve İptal Politikası; <strong>FunBreak Global Teknoloji Ltd. Şti.</strong>{' '}
                (&quot;FunBreak SEO&quot; veya &quot;Şirket&quot;) tarafından sunulan ve funbreakseo.com adresi
                üzerinden erişilen SEO &amp; GEO optimizasyon SaaS platformu kapsamında
                gerçekleştirilen tüm abonelik işlemleri için geçerlidir.
              </p>
              <p>
                Platformumuz; teknik SEO tarama, anahtar kelime sıralama takibi, yapay zeka
                görünürlük analizi (GEO), içerik üretimi ve backlink yönetimi hizmetlerini
                dijital ortamda, anlık erişimli ve sürekli çevrimiçi biçimde sunmaktadır.
              </p>
              <p>
                Platforma kaydolarak veya herhangi bir abonelik planı satın alarak bu politikayı
                okuduğunuzu, anladığınızı ve tüm koşulları kabul ettiğinizi beyan etmiş
                sayılırsınız.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Abonelik İptali</h2>

              <h3 className="text-base font-semibold text-white/90 mb-2">2.1 İptal Nasıl Yapılır?</h3>
              <p>Aboneliğinizi aşağıdaki yöntemlerden biriyle iptal edebilirsiniz:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>
                  <strong>Panel üzerinden:</strong> Hesap Ayarları → Abonelik → Aboneliği İptal Et
                  adımlarını izleyerek self-servis iptal yapabilirsiniz.
                </li>
                <li>
                  <strong>E-posta ile:</strong>{' '}
                  <a href="mailto:iade@funbreakseo.com" className="text-indigo-400 hover:underline">
                    iade@funbreakseo.com
                  </a>{' '}
                  adresine kayıtlı e-posta hesabınızdan iptal talebinizi iletebilirsiniz. Hesap
                  e-postanızı ve abonelik ID&apos;nizi belirtmeniz gerekmektedir.
                </li>
              </ul>

              <h3 className="text-base font-semibold text-white/90 mt-5 mb-2">2.2 İptal Ne Zaman Etkili Olur?</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Aylık abonelikler:</strong> İptal talebi işlendiği anda abonelik
                  yenilenmez; mevcut fatura dönemi sonuna kadar platforma erişim devam eder.
                  Kalan süre için iade yapılmaz.
                </li>
                <li>
                  <strong>Yıllık abonelikler:</strong> İptal talebi işlendiği anda otomatik
                  yenileme durdurulur; yıllık dönem sonuna kadar erişim sürer. Erken iptal
                  durumunda kalan aylara ilişkin tutar nakit iade edilmez; hesap kredinize
                  aktarılır (bkz. Madde 4.4).
                </li>
              </ul>

              <h3 className="text-base font-semibold text-white/90 mt-5 mb-2">2.3 İptal Sonrası Veri</h3>
              <p>
                Abonelik sona erdikten 30 gün içinde hesabınız ve ilgili tüm veriler (projeler,
                raporlar, içerikler) kalıcı olarak silinir. Bu süre içinde verilerinizi dışa
                aktarmanız tavsiye edilir. Şirket, bu süre geçtikten sonra veri kaybından sorumlu
                tutulamaz.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Cayma Hakkı</h2>
              <p>
                6502 sayılı Tüketicinin Korunması Hakkında Kanun&apos;un 49. maddesi uyarınca
                tüketiciler, mesafeli sözleşmelerden 14 (on dört) gün içinde herhangi bir gerekçe
                göstermeksizin cayma hakkına sahiptir. <strong>Ancak</strong> aynı maddenin 4.
                fıkrası şu istisnayı açıkça düzenlemektedir:
              </p>
              <blockquote className="border-l-4 border-indigo-500/50 pl-4 my-4 text-white/60 italic">
                &quot;Abonelik sözleşmeleri kapsamında sunulan dijital içerik ve hizmetler; tüketicinin
                onayıyla ifaya başlanmış ise cayma hakkı kullanılamaz.&quot; — 6502 s. Kanun m. 49/4
              </blockquote>
              <p>
                FunBreak SEO tamamen dijital ve anlık erişimli bir hizmet platformudur. Kayıt
                işleminin tamamlanması ve abonelik bedelinin ödenmesinin ardından hesabınız anında
                aktive edilmekte, platforma erişim derhal başlamaktadır. Bu nedenle:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>
                  Hesap aktivasyonuyla birlikte 14 günlük cayma hakkı <strong>sona erer.</strong>
                </li>
                <li>
                  Platforma hiç giriş yapılmamış olsa dahi, aktivasyon gerçekleştiği için cayma
                  hakkı kullanılamaz.
                </li>
                <li>
                  Şirket, cayma hakkının kullanılamamasına ilişkin hususu kayıt aşamasında
                  açıkça bildirir ve kullanıcının onayını alır.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. İade Koşulları</h2>

              <h3 className="text-base font-semibold text-white/90 mb-2">4.1 Tam İade Yapılan Durumlar</h3>
              <p>
                Aşağıdaki durumlarda ödediğiniz tutar orijinal ödeme yönteminize tam olarak iade
                edilir:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>
                  <strong>Çift veya hatalı ödeme:</strong> Teknik bir arıza nedeniyle aynı
                  abonelik için birden fazla ödeme tahsil edilmişse fazladan alınan tutar 5-10 iş
                  günü içinde iade edilir.
                </li>
                <li>
                  <strong>Şirket kaynaklı aktivasyon hatası:</strong> Ödeme başarılı olmasına
                  karşın hesap 24 saat içinde aktive edilmemişse ve bu durum Şirket kaynaklıysa
                  tam iade yapılır.
                </li>
                <li>
                  <strong>Uzun süreli hizmet kesintisi:</strong> Şirket kaynaklı nedenlerle
                  platform 48 saati aşan kesintiye uğramışsa ve kullanıcı hiç yararlanamamışsa
                  orantılı iade (veya kullanıcı tercihine göre kredi) sağlanır.
                </li>
              </ul>

              <h3 className="text-base font-semibold text-white/90 mt-5 mb-2">
                4.2 Kredi Olarak Tanınan Durumlar
              </h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  Abonelik satın alınmış ancak platforma hiç giriş yapılmamışsa ve iptal talebi
                  ödeme tarihinden itibaren 48 saat içinde iletilmişse, ödenen tutar hesap
                  kredisine aktarılır. Bu kredi bir sonraki abonelik döneminde veya plan
                  yükseltmesinde kullanılabilir.
                </li>
              </ul>

              <h3 className="text-base font-semibold text-white/90 mt-5 mb-2">
                4.3 Kısmi Kullanım — İade Yapılmaz
              </h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  Abonelik dönemi başladıktan sonra platformun herhangi bir özelliği kullanılmışsa
                  (proje oluşturma, kelime tarama, içerik üretimi vb.) kalan süre için iade
                  yapılmaz.
                </li>
                <li>
                  &quot;Kullanmadım&quot; beyanı sistem loglarıyla çelişiyorsa iade talebi
                  reddedilir. Şirket, sistem kayıtlarını esas alır.
                </li>
              </ul>

              <h3 className="text-base font-semibold text-white/90 mt-5 mb-2">
                4.4 Yıllık Plan Erken İptal
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Yıllık aboneliğin erken feshedilmesi durumunda, kullanılmamış tam aylara
                  karşılık gelen tutar hesap kredisine aktarılır. Nakit iade yapılmaz.
                </li>
                <li>
                  Yıllık plan, aylık plana kıyasla indirimli sunulmaktadır. Kısmi kullanım
                  durumunda kullanılan aylar aylık liste fiyatıyla hesaplanır; varsa indirim farkı
                  düşülerek kalan tutar kredilendirilir.
                </li>
                <li>
                  Kredi başka bir kullanıcıya devredilemez veya nakde çevrilemez.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. İade Talep Süreci</h2>
              <ol className="list-decimal pl-6 space-y-3">
                <li>
                  <strong>Başvuru:</strong> İade talebinizi{' '}
                  <a href="mailto:iade@funbreakseo.com" className="text-indigo-400 hover:underline">
                    iade@funbreakseo.com
                  </a>{' '}
                  adresine kayıtlı e-posta hesabınızdan iletiniz. E-postada şunları belirtiniz:
                  ad-soyad, hesap e-posta adresi, abonelik planı ve ödeme tarihi, iade gerekçesi,
                  ödeme makbuzu veya işlem numarası.
                </li>
                <li>
                  <strong>Değerlendirme:</strong> Şirket talebi 3 (üç) iş günü içinde inceleyerek
                  sonucu e-posta ile bildirir.
                </li>
                <li>
                  <strong>Onay durumunda:</strong> İade işlemi orijinal ödeme yönteminize 5-10 iş
                  günü içinde yansır. Banka kaynaklı gecikmelerden Şirket sorumlu değildir.
                </li>
                <li>
                  <strong>Red durumunda:</strong> Gerekçe yazılı olarak bildirilir. İtiraz için{' '}
                  <a href="mailto:legal@funbreakseo.com" className="text-indigo-400 hover:underline">
                    legal@funbreakseo.com
                  </a>{' '}
                  adresine başvurulabilir.
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                6. İade Edilmeyecek Durumlar
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>SEO sıralama düşüşü:</strong> Google, Yandex veya diğer arama
                  motorlarının algoritma güncellemeleri nedeniyle oluşan sıralama değişiklikleri.
                  Şirket belirli sıralama garantisi vermez.
                </li>
                <li>
                  <strong>Beklenen sonuçların elde edilememesi:</strong> SEO çalışmalarının
                  beklenen sürede sonuç vermemesi SEO&apos;nun doğasına özgüdür ve iade gerekçesi
                  sayılmaz.
                </li>
                <li>
                  <strong>Kullanıcı hatası:</strong> Hatalı yapılandırma, yanlış proje kurulumu,
                  yanlış anahtar kelime seçimi gibi kullanıcı kaynaklı durumlar.
                </li>
                <li>
                  <strong>Fatura dönemi kapandıktan sonra yapılan talepler.</strong>
                </li>
                <li>
                  <strong>Hesap güvenliği ihmali:</strong> Kullanıcının şifresini paylaşması veya
                  güvensiz ortamda kullanması nedeniyle oluşan sorunlar.
                </li>
                <li>
                  <strong>Rakip platforma geçiş kararı</strong> tek başına iade gerekçesi
                  oluşturmaz.
                </li>
                <li>
                  <strong>Üçüncü taraf API/entegrasyon sorunları:</strong> Google Search Console,
                  Analytics gibi harici platformların kendi politika değişikliklerinden kaynaklanan
                  sorunlar.
                </li>
                <li>
                  <strong>Mücbir sebep:</strong> Deprem, sel, siber saldırı, elektrik kesintisi
                  gibi Şirket&apos;in kontrolü dışındaki olaylar.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Ödeme Yöntemi ve Süresi</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  İadeler, ödemenin yapıldığı orijinal yönteme (VakıfBank kart, Stripe vb.)
                  gerçekleştirilir. Farklı bir yönteme iade yapılmaz.
                </li>
                <li>Kredi kartı iadeleri 5-10 iş günü içinde kartınıza yansır.</li>
                <li>Hesap kredisi anında kullanılabilir hale gelir ve son kullanma tarihi yoktur.</li>
                <li>
                  Yabancı para birimiyle yapılan ödemelerin TL iadelelerinde iade tarihindeki kur
                  uygulanır; kur farkı Şirket&apos;e aittir.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                8. Abonelik Yenileme ve Hatırlatmalar
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Abonelikler dönem sonunda <strong>otomatik olarak yenilenir;</strong> kayıtlı
                  ödeme yönteminizden tahsilat yapılır.
                </li>
                <li>
                  Yenileme işleminden <strong>3 gün önce</strong> kayıtlı e-posta adresinize
                  hatırlatma bildirimi gönderilir.
                </li>
                <li>
                  Yenilenmesini istemiyorsanız fatura döneminin bitişinden önce aboneliğinizi
                  iptal etmelisiniz. Yenileme gerçekleştikten sonra yapılan iptal, o dönemi değil
                  bir sonraki dönemi iptal eder.
                </li>
                <li>
                  Ödeme başarısız olursa hizmet <strong>48 saat</strong> içinde askıya alınır.{' '}
                  <strong>7 takvim günü</strong> içinde ödeme yapılmazsa abonelik feshedilir ve
                  veriler silinme sürecine girer.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                9. Hizmet Kesintisi ve Tazminat Politikası
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  FunBreak SEO, %99,5 aylık erişim süresi (uptime) hedefler. Planlı bakım
                  süreleri en az 24 saat öncesinden duyurulur ve uptime hesabına dahil edilmez.
                </li>
                <li>
                  <strong>48 saati aşan Şirket kaynaklı kesintilerde</strong> orantılı hesap
                  kredisi otomatik oluşturulur:{' '}
                  <em>(Kesinti saati ÷ Aydaki toplam saat) × Aylık ücret = Kredi tutarı</em>
                </li>
                <li>Nakit iade yapılmaz; kredi bir sonraki fatura döneminde mahsup edilir.</li>
                <li>
                  Şirket kaynaklı kesintilerden doğan talep edilebilecek azami tazminat, o fatura
                  döneminin abonelik bedeli ile sınırlıdır.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. İletişim</h2>
              <ul className="list-none space-y-1 mt-2">
                <li>
                  <strong>İade E-posta:</strong>{' '}
                  <a href="mailto:iade@funbreakseo.com" className="text-indigo-400 hover:underline">
                    iade@funbreakseo.com
                  </a>
                </li>
                <li>
                  <strong>Hukuki İletişim:</strong>{' '}
                  <a href="mailto:legal@funbreakseo.com" className="text-indigo-400 hover:underline">
                    legal@funbreakseo.com
                  </a>
                </li>
                <li>
                  <strong>Şirket:</strong> FunBreak Global Teknoloji Ltd. Şti.
                </li>
                <li>
                  <strong>Yanıt Süresi:</strong> İş günlerinde en geç 2 (iki) iş günü
                </li>
              </ul>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
