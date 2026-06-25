import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Mesafeli Satış Sözleşmesi | FunBreak SEO',
  description:
    'FunBreak SEO platformu abonelik satın alımlarına ilişkin mesafeli satış sözleşmesi — 6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyumlu.',
};

export default function DistanceSalesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-white mb-2">Mesafeli Satış Sözleşmesi</h1>
          <p className="text-white/40 text-sm mb-2">Son güncelleme: Haziran 2026</p>
          <p className="text-white/40 text-xs mb-10">
            6502 Sayılı Tüketicinin Korunması Hakkında Kanun &amp; Mesafeli Sözleşmeler
            Yönetmeliği (27.11.2014 tarih ve 29188 sayılı R.G.) uyarınca düzenlenmiştir.
          </p>

          <div className="prose prose-invert max-w-none space-y-10 text-white/70 leading-relaxed">

            {/* MADDE 1 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Madde 1 — Taraflar</h2>

              <h3 className="text-base font-semibold text-white/90 mb-2">1.1 SATICI</h3>
              <ul className="list-none space-y-1 text-sm">
                <li><strong>Unvan:</strong> FunBreak Global Teknoloji Ltd. Şti.</li>
                <li><strong>Kısa Adı:</strong> FunBreak SEO</li>
                <li><strong>Platform:</strong> funbreakseo.com</li>
                <li><strong>Müşteri Hizmetleri:</strong> destek@funbreakseo.com</li>
                <li><strong>Hukuki İletişim:</strong> legal@funbreakseo.com</li>
                <li><strong>Vergi Kimlik No:</strong> [Şirket tescilinde güncellenecektir]</li>
                <li><strong>Ticaret Sicil No:</strong> [Şirket tescilinde güncellenecektir]</li>
                <li>
                  <strong>Kayıtlı Elektronik Posta (KEP):</strong> [Kayıt sonrası güncellenecektir]
                </li>
              </ul>

              <h3 className="text-base font-semibold text-white/90 mt-5 mb-2">1.2 ALICI (MÜŞTERİ)</h3>
              <p>
                funbreakseo.com üzerinden kayıt olan ve abonelik satın alan bireysel kullanıcı
                veya tüzel kişilik (&quot;Müşteri&quot; veya &quot;Alıcı&quot;). Alıcı&apos;nın kimlik ve iletişim
                bilgileri, kayıt formunda beyan edilen bilgilerdir.
              </p>
            </section>

            {/* MADDE 2 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Madde 2 — Sözleşmenin Konusu</h2>
              <p>
                İşbu Mesafeli Satış Sözleşmesi (&quot;Sözleşme&quot;); Satıcı tarafından sunulan ve
                aşağıda belirtilen özelliklere sahip dijital SaaS hizmetinin mesafeli olarak
                satışına ilişkin tarafların hak ve yükümlülüklerini 6502 sayılı Kanun ve Mesafeli
                Sözleşmeler Yönetmeliği çerçevesinde düzenler.
              </p>
              <p>
                Hizmet kapsamı: teknik SEO tarama, anahtar kelime sıralama takibi, GEO / yapay
                zeka görünürlük analizi, AI destekli içerik üretimi, backlink yönetimi ve
                raporlama modülleri. Hizmet; içerik, yazılım, veri ve yapay zeka işlem kapasitesi
                gibi dijital unsurları kapsar.
              </p>
            </section>

            {/* MADDE 3 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Madde 3 — Sözleşmenin Kurulması
              </h2>
              <p>
                Bu Sözleşme; Alıcı&apos;nın funbreakseo.com üzerinde abonelik planını seçip ödeme
                işlemini tamamladığı anda, Satıcı&apos;nın sistemi aboneliği onayladığı an
                kurulmuş sayılır.
              </p>
              <p>
                Alıcı, ödeme sayfasındaki &quot;Satın Al&quot; veya &quot;Ödemeyi Tamamla&quot; butonuna tıklayarak:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>İşbu Sözleşme&apos;yi ve eklerini okuduğunu ve kabul ettiğini,</li>
                <li>Kullanım Şartları ve Gizlilik Politikası&apos;nı kabul ettiğini,</li>
                <li>
                  Hizmetin dijital niteliği gereği cayma hakkının kullanılamayacağını bildiğini
                  ve bu hususta açıkça onay verdiğini
                </li>
              </ul>
              <p className="mt-2">beyan ve taahhüt eder.</p>
              <p>
                Sözleşme kopyası, satın alma işleminin tamamlanmasının ardından Alıcı&apos;nın
                kayıtlı e-posta adresine gönderilir.
              </p>
            </section>

            {/* MADDE 4 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Madde 4 — Hizmet Bedeli ve Ödeme
              </h2>

              <h3 className="text-base font-semibold text-white/90 mb-3">4.1 Güncel Abonelik Planları</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 pr-4 text-white/80 font-semibold">Plan</th>
                      <th className="text-left py-2 pr-4 text-white/80 font-semibold">Aylık Ücret</th>
                      <th className="text-left py-2 pr-4 text-white/80 font-semibold">Yıllık Ücret</th>
                      <th className="text-left py-2 text-white/80 font-semibold">KDV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="py-2 pr-4">Starter</td>
                      <td className="py-2 pr-4">Güncel fiyat için platforma bakınız</td>
                      <td className="py-2 pr-4">—</td>
                      <td className="py-2">%20 dahil</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Professional</td>
                      <td className="py-2 pr-4">Güncel fiyat için platforma bakınız</td>
                      <td className="py-2 pr-4">—</td>
                      <td className="py-2">%20 dahil</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Agency</td>
                      <td className="py-2 pr-4">Güncel fiyat için platforma bakınız</td>
                      <td className="py-2 pr-4">—</td>
                      <td className="py-2">%20 dahil</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-white/40 mt-2">
                Güncel fiyatlar funbreakseo.com/fiyatlandirma adresinde yayımlanır. Fiyatlara KDV
                dahildir. Şirket, fiyatları önceden duyurmak kaydıyla değiştirme hakkını saklı
                tutar; değişiklik mevcut aboneliklerin yenileme döneminden itibaren uygulanır.
              </p>

              <h3 className="text-base font-semibold text-white/90 mt-5 mb-2">4.2 Ödeme Yöntemleri</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>VakıfBank Sanal POS:</strong> Visa, Mastercard, Troy — 3D Secure
                  güvencesiyle
                </li>
                <li>
                  <strong>Stripe:</strong> Uluslararası kart ödemeleri ve çoklu para birimi
                  desteği
                </li>
              </ul>
              <p className="mt-2">
                Ödeme bilgileri Şirket sistemlerinde saklanmaz; ödeme altyapısı PCI-DSS uyumlu
                VakıfBank ve Stripe tarafından işlenir.
              </p>

              <h3 className="text-base font-semibold text-white/90 mt-5 mb-2">4.3 Fatura</h3>
              <p>
                Her ödeme için e-fatura veya e-arşiv fatura düzenlenir ve kayıtlı e-posta
                adresinize iletilir. Tüzel kişilerin vergi kimlik numarasını kayıt sırasında
                belirtmesi zorunludur.
              </p>
            </section>

            {/* MADDE 5 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Madde 5 — Teslimat
              </h2>
              <p>
                Bu Sözleşme kapsamındaki hizmet tamamen dijital niteliktedir; herhangi bir fiziksel
                teslimat söz konusu değildir. Ödemenin başarıyla tamamlanmasının ardından
                hesabınız <strong>derhal ve otomatik olarak aktive edilir.</strong>
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Platforma erişim, ödeme onayının ardından anında başlar.</li>
                <li>
                  Aktivasyon, kayıtlı e-posta adresinize gönderilen hoş geldiniz e-postasıyla
                  teyit edilir.
                </li>
                <li>
                  Teknik bir arıza nedeniyle aktivasyon 24 saat içinde gerçekleşmezse destek
                  ekibimizle iletişime geçiniz: destek@funbreakseo.com
                </li>
              </ul>
            </section>

            {/* MADDE 6 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Madde 6 — Cayma Hakkı ve Dijital Hizmet İstisnası
              </h2>
              <p>
                Mesafeli Sözleşmeler Yönetmeliği&apos;nin 15. maddesi uyarınca; &quot;teslimi anında
                başlayan ve tüketicinin onayıyla ifaya başlanmış dijital içerik ile hizmetler&quot;
                cayma hakkı kapsamı dışındadır.
              </p>
              <p>
                6502 sayılı Kanun&apos;un 49/4. maddesi de aynı doğrultuda şu hükmü içermektedir:
              </p>
              <blockquote className="border-l-4 border-indigo-500/50 pl-4 my-4 text-white/60 italic">
                &quot;Hizmet sunumuna başlanmadan önce tüketicinin onayı alınmış ise cayma hakkı
                kullanılamaz.&quot;
              </blockquote>
              <p>
                Alıcı; ödeme aşamasında yer alan &quot;Dijital hizmetin tesliminin hemen başlamasına
                ve bu nedenle cayma hakkımın sona ereceğine açıkça onay veriyorum&quot; metnini
                işaretleyerek cayma hakkından feragat etmiş sayılır. Platforma erişim bu onayın
                ardından anında başladığından cayma hakkı kullanılamaz.
              </p>
              <p>
                Alıcı; bu istisnadan önceden haberdar edildiğini, anladığını ve kabul ettiğini
                işbu Sözleşme&apos;yi onaylayarak beyan eder.
              </p>
            </section>

            {/* MADDE 7 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Madde 7 — Abonelik Koşulları ve Otomatik Yenileme
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Abonelik; seçilen plan dönemine (aylık veya yıllık) göre başlar ve dönem sonunda
                  <strong> otomatik olarak yenilenir.</strong>
                </li>
                <li>
                  Alıcı, yenileme işleminden en az <strong>3 gün önce</strong> e-posta ile
                  bilgilendirilir.
                </li>
                <li>
                  Otomatik yenilemeyi durdurmak için fatura dönemi bitmeden önce aboneliğin iptal
                  edilmesi gerekmektedir.
                </li>
                <li>
                  Plan yükseltmeleri anında geçerli olur; kalan dönem için orantılı ücretlendirme
                  yapılır. Plan düşürmeleri bir sonraki fatura döneminden itibaren geçerlidir.
                </li>
                <li>
                  Ödemenin başarısız olması durumunda hizmet 48 saat içinde askıya alınır; 7
                  takvim günü içinde ödeme yapılmazsa sözleşme feshedilir.
                </li>
              </ul>
            </section>

            {/* MADDE 8 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Madde 8 — Gizlilik ve Kişisel Verilerin Korunması
              </h2>
              <p>
                Alıcı&apos;ya ait kişisel veriler; 6698 sayılı Kişisel Verilerin Korunması Kanunu
                (KVKK) ve ilgili ikincil mevzuat kapsamında işlenir. Veriler yalnızca hizmetin
                sunulması, fatura düzenlenmesi, müşteri desteği ve yasal yükümlülüklerin yerine
                getirilmesi amacıyla kullanılır.
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Kişisel veriler üçüncü kişilere satılmaz veya kiralanmaz.</li>
                <li>
                  Hizmetin sunumu için zorunlu olan DataForSEO (veri analizi) gibi alt işlemcilerle
                  paylaşılan veriler, imzalanan veri işleme sözleşmeleriyle güvence altındadır.
                </li>
                <li>
                  Alıcı; KVKK m. 11 kapsamındaki haklarını (erişim, düzeltme, silme, itiraz)
                  kvkk@funbreakseo.com adresine başvurarak kullanabilir.
                </li>
              </ul>
              <p className="mt-2">
                Ayrıntılı bilgi için{' '}
                <a
                  href="/gizlilik-politikasi"
                  className="text-indigo-400 hover:underline"
                >
                  Gizlilik Politikası
                </a>{' '}
                ve{' '}
                <a href="/kvkk" className="text-indigo-400 hover:underline">
                  KVKK Aydınlatma Metni
                </a>
                &apos;ni inceleyiniz.
              </p>
            </section>

            {/* MADDE 9 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Madde 9 — Satıcı&apos;nın Hak ve Yükümlülükleri
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Satıcı, platformu makul özen yükümlülüğüyle işletmeyi ve %99,5 aylık uptime
                  hedeflemeyi taahhüt eder.
                </li>
                <li>
                  Satıcı; hizmet kötüye kullanımı, Kullanım Şartları ihlali veya yasal zorunluluk
                  durumlarında aboneliği önceden bildirmeksizin askıya alma veya feshetme hakkını
                  saklı tutar.
                </li>
                <li>
                  Satıcı; hizmet kapsamında, özelliklerinde veya fiyatlarında değişiklik yapma
                  hakkını saklı tutar. Önemli değişiklikler en az 30 gün önce duyurulur.
                </li>
                <li>
                  Satıcı, SEO sıralama garantisi vermez. Platform, araçlar ve raporlama sunar;
                  sonuçlar pek çok dış faktöre bağlıdır.
                </li>
              </ul>
            </section>

            {/* MADDE 10 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Madde 10 — Alıcı&apos;nın Yükümlülükleri
              </h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  Kayıt formunda doğru ve güncel bilgi vermek. Yanlış bilgiden doğan zarardan
                  Şirket sorumlu değildir.
                </li>
                <li>
                  Hesap güvenliğini sağlamak; şifresini başkasıyla paylaşmamak. Hesabın yetkisiz
                  kullanımından Alıcı sorumludur.
                </li>
                <li>Platformu yalnızca yasal amaçlarla ve Kullanım Şartları çerçevesinde kullanmak.</li>
                <li>
                  Platforma zarar verecek, hizmetin sürekliliğini tehdit edecek veya diğer
                  kullanıcıları olumsuz etkileyecek eylemlerden kaçınmak.
                </li>
                <li>Fatura adresini ve ödeme bilgilerini güncel tutmak.</li>
              </ul>
            </section>

            {/* MADDE 11 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Madde 11 — Sorumluluk Sınırlaması
              </h2>
              <p>
                Şirket&apos;in sorumluluğu, hiçbir koşulda Alıcı&apos;nın son fatura dönemi abonelik
                bedelini aşamaz. Şirket; dolaylı, tesadüfi, özel veya sonuçsal zararlardan
                (kar kaybı, iş fırsatı kaybı, marka itibar kaybı dahil) sorumlu tutulamaz.
              </p>
              <p>
                Google ve diğer arama motorlarının algoritma değişikliklerinden, üçüncü taraf API
                kesintilerinden veya mücbir sebeplerden kaynaklanan zararlar Şirket&apos;e
                yükletilemez.
              </p>
            </section>

            {/* MADDE 12 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                Madde 12 — Uyuşmazlık Çözümü
              </h2>
              <p>
                İşbu Sözleşme&apos;den doğan uyuşmazlıklarda öncelikle yazılı başvuru yoluyla
                çözüm aranacaktır. Çözüme kavuşturulamazsa:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>
                  <strong>Tüketici sıfatıyla bireysel alıcılar:</strong> Yürürlükteki parasal
                  sınırlar dahilinde ilgili il veya ilçe Tüketici Hakem Heyeti&apos;ne, sınırı
                  aşan davalarda Tüketici Mahkemesi&apos;ne başvurabilir.
                </li>
                <li>
                  <strong>Tüzel kişilik veya ticari amaçlı kullanıcılar:</strong>{' '}
                  <strong>İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri</strong> münhasıran
                  yetkilidir. Türk Hukuku uygulanır.
                </li>
              </ul>
            </section>

            {/* MADDE 13 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Madde 13 — Yürürlük</h2>
              <p>
                Bu Sözleşme, Alıcı&apos;nın ödeme işlemini tamamladığı anda yürürlüğe girer ve
                abonelik sona erene dek geçerliliğini korur. Sözleşme&apos;nin herhangi bir
                hükmünün geçersiz sayılması diğer hükümlerin geçerliliğini etkilemez.
              </p>
              <p>
                Şirket, bu Sözleşme&apos;yi yasal mevzuat değişiklikleri veya hizmet güncellemeleri
                nedeniyle değiştirme hakkını saklı tutar. Değişiklikler, yayım tarihinden itibaren
                mevcut aboneliklere en az 30 gün sonra uygulanır.
              </p>
              <p>
                Soru ve görüşleriniz için:{' '}
                <a href="mailto:legal@funbreakseo.com" className="text-indigo-400 hover:underline">
                  legal@funbreakseo.com
                </a>
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
