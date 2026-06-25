import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | FunBreak SEO',
  description:
    'FunBreak SEO platformunun gizlilik politikası — kişisel verilerin toplanması, işlenmesi ve korunması hakkında bilgilendirme.',
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-white mb-2">Gizlilik Politikası</h1>
          <p className="text-white/40 text-sm mb-10">Son güncelleme: Haziran 2026</p>

          <div className="prose prose-invert max-w-none space-y-10 text-white/70 leading-relaxed">

            {/* 1 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">1. Giriş ve Kapsam</h2>
              <p>
                Bu Gizlilik Politikası (&quot;Politika&quot;), <strong className="text-white">FunBreak Global Teknoloji Ltd. Şti.</strong>
                (&quot;Şirket&quot;, &quot;biz&quot; veya &quot;FunBreak SEO&quot;) tarafından işletilen{' '}
                <strong className="text-white">funbreakseo.com</strong> platformunun (&quot;Platform&quot;) kullanıcılarına
                (&quot;Kullanıcı&quot; veya &quot;Siz&quot;) ait kişisel verilerin nasıl toplandığını, işlendiğini, saklandığını ve
                korunduğunu açıklamak amacıyla hazırlanmıştır.
              </p>
              <p>
                Bu Politika; 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;), 6563 sayılı Elektronik
                Ticaret Kanunu, 5651 sayılı İnternet Ortamında Yapılan Yayınların Düzenlenmesi Hakkında Kanun ve
                Avrupa Birliği Genel Veri Koruma Tüzüğü (&quot;GDPR&quot;) kapsamındaki yükümlülüklerimizi karşılamak
                üzere düzenlenmiştir.
              </p>
              <p>
                Platformu kullanmaya devam etmekle bu Politika kapsamında kişisel verilerinizin işlenmesini kabul
                etmiş sayılırsınız. Bu Politikayı kabul etmiyorsanız Platformu kullanmayınız.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">2. Veri Sorumlusu</h2>
              <p>KVKK kapsamında veri sorumlusu sıfatını taşıyan şirketimizin bilgileri aşağıdadır:</p>
              <div className="bg-white/5 rounded-xl p-5 mt-3 space-y-1 text-sm">
                <p><span className="text-white/50">Ünvan:</span> FunBreak Global Teknoloji Ltd. Şti.</p>
                <p><span className="text-white/50">Platform:</span> funbreakseo.com</p>
                <p><span className="text-white/50">E-posta:</span> legal@funbreakseo.com</p>
                <p><span className="text-white/50">Destek:</span> destek@funbreakseo.com</p>
              </div>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">3. Toplanan Kişisel Veriler</h2>
              <p>Platformumuz üzerinden aşağıdaki kategorilerde kişisel veriler toplanmaktadır:</p>

              <h3 className="text-white font-medium mt-5 mb-2">3.1 Kimlik Verileri</h3>
              <ul>
                <li>Ad, soyad</li>
                <li>Şirket unvanı ve vergi numarası</li>
                <li>Kullanıcı adı ve hesap kimliği</li>
              </ul>

              <h3 className="text-white font-medium mt-5 mb-2">3.2 İletişim Verileri</h3>
              <ul>
                <li>E-posta adresi</li>
                <li>Telefon numarası (isteğe bağlı)</li>
                <li>Fatura adresi (şehir, ülke)</li>
              </ul>

              <h3 className="text-white font-medium mt-5 mb-2">3.3 Finansal Veriler</h3>
              <ul>
                <li>Ödeme yöntemi tipi (kart/havale) — kart numarası Şirketimiz tarafından saklanmaz</li>
                <li>Fatura tutarı, abonelik planı ve ödeme geçmişi</li>
                <li>Vergi kimlik numarası (e-fatura için)</li>
              </ul>

              <h3 className="text-white font-medium mt-5 mb-2">3.4 Kullanım Verileri</h3>
              <ul>
                <li>Eklenen web sitesi projeleri ve anahtar kelimeler</li>
                <li>Platform içi davranışlar (tıklama, oturum süresi, ziyaret edilen sayfalar)</li>
                <li>Oluşturulan raporlar ve içerikler</li>
                <li>Destek talepleri ve iletişim geçmişi</li>
              </ul>

              <h3 className="text-white font-medium mt-5 mb-2">3.5 Teknik Veriler</h3>
              <ul>
                <li>IP adresi (şehir düzeyinde coğrafi konum)</li>
                <li>Tarayıcı türü, sürümü ve işletim sistemi</li>
                <li>Oturum çerezleri ve tercih çerezleri</li>
                <li>Hata günlükleri (log kayıtları)</li>
                <li>Cihaz türü (masaüstü/mobil)</li>
              </ul>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">4. Verilerin İşlenme Amaçları ve Hukuki Sebepleri</h2>
              <p>Kişisel verileriniz KVKK Madde 5 kapsamındaki aşağıdaki hukuki sebeplere dayanılarak işlenmektedir:</p>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm border border-white/10 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="text-left p-3 text-white font-medium">Amaç</th>
                      <th className="text-left p-3 text-white font-medium">Hukuki Dayanak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Hesap oluşturma ve kimlik doğrulama', 'KVKK m.5/2-c — Sözleşmenin kurulması ve ifası'],
                      ['Abonelik yönetimi ve faturalandırma', 'KVKK m.5/2-c — Sözleşmenin ifası; m.5/2-ç — Hukuki yükümlülük'],
                      ['Müşteri desteği ve iletişim', 'KVKK m.5/2-c — Sözleşmenin ifası'],
                      ['Platform güvenliği ve dolandırıcılık önleme', 'KVKK m.5/2-f — Meşru menfaat'],
                      ['Ürün iyileştirme ve kullanım analizi', 'KVKK m.5/1 — Açık rıza'],
                      ['Pazarlama ve kampanya bildirimleri', 'KVKK m.5/1 — Açık rıza; 6563 sayılı Kanun'],
                      ['Yasal yükümlülüklerin yerine getirilmesi (e-fatura, vergi)', 'KVKK m.5/2-ç — Hukuki yükümlülük'],
                      ['Hizmet kalitesi ve performans ölçümü', 'KVKK m.5/2-f — Meşru menfaat'],
                    ].map(([purpose, basis]) => (
                      <tr key={purpose} className="border-t border-white/10">
                        <td className="p-3">{purpose}</td>
                        <td className="p-3 text-white/50 text-xs">{basis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">5. Verilerin Aktarıldığı Taraflar</h2>
              <p>
                Kişisel verileriniz, üçüncü taraflara satılmamakta veya kiralanmamaktadır. Yalnızca hizmetin
                ifası için zorunlu olan aşağıdaki taraflarla ve yalnızca gerekli ölçüde paylaşılmaktadır:
              </p>

              <div className="space-y-4 mt-4">
                {[
                  { name: 'VakıfBank Sanal POS', desc: 'Ödeme işlemlerinin güvenli şekilde gerçekleştirilmesi amacıyla ad-soyad, fatura tutarı ve kart bilgileri aktarılır. Kart numarası Şirketimizde saklanmaz.' },
                  { name: 'DataForSEO', desc: 'Anahtar kelime araştırması, sıralama takibi ve backlink analizi için sorgu verileri (web sitesi URL, anahtar kelimeler) aktarılır. Kişisel kimlik verisi iletilmez.' },
                  { name: 'Anthropic (Claude AI)', desc: 'İçerik üretimi ve analiz için metin verisi işlenir. Kişisel kimlik verisi iletilmez; gönderilen içerikler kullanıcı tarafından sağlanır.' },
                  { name: 'Google (OAuth / GSC)', desc: 'Kullanıcının Google Search Console hesabını Platform\'a bağlaması halinde OAuth erişim token\'ı ve GSC verileri işlenir. Google\'ın Gizlilik Politikası geçerlidir.' },
                  { name: 'Paraşüt', desc: 'Yasal e-fatura düzenlemesi için fatura bilgileri (ad-soyad, vergi no, tutar) aktarılır.' },
                  { name: 'SMTP / E-posta Sağlayıcısı', desc: 'Sistem bildirimlerinin (hesap onayı, fatura, uyarı) iletilmesi için e-posta adresi kullanılır.' },
                  { name: 'Cloudflare / Hosting Sağlayıcısı', desc: 'Sunucu güvenliği ve DDoS koruması için IP adresi ve istek logları altyapı sağlayıcımızca işlenir.' },
                  { name: 'Sentry (Hata İzleme)', desc: 'Platform hatalarının tespiti için anonim hata günlükleri ve cihaz bilgileri işlenir.' },
                  { name: 'Yetkili Kamu Kuruluşları', desc: 'Yasal yükümlülükler çerçevesinde mahkeme, savcılık veya düzenleyici kurumların talepleri karşılanır.' },
                ].map((item) => (
                  <div key={item.name} className="bg-white/5 rounded-lg p-4">
                    <p className="text-white font-medium text-sm mb-1">{item.name}</p>
                    <p className="text-white/50 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">6. Verilerin Saklanma Süreleri</h2>
              <p>Kişisel verileriniz, işlenme amacının gerektirdiği süre ve yasal yükümlülükler çerçevesinde saklanır:</p>
              <ul className="mt-3 space-y-2">
                <li><strong className="text-white">Hesap ve kullanım verileri:</strong> Hesabın aktif olduğu süre boyunca; hesap silinmesinden itibaren 1 yıl</li>
                <li><strong className="text-white">Finansal kayıtlar ve faturalar:</strong> Vergi mevzuatı gereği 10 yıl</li>
                <li><strong className="text-white">E-posta ve iletişim geçmişi:</strong> Son iletişimden itibaren 3 yıl</li>
                <li><strong className="text-white">Sunucu erişim logları:</strong> 6 ay (5651 sayılı Kanun yükümlülüğü)</li>
                <li><strong className="text-white">Pazarlama izinleri ve ret kayıtları:</strong> İzin verildiği günden itibaren 3 yıl veya ret tarihine kadar</li>
                <li><strong className="text-white">Çerez verileri:</strong> Çerez türüne göre oturum sonuna kadar veya 24 ay</li>
              </ul>
              <p className="mt-3 text-sm text-white/50">
                Saklama süresi dolan veriler, Şirketimizin periyodik temizleme prosedürleri kapsamında güvenli biçimde silinir, yok edilir veya anonim hale getirilir.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">7. İlgili Kişi Hakları (KVKK Madde 11)</h2>
              <p>KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
              <ul className="mt-3 space-y-2">
                <li><strong className="text-white">a)</strong> Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                <li><strong className="text-white">b)</strong> İşlenmişse buna ilişkin bilgi talep etme</li>
                <li><strong className="text-white">c)</strong> İşlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                <li><strong className="text-white">ç)</strong> Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
                <li><strong className="text-white">d)</strong> Eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme</li>
                <li><strong className="text-white">e)</strong> KVKK m.7 çerçevesinde silinmesini veya yok edilmesini isteme</li>
                <li><strong className="text-white">f)</strong> Düzeltme ve silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
                <li><strong className="text-white">g)</strong> İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize sonuç oluşmasına itiraz etme</li>
                <li><strong className="text-white">ğ)</strong> Kanuna aykırı işleme nedeniyle zarara uğraması hâlinde zararın giderilmesini talep etme</li>
              </ul>
              <p className="mt-4 text-sm">
                Başvurularınızı <strong className="text-white">legal@funbreakseo.com</strong> adresine yazılı olarak iletebilirsiniz.
                Talepleriniz, başvuru tarihinden itibaren en geç <strong className="text-white">30 (otuz) gün</strong> içinde sonuçlandırılacaktır.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">8. Çerez Politikası</h2>
              <p>
                Platformumuz; oturum yönetimi, tercih saklama, analiz ve güvenlik amacıyla çerezler kullanmaktadır.
                Çerez türleri, süreler ve kullanım amaçları hakkında ayrıntılı bilgiye{' '}
                <a href="/cerez-politikasi" className="text-indigo-400 hover:text-indigo-300">Çerez Politikamız</a>'ndan ulaşabilirsiniz.
                Tarayıcı ayarlarınızdan zorunlu olmayan çerezleri reddedebilirsiniz; bu durumda bazı platform
                özellikleri kısıtlı çalışabilir.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">9. Güvenlik Önlemleri</h2>
              <p>Kişisel verilerinizin güvenliği için aşağıdaki teknik ve idari tedbirler uygulanmaktadır:</p>
              <ul className="mt-3 space-y-1">
                <li>TLS 1.3 şifreli HTTPS bağlantısı (tüm veri iletimlerinde)</li>
                <li>Veritabanı düzeyinde şifreleme (AES-256)</li>
                <li>API anahtarlarının şifreli saklanması</li>
                <li>Rol tabanlı erişim kontrolü (RBAC) — yalnızca yetkili personel erişimi</li>
                <li>Düzenli güvenlik taramaları ve penetrasyon testleri</li>
                <li>Otomatik oturum zaman aşımı</li>
                <li>İki faktörlü kimlik doğrulama (2FA) desteği</li>
                <li>DDoS koruması ve Web Application Firewall (WAF)</li>
                <li>Çalışan gizlilik eğitimleri ve gizlilik sözleşmeleri</li>
              </ul>
              <p className="mt-3 text-sm text-white/50">
                Hiçbir elektronik iletim veya depolama yöntemi %100 güvenli değildir. Ticari açıdan makul önlemleri
                uygulamamıza karşın mutlak güvenlik garanti edilemez.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">10. Uluslararası Veri Transferi</h2>
              <p>
                Platform, Türkiye dışındaki sunucularda barındırılan bazı üçüncü taraf hizmetleri kullanmaktadır
                (DataForSEO, Anthropic, Cloudflare). Bu transferler KVKK Madde 9 ve GDPR Madde 46 kapsamındaki
                uygun güvencelerle gerçekleştirilmektedir:
              </p>
              <ul className="mt-3 space-y-1">
                <li>AB Komisyonu tarafından yeterli koruma kararı alınmış ülkelere transfer</li>
                <li>Standart Sözleşme Maddeleri (SCCs) kapsamında veri işleme sözleşmeleri</li>
                <li>Hizmet sağlayıcıların GDPR / ISO 27001 uyumluluğu</li>
              </ul>
              <p className="mt-3 text-sm text-white/50">
                AB/AEA dışına gerçekleştirilen transferlerde, alıcı ülkenin veri koruma standartları değerlendirilerek
                gerekli ek güvenceler sağlanmaktadır.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">11. Politika Değişiklikleri</h2>
              <p>
                Şirketimiz, bu Politikayı yasal düzenlemeler, platform değişiklikleri veya iş ihtiyaçları
                doğrultusunda güncelleme hakkını saklı tutar. Önemli değişiklikler, kayıtlı e-posta adresinize
                bildirim yapılarak duyurulacaktır. Değişikliğin yayımlanmasından sonra Platformu kullanmaya
                devam etmeniz güncel Politikayı kabul ettiğiniz anlamına gelir.
              </p>
              <p className="mt-2 text-sm text-white/50">
                Politikanın önceki sürümlerine destek@funbreakseo.com adresi üzerinden talep edebilirsiniz.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">12. İletişim ve Şikayet Hakkı</h2>
              <p>
                Bu Politika veya kişisel verilerinizin işlenmesine ilişkin sorularınız için:
              </p>
              <div className="bg-white/5 rounded-xl p-5 mt-3 space-y-1 text-sm">
                <p><span className="text-white/50">Hukuki Talepler:</span> legal@funbreakseo.com</p>
                <p><span className="text-white/50">Genel Destek:</span> destek@funbreakseo.com</p>
              </div>
              <p className="mt-4 text-sm">
                KVKK kapsamındaki haklarınızı kullanmak için başvurunuzu yukarıdaki e-posta adresine
                &quot;KVKK Başvurusu&quot; konusuyla iletebilirsiniz. Talebiniz 30 gün içinde yanıtlanacaktır.
                Şikayetleriniz için ayrıca{' '}
                <strong className="text-white">Kişisel Verileri Koruma Kurumu (KVKK)</strong>'na başvurma hakkınız saklıdır.
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
