import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Çerez Politikası | FunBreak SEO',
  description:
    'FunBreak SEO platformunda kullanılan çerez türleri, amaçları, saklama süreleri ve çerez tercihlerinizi nasıl yönetebileceğiniz hakkında bilgi alın.',
};

export default function CookiePolicyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-white mb-2">Çerez Politikası</h1>
          <p className="text-white/40 text-sm mb-10">Son güncelleme: Haziran 2026 · Yürürlük tarihi: Haziran 2026</p>

          <div className="prose prose-invert max-w-none space-y-10 text-white/70">

            {/* 1 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">1. Çerez Nedir ve Neden Kullanılır?</h2>
              <p>
                Çerezler (cookie), ziyaret ettiğiniz web sitesi tarafından tarayıcınıza veya cihazınıza
                yerleştirilen küçük metin dosyalarıdır. Çerezler; oturum bilgilerini güvenli biçimde saklamamızı,
                tercihlerinizi hatırlamamızı, Platform performansını analiz etmemizi ve size kişiselleştirilmiş
                bir deneyim sunmamızı sağlar.
              </p>
              <p>
                Çerezlere ek olarak Platform; yerel depolama (localStorage), oturum depolama (sessionStorage)
                ve piksel etiketleri gibi benzer izleme teknolojilerini de kullanabilir. Bu Çerez Politikası,
                tüm bu teknolojileri kapsamaktadır.
              </p>
              <p>
                Bu politika; 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK), 7 Nisan 2016 tarihli
                Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi Hakkında Yönetmelik
                ve Avrupa Genel Veri Koruma Tüzüğü (GDPR — yabancı ziyaretçiler için) kapsamında hazırlanmıştır.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">2. Kullandığımız Çerez Türleri</h2>

              <h3 className="text-white/90 font-medium mt-5 mb-3">2.1 Zorunlu Çerezler</h3>
              <p>
                Bu çerezler, Platformun temel işlevleri için vazgeçilmezdir ve Platformun güvenli çalışmasını
                sağlar. Zorunlu çerezler için onay alınmasına gerek yoktur ve devre dışı bırakılamazlar;
                bu çerezler olmadan Platform doğru şekilde çalışmaz.
              </p>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-white/50 border-b border-white/10">
                      <th className="text-left py-2 pr-4 font-medium">Çerez Adı</th>
                      <th className="text-left py-2 pr-4 font-medium">Amaç</th>
                      <th className="text-left py-2 font-medium">Süre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">funbreak_session</td>
                      <td className="py-2 pr-4">Kullanıcı oturumunu güvenli tutar, kimlik doğrulama bilgilerini saklar</td>
                      <td className="py-2 whitespace-nowrap">Oturum sonu</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">funbreak_jwt</td>
                      <td className="py-2 pr-4">JWT token — API isteklerinde kimlik doğrulamak için kullanılır</td>
                      <td className="py-2 whitespace-nowrap">7 gün</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">csrf_token</td>
                      <td className="py-2 pr-4">Siteler arası istek sahteciliği (CSRF) saldırılarına karşı koruma</td>
                      <td className="py-2 whitespace-nowrap">Oturum sonu</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">funbreak_locale</td>
                      <td className="py-2 pr-4">Seçilen dil tercihini hatırlar (TR, EN, DE vb.)</td>
                      <td className="py-2 whitespace-nowrap">1 yıl</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">funbreak_cookie_consent</td>
                      <td className="py-2 pr-4">Çerez onay tercihlerinizi saklar; her ziyarette banner gösterilmesini önler</td>
                      <td className="py-2 whitespace-nowrap">1 yıl</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">__cf_bm</td>
                      <td className="py-2 pr-4">Cloudflare bot yönetimi — insan/bot ayrımı için güvenlik çerezi</td>
                      <td className="py-2 whitespace-nowrap">30 dakika</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-white/90 font-medium mt-6 mb-3">2.2 Tercih Çerezleri</h3>
              <p>
                Bu çerezler, Platform deneyiminizi kişiselleştirmek için kullanılır. Kapatılabilirler;
                ancak bazı özelliklerin doğru çalışmamasına neden olabilir.
              </p>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-white/50 border-b border-white/10">
                      <th className="text-left py-2 pr-4 font-medium">Çerez Adı</th>
                      <th className="text-left py-2 pr-4 font-medium">Amaç</th>
                      <th className="text-left py-2 font-medium">Süre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">funbreak_theme</td>
                      <td className="py-2 pr-4">Seçilen tema tercihini (koyu/açık) saklar</td>
                      <td className="py-2 whitespace-nowrap">1 yıl</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">funbreak_sidebar</td>
                      <td className="py-2 pr-4">Gösterge paneli kenar çubuğu açık/kapalı durumunu saklar</td>
                      <td className="py-2 whitespace-nowrap">Kalıcı</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">funbreak_tour_done</td>
                      <td className="py-2 pr-4">Ürün tanıtım turunun tamamlandığını işaretler</td>
                      <td className="py-2 whitespace-nowrap">Kalıcı</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">funbreak_currency</td>
                      <td className="py-2 pr-4">Seçilen görüntüleme para birimini saklar (₺, $, €)</td>
                      <td className="py-2 whitespace-nowrap">1 yıl</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-white/90 font-medium mt-6 mb-3">2.3 Analitik Çerezler</h3>
              <p>
                Bu çerezler; Platform kullanım istatistiklerini toplar, hangi sayfaların daha fazla ziyaret
                edildiğini ve Kullanıcıların Platform ile nasıl etkileşime girdiğini anlamamıza yardımcı olur.
                Toplanan veriler anonim/takma adlı olup doğrudan kimlik tespitine kullanılmaz.
                Bu çerezlerin kullanımı için onayınız gerekmektedir.
              </p>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-white/50 border-b border-white/10">
                      <th className="text-left py-2 pr-4 font-medium">Çerez / Araç</th>
                      <th className="text-left py-2 pr-4 font-medium">Sağlayıcı</th>
                      <th className="text-left py-2 pr-4 font-medium">Amaç</th>
                      <th className="text-left py-2 font-medium">Süre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">_ga, _ga_*</td>
                      <td className="py-2 pr-4">Google Analytics 4</td>
                      <td className="py-2 pr-4">Sayfa görüntüleme, oturum, dönüşüm takibi (IP anonimleştirilir)</td>
                      <td className="py-2 whitespace-nowrap">2 yıl</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">_gid</td>
                      <td className="py-2 pr-4">Google Analytics</td>
                      <td className="py-2 pr-4">24 saatlik kullanıcı oturumu takibi</td>
                      <td className="py-2 whitespace-nowrap">24 saat</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">sentry-sc</td>
                      <td className="py-2 pr-4">Sentry</td>
                      <td className="py-2 pr-4">JavaScript hata ve performans izleme (prod ortamında)</td>
                      <td className="py-2 whitespace-nowrap">Oturum</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-white/90 font-medium mt-6 mb-3">2.4 Pazarlama ve Yeniden Hedefleme Çerezleri</h3>
              <p>
                Bu çerezler, size ilgi alanlarınıza uygun reklamlar göstermek ve kampanya etkinliğini ölçmek
                amacıyla kullanılır. Yalnızca açık onayınız alındıktan sonra etkinleştirilir ve istediğiniz
                zaman devre dışı bırakabilirsiniz.
              </p>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-white/50 border-b border-white/10">
                      <th className="text-left py-2 pr-4 font-medium">Çerez</th>
                      <th className="text-left py-2 pr-4 font-medium">Sağlayıcı</th>
                      <th className="text-left py-2 pr-4 font-medium">Amaç</th>
                      <th className="text-left py-2 font-medium">Süre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">_fbp</td>
                      <td className="py-2 pr-4">Meta (Facebook)</td>
                      <td className="py-2 pr-4">Facebook/Instagram reklam dönüşüm takibi</td>
                      <td className="py-2 whitespace-nowrap">90 gün</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">_fbc</td>
                      <td className="py-2 pr-4">Meta (Facebook)</td>
                      <td className="py-2 pr-4">Reklam tıklama kaynağı takibi</td>
                      <td className="py-2 whitespace-nowrap">90 gün</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">_gcl_au</td>
                      <td className="py-2 pr-4">Google Ads</td>
                      <td className="py-2 pr-4">Google reklam dönüşüm ve yeniden hedefleme</td>
                      <td className="py-2 whitespace-nowrap">90 gün</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono text-xs text-indigo-300">li_fat_id</td>
                      <td className="py-2 pr-4">LinkedIn</td>
                      <td className="py-2 pr-4">LinkedIn reklam dönüşüm takibi (B2B hedefleme)</td>
                      <td className="py-2 whitespace-nowrap">30 gün</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">3. Üçüncü Taraf Çerezleri</h2>
              <p>
                Platform, aşağıdaki üçüncü tarafların çerezlerini veya komut dosyalarını kullanabilir.
                Bu üçüncü tarafların kendi gizlilik politikaları mevcuttur ve işledikleri veriler
                kendi sorumluluklarındadır:
              </p>
              <ul>
                <li>
                  <strong>Google LLC</strong> — Analytics 4, Search Console entegrasyonu, reCAPTCHA.
                  Gizlilik: <span className="text-white/40">policies.google.com/privacy</span>
                </li>
                <li>
                  <strong>Cloudflare Inc.</strong> — CDN, DDoS koruması, bot yönetimi.
                  Gizlilik: <span className="text-white/40">cloudflare.com/privacypolicy</span>
                </li>
                <li>
                  <strong>Sentry (Functional Software Inc.)</strong> — JavaScript hata izleme.
                  Gizlilik: <span className="text-white/40">sentry.io/privacy</span>
                </li>
                <li>
                  <strong>Meta Platforms Inc.</strong> — Reklam pikseli (yalnızca onay sonrası).
                  Gizlilik: <span className="text-white/40">facebook.com/privacy/policy</span>
                </li>
                <li>
                  <strong>LinkedIn Corporation</strong> — B2B reklam izleme (yalnızca onay sonrası).
                  Gizlilik: <span className="text-white/40">linkedin.com/legal/privacy-policy</span>
                </li>
              </ul>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">4. Çerez Onayı ve Tercih Merkezi</h2>
              <p>
                Platforma ilk ziyaretinizde gösterilen çerez banner&apos;ı aracılığıyla çerez tercihlerinizi
                belirleyebilirsiniz. Zorunlu çerezler için onay gerekmez; analitik ve pazarlama çerezleri
                yalnızca açık onayınızın ardından etkinleştirilir.
              </p>
              <p>
                Tercihlerinizi istediğiniz zaman güncellemek için Platform alt bilgisindeki
                <strong> &quot;Çerez Tercihleri&quot;</strong> bağlantısını kullanabilirsiniz. Ayrıca Platform hesabınızdaki
                Gizlilik Ayarları bölümünden de çerez izinlerinizi yönetebilirsiniz.
              </p>
              <div className="mt-4 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 text-sm text-yellow-200/70">
                <strong className="text-yellow-300/80">Önemli:</strong> Zorunlu çerezler dışındaki çerezleri
                reddederseniz Platform bazı kişiselleştirme özelliklerini sunamamayabilir; ancak temel işlevler
                çalışmaya devam eder.
              </div>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">5. Tarayıcı Üzerinden Çerez Yönetimi</h2>
              <p>
                Tarayıcınızın ayarları üzerinden de çerezleri yönetebilirsiniz. Yaygın tarayıcılarda
                çerez ayarlarına erişim yolları:
              </p>
              <ul>
                <li><strong>Google Chrome:</strong> Ayarlar → Gizlilik ve Güvenlik → Çerezler ve diğer site verileri</li>
                <li><strong>Mozilla Firefox:</strong> Seçenekler → Gizlilik ve Güvenlik → Çerezler ve Site Verileri</li>
                <li><strong>Safari:</strong> Tercihler → Gizlilik → Çerezler ve web sitesi verileri</li>
                <li><strong>Microsoft Edge:</strong> Ayarlar → Çerezler ve site izinleri → Çerezler ve site verileri</li>
              </ul>
              <p>
                Tarayıcı ayarlarından tüm çerezleri sildiğinizde, Platform&apos;daki oturumunuz sonlanacak ve
                kayıtlı tercihleriniz sıfırlanacaktır.
              </p>
              <p>
                Reklam çerezleri için <span className="text-white/40">youronlinechoices.eu</span> (AB) veya
                <span className="text-white/40"> aboutads.info</span> (ABD) üzerinden de tercih belirleyebilirsiniz.
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">6. KVKK ve GDPR Uyumu</h2>
              <h3 className="text-white/90 font-medium mt-4 mb-2">6.1 KVKK (Türkiye)</h3>
              <p>
                Çerez aracılığıyla işlenen kişisel veriler, 6698 sayılı KVKK kapsamında değerlendirilmektedir.
                Zorunlu çerezler &quot;meşru menfaat&quot; hukuki dayanağına; tercih, analitik ve pazarlama çerezleri ise
                &quot;açık rıza&quot; hukuki dayanağına dayandırılmaktadır. Açık rızanız her zaman geri alınabilir.
              </p>
              <p>
                KVKK kapsamında sahip olduğunuz haklar (erişim, düzeltme, silme, itiraz vb.) için{' '}
                <a href="/kvkk" className="text-indigo-400 hover:text-indigo-300">KVKK Aydınlatma Metnimizi</a>{' '}
                inceleyiniz.
              </p>
              <h3 className="text-white/90 font-medium mt-4 mb-2">6.2 GDPR (AB/AEA Ziyaretçileri)</h3>
              <p>
                Avrupa Birliği veya Avrupa Ekonomik Alanı&apos;ndan erişen ziyaretçiler için GDPR kapsamında
                öngörülen çerez onayı kuralları uygulanmaktadır. Çerez banner&apos;ı aracılığıyla rızanızı
                verme, reddetme veya geri çekme hakkınız bulunmaktadır. Rızanızı geri çekmeniz, geri çekme
                öncesindeki veri işlemenin hukuka uygunluğunu etkilemez.
              </p>
              <p>
                GDPR kapsamındaki veri aktarımları (örn. Google Analytics verilerinin ABD sunucularına aktarımı)
                için Avrupa Komisyonu Standart Sözleşme Hükümleri (SCCs) geçerlidir.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">7. Politika Güncellemeleri</h2>
              <p>
                Bu Çerez Politikası periyodik olarak güncellenebilir. Önemli değişiklikler, kayıtlı e-posta
                adresinize bildirilerek ve Platform üzerinde duyurularak yapılır. Güncel politika her zaman
                bu sayfada yayımlanır; sayfanın üst kısmındaki &quot;Son güncelleme&quot; tarihi referans alınabilir.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">8. İletişim</h2>
              <p>
                Çerez politikamıza ilişkin soru ve talepleriniz için:
              </p>
              <div className="mt-3 p-4 rounded-xl bg-white/5 border border-white/10 space-y-1 text-sm">
                <p><strong className="text-white/80">Şirket:</strong> FunBreak Global Teknoloji Ltd. Şti.</p>
                <p><strong className="text-white/80">E-posta:</strong> legal@funbreakseo.com</p>
                <p><strong className="text-white/80">Adres:</strong> İstanbul</p>
              </div>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
