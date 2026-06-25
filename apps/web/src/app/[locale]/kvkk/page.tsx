import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni | FunBreak SEO',
  description:
    'FunBreak SEO — 6698 sayılı KVKK kapsamında kişisel verilerin işlenmesine ilişkin aydınlatma metni.',
};

export default function KvkkPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-white mb-2">KVKK Aydınlatma Metni</h1>
          <p className="text-white/40 text-sm mb-2">
            6698 Sayılı Kişisel Verilerin Korunması Kanunu Kapsamında
          </p>
          <p className="text-white/40 text-sm mb-10">Son güncelleme: Haziran 2026</p>

          <div className="prose prose-invert max-w-none space-y-10 text-white/70 leading-relaxed">

            {/* 1 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">1. Veri Sorumlusu</h2>
              <p>
                6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca,{' '}
                <strong className="text-white">funbreakseo.com</strong> platformunu kullanmanız nedeniyle
                elde edilen kişisel verileriniz; veri sorumlusu sıfatıyla{' '}
                <strong className="text-white">FunBreak Global Teknoloji Ltd. Şti.</strong> tarafından
                aşağıda açıklanan kapsamda işlenecektir.
              </p>
              <div className="bg-white/5 rounded-xl p-5 mt-3 space-y-1 text-sm">
                <p><span className="text-white/50">Veri Sorumlusu:</span> FunBreak Global Teknoloji Ltd. Şti.</p>
                <p><span className="text-white/50">Platform:</span> funbreakseo.com</p>
                <p><span className="text-white/50">İletişim:</span> legal@funbreakseo.com</p>
              </div>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">
                2. Kişisel Verilerin İşlenme Amaçları ve Hukuki Sebepleri
              </h2>
              <p>
                Kişisel verileriniz, KVKK Madde 5 kapsamındaki hukuki işleme sebeplerine dayanılarak
                aşağıdaki amaçlarla işlenmektedir:
              </p>
              <div className="space-y-4 mt-4">
                {[
                  {
                    basis: 'KVKK m.5/2-c — Sözleşmenin kurulması veya ifası',
                    items: [
                      'Kullanıcı hesabı oluşturulması ve kimlik doğrulaması',
                      'Abonelik planının aktivasyonu ve yönetimi',
                      'Platform hizmetlerinin (SEO tarama, GEO analiz, içerik üretimi vb.) sunulması',
                      'Teknik destek ve müşteri hizmetlerinin sağlanması',
                      'Ödeme işlemlerinin gerçekleştirilmesi',
                    ],
                  },
                  {
                    basis: 'KVKK m.5/2-ç — Hukuki yükümlülüğün yerine getirilmesi',
                    items: [
                      'Yasal e-fatura ve e-arşiv düzenlemesi (213 sayılı VUK)',
                      'Sunucu erişim kayıtlarının tutulması (5651 sayılı Kanun)',
                      'Vergi ve muhasebe yükümlülüklerinin yerine getirilmesi',
                      'Mahkeme ve yetkili kurum kararlarının uygulanması',
                    ],
                  },
                  {
                    basis: 'KVKK m.5/2-f — Meşru menfaat',
                    items: [
                      'Platform güvenliğinin ve dolandırıcılık önlemenin sağlanması',
                      'Hizmet kalitesinin ve performansın ölçülmesi',
                      'Teknik altyapının korunması (DDoS, siber saldırı önleme)',
                      'Anlaşmazlık hallerinde hukuki hakların korunması',
                    ],
                  },
                  {
                    basis: 'KVKK m.5/1 — Açık rıza',
                    items: [
                      'Ürün güncellemeleri, kampanyalar ve içerik pazarlama bildirimleri',
                      'Hizmet kullanım alışkanlıklarının analizi ve kişiselleştirilmiş deneyim sunumu',
                      'Üçüncü taraf analitik araçları aracılığıyla davranışsal analiz',
                    ],
                  },
                ].map((group) => (
                  <div key={group.basis} className="bg-white/5 rounded-lg p-4">
                    <p className="text-indigo-300 text-xs font-semibold mb-2">{group.basis}</p>
                    <ul className="space-y-1 text-sm">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="text-white/30 mt-1">›</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">3. İşlenen Kişisel Veri Kategorileri</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-white/10 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="text-left p-3 text-white font-medium">Kategori</th>
                      <th className="text-left p-3 text-white font-medium">Veri Türleri</th>
                      <th className="text-left p-3 text-white font-medium">Amaç</th>
                      <th className="text-left p-3 text-white font-medium">Süre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Kimlik', 'Ad, soyad, şirket unvanı', 'Hesap yönetimi', 'Hesap silimden +1 yıl'],
                      ['İletişim', 'E-posta, telefon (isteğe bağlı)', 'Bildirim, destek', '3 yıl'],
                      ['Finansal', 'Fatura bilgileri, ödeme tipi, tutar', 'Ödeme, e-fatura', '10 yıl (VUK)'],
                      ['Kullanım', 'Proje, anahtar kelime, rapor', 'Hizmet sunumu', 'Hesap silimden +1 yıl'],
                      ['Teknik', 'IP, tarayıcı, cihaz, log', 'Güvenlik, analiz', '6 ay – 2 yıl'],
                      ['Çerez', 'Oturum, tercih çerezleri', 'Kimlik doğrulama, UX', 'Oturum – 24 ay'],
                    ].map(([cat, types, purpose, retention]) => (
                      <tr key={cat} className="border-t border-white/10">
                        <td className="p-3 text-white font-medium">{cat}</td>
                        <td className="p-3 text-xs">{types}</td>
                        <td className="p-3 text-xs">{purpose}</td>
                        <td className="p-3 text-xs text-white/50">{retention}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">4. Kişisel Verilerin Aktarıldığı Alıcı Grupları</h2>
              <p>
                Kişisel verileriniz KVKK Madde 8 ve Madde 9 kapsamında, yalnızca aşağıda belirtilen alıcı
                gruplarına ve yalnızca gerekli ölçüde aktarılmaktadır:
              </p>
              <ul className="mt-3 space-y-2">
                <li><strong className="text-white">Ödeme Kuruluşu (VakıfBank):</strong> Ödeme işlemlerinin güvenli tamamlanması</li>
                <li><strong className="text-white">Veri İşleyenler (DataForSEO, Anthropic, Google):</strong> Hizmet altyapısının çalıştırılması — kişisel kimlik verisi iletilmez; yalnızca kullanıcı tarafından girilen analitik içerik verisi iletilir</li>
                <li><strong className="text-white">E-Fatura Sağlayıcısı (Paraşüt):</strong> Yasal fatura düzenlenmesi amacıyla fatura bilgileri</li>
                <li><strong className="text-white">Altyapı / Bulut Sağlayıcısı:</strong> Sunucu barındırma, CDN ve güvenlik hizmeti</li>
                <li><strong className="text-white">Yetkili Kamu Kurumları:</strong> Mahkeme, savcılık, vergi idaresi, BTK gibi yasal talepleri karşılamak amacıyla</li>
              </ul>
              <p className="mt-3 text-sm text-white/50">
                Kişisel verileriniz hiçbir koşulda reklam amaçlı üçüncü taraflara satılmaz, kiralanmaz veya ticari amaçla paylaşılmaz.
              </p>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">5. Kişisel Verilerin Toplanma Yöntemi</h2>
              <p>Kişisel verileriniz aşağıdaki kanallar aracılığıyla toplanmaktadır:</p>
              <ul className="mt-3 space-y-2">
                <li><strong className="text-white">Kayıt Formu ve Hesap Oluşturma:</strong> Platforma kayıt sırasında doğrudan tarafınızca sağlanan bilgiler</li>
                <li><strong className="text-white">Platform Kullanımı:</strong> Hizmet kullanımı sırasında otomatik olarak oluşan davranış ve teknik veriler</li>
                <li><strong className="text-white">Çerezler ve Benzeri Teknolojiler:</strong> Tarayıcı çerezleri ve oturum verileri</li>
                <li><strong className="text-white">Ödeme İşlemleri:</strong> Abonelik satın alma sırasında ödeme sağlayıcısından iletilen onay ve fatura verileri</li>
                <li><strong className="text-white">İletişim Kanalları:</strong> Destek talepleri, e-posta ve form iletişimleri</li>
              </ul>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">6. İlgili Kişi Hakları (KVKK Madde 11)</h2>
              <p>
                KVKK&apos;nın 11. maddesi uyarınca, kişisel verilerinizin işlenmesine ilişkin olarak
                aşağıdaki haklara sahipsiniz:
              </p>
              <div className="bg-white/5 rounded-xl p-5 mt-3 space-y-3 text-sm">
                {[
                  ['(a)', 'Kişisel verilerinizin işlenip işlenmediğini öğrenme'],
                  ['(b)', 'Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme'],
                  ['(c)', 'Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme'],
                  ['(ç)', 'Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme'],
                  ['(d)', 'Eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini ve üçüncü kişilere bildirilmesini isteme'],
                  ['(e)', 'İşlenmesini gerektiren sebeplerin ortadan kalkması hâlinde silinmesini veya yok edilmesini isteme'],
                  ['(f)', 'Silme/yok etme işleminin aktarılan üçüncü kişilere bildirilmesini isteme'],
                  ['(g)', 'Münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize sonuç oluşmasına itiraz etme'],
                  ['(ğ)', 'Kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde tazminat talep etme'],
                ].map(([letter, right]) => (
                  <div key={letter} className="flex items-start gap-3">
                    <span className="text-indigo-400 font-bold flex-shrink-0">{letter}</span>
                    <span>{right}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">7. Başvuru Yöntemi ve Süresi</h2>
              <p>
                Haklarınıza ilişkin taleplerinizi aşağıdaki yöntemlerle Şirketimize iletebilirsiniz:
              </p>
              <div className="bg-white/5 rounded-xl p-5 mt-3 space-y-4 text-sm">
                <div>
                  <p className="text-white font-medium mb-1">E-posta ile Başvuru</p>
                  <p className="text-white/50">
                    Konuya &quot;KVKK Başvurusu&quot; yazarak{' '}
                    <strong className="text-white">legal@funbreakseo.com</strong> adresine
                    kimliğinizi doğrulayacak bilgilerle birlikte iletiniz.
                  </p>
                </div>
                <div>
                  <p className="text-white font-medium mb-1">Yanıt Süresi</p>
                  <p className="text-white/50">
                    Başvurularınız KVKK Madde 13/2 uyarınca en geç{' '}
                    <strong className="text-white">30 (otuz) gün</strong> içinde yanıtlanacaktır.
                    İşlemin maliyet gerektirmesi halinde Kişisel Verileri Koruma Kurulunca belirlenen
                    tarifedeki ücret alınabilir.
                  </p>
                </div>
                <div>
                  <p className="text-white font-medium mb-1">KVKK Kuruluna Şikayet</p>
                  <p className="text-white/50">
                    Başvurunuzun reddedilmesi, yanıtın yetersiz bulunması veya süresi içinde yanıt
                    verilmemesi hâlinde{' '}
                    <strong className="text-white">Kişisel Verileri Koruma Kurulu</strong>&apos;na
                    şikâyette bulunabilirsiniz.
                  </p>
                </div>
              </div>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">8. Güvenlik</h2>
              <p>
                Şirketimiz, KVKK Madde 12 uyarınca kişisel verilerinizin hukuka aykırı işlenmesini ve
                erişilmesini önlemek amacıyla aşağıdaki teknik ve idari tedbirleri uygulamaktadır:
              </p>
              <ul className="mt-3 space-y-1">
                <li>TLS 1.3 ile uçtan uca şifrelenmiş veri iletimi</li>
                <li>Veritabanı düzeyinde AES-256 şifreleme</li>
                <li>Rol tabanlı erişim kontrolü (RBAC) ve en az yetki ilkesi</li>
                <li>Düzenli güvenlik taramaları ve bağımsız denetimler</li>
                <li>Veri ihlali bildirimi prosedürü (72 saat içinde KVKK Kurulu bildirimi)</li>
                <li>Personel gizlilik eğitimleri ve gizlilik taahhütnameleri</li>
              </ul>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-white text-xl font-semibold mb-3">9. Değişiklikler</h2>
              <p>
                Bu Aydınlatma Metni, yasal düzenlemeler veya iş süreçlerimizde gerçekleşen değişiklikler
                doğrultusunda güncellenebilir. Güncel metne her zaman{' '}
                <strong className="text-white">funbreakseo.com/kvkk</strong> adresinden ulaşabilirsiniz.
                Önemli değişiklikler kayıtlı e-posta adresinize bildirilecektir.
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
