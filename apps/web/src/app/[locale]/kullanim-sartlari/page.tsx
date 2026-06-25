import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Kullanım Şartları | FunBreak SEO',
  description:
    'FunBreak SEO platformunun kullanım şartları, abonelik koşulları, sorumluluk sınırlamaları ve yasal düzenlemeler hakkında bilgi alın.',
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-white mb-2">Kullanım Şartları</h1>
          <p className="text-white/40 text-sm mb-10">Son güncelleme: Haziran 2026 · Yürürlük tarihi: Haziran 2026</p>

          <div className="prose prose-invert max-w-none space-y-10 text-white/70">

            {/* 1 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">1. Taraflar ve Kapsam</h2>
              <p>
                Bu Kullanım Şartları (&quot;Şartlar&quot; veya &quot;Sözleşme&quot;), <strong>FunBreak Global Teknoloji
                Ltd. Şti.</strong> (&quot;FunBreak SEO&quot;, &quot;Şirket&quot;, &quot;biz&quot;) ile funbreakseo.com
                adresinden veya mobil/API kanallarından Platforma erişen bireysel kullanıcı ya da tüzel kişiliği temsilen
                hareket eden yetkili kişi (&quot;Kullanıcı&quot;, &quot;siz&quot;) arasında akdedilmiş bağlayıcı bir hukuki
                sözleşmedir.
              </p>
              <p>
                Platforma kayıt olarak, giriş yaparak veya herhangi bir özelliğini kullanarak bu Şartların tamamını,
                Gizlilik Politikamızı, KVKK Aydınlatma Metnimizi ve Mesafeli Satış Sözleşmemizi okuduğunuzu, anladığınızı
                ve kabul ettiğinizi beyan etmiş sayılırsınız. <strong>Bu Şartları kabul etmiyorsanız Platformu
                kullanmayınız.</strong>
              </p>
              <p>
                Tüzel kişilik adına kayıt olan kişi, söz konusu tüzel kişiliği bu Şartlarla bağlama yetkisine sahip
                olduğunu beyan ve taahhüt eder.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">2. Hizmet Tanımı ve Kapsamı</h2>
              <p>
                FunBreak SEO; web sitelerinin arama motoru sıralamalarını, yapay zeka görünürlüklerini ve dijital
                varlıklarını yönetmek için tasarlanmış bulut tabanlı bir SaaS (Hizmet Olarak Yazılım) platformudur.
                Platform aşağıdaki temel modülleri kapsar:
              </p>
              <ul>
                <li><strong>Teknik SEO Denetimi:</strong> Site hızı, taranabilirlik, indekslenebilirlik, Core Web
                Vitals ve yapısal sorun tespiti.</li>
                <li><strong>Anahtar Kelime Takibi:</strong> Google, Yandex ve diğer arama motorlarındaki sıralama
                izleme, rakip karşılaştırma ve tarihsel analiz.</li>
                <li><strong>GEO / Yapay Zeka Görünürlük İzleme:</strong> ChatGPT, Google Gemini, Perplexity,
                Microsoft Copilot ve diğer üretken yapay zeka sistemlerindeki marka ve ürün alıntı takibi.</li>
                <li><strong>Backlink Analizi:</strong> Geri bağlantı profili, domain rating, zararlı backlink
                tespiti ve disavow yönetimi.</li>
                <li><strong>AI Destekli İçerik Üretimi:</strong> SEO ve GEO uyumlu blog yazıları, pillar page,
                FAQ ve açılış sayfası içeriklerinin otomatik oluşturulması.</li>
                <li><strong>Outreach ve Dijital PR:</strong> Bağlantı inşası için yayıncı keşfi, kişiselleştirilmiş
                e-posta kampanyaları ve yanıt takibi.</li>
                <li><strong>Link Marketplace:</strong> Onaylı yayıncı sitelerinde sponsorlu içerik ve backlink
                satın alma/satma pazar yeri.</li>
                <li><strong>Autopilot:</strong> SEO görevlerinin (içerik güncellemeleri, backlink takibi,
                sıralama izleme) zamanlanmış ve otomatik yürütülmesi.</li>
                <li><strong>Raporlama ve Analitik:</strong> White-label PDF raporlar, pano özelleştirme ve
                müşteri paylaşım bağlantıları.</li>
              </ul>
              <p>
                Şirket, önceden bildirimde bulunmaksızın Platform üzerinde değişiklik yapma, yeni özellikler ekleme
                veya mevcut özellikleri kaldırma hakkını saklı tutar. Herhangi bir özelliğin kalıcı kullanılabilirliği
                garanti edilmez.
              </p>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">3. Hesap Oluşturma ve Güvenlik</h2>
              <p>
                Platforma erişim için kayıt zorunludur. Kayıt sırasında sağlanan bilgilerin doğru, güncel ve eksiksiz
                olmasından Kullanıcı münferiden sorumludur. Yanlış veya yanıltıcı bilgi sağlanması hesabın
                kapatılmasına gerekçe oluşturur.
              </p>
              <p>
                Kullanıcı, hesabına ait şifreyi ve kimlik bilgilerini gizli tutmakla yükümlüdür. Yetkisiz bir
                erişim tespit edildiğinde derhal <strong>legal@funbreakseo.com</strong> adresine bildirim yapılması
                gerekmektedir. Bildirim yapılmadığı sürece hesap üzerinden gerçekleştirilen tüm işlemler
                Kullanıcıya ait sayılır; bu işlemlerden doğan her türlü hukuki ve mali sorumluluk Kullanıcıya aittir.
              </p>
              <p>
                Hesap; başka kişilere devredilemez, kiralanamaz, satılamaz veya paylaşılamaz. Birden fazla kişinin
                aynı hesabı kullanması Şartların ihlali sayılır ve hesabın askıya alınmasına veya kapatılmasına
                neden olabilir. Her kullanıcı için ayrı hesap edinilmesi zorunludur.
              </p>
              <p>
                Şirket, güvenlik amacıyla tek kullanımlık doğrulama kodları (OTP), iki faktörlü kimlik doğrulama
                (2FA) veya oturum zaman aşımı gibi ek güvenlik önlemleri uygulama hakkını saklı tutar.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">4. Abonelik, Ödeme ve İptal Koşulları</h2>
              <h3 className="text-white/90 font-medium mt-4 mb-2">4.1 Abonelik Planları</h3>
              <p>
                Platform; Starter, Professional ve Enterprise planları dahil çeşitli abonelik seçenekleri sunar. Planların
                içeriği, limitleri ve fiyatları funbreakseo.com/fiyatlandirma sayfasında güncel olarak yayımlanmaktadır.
                Plan detayları bildirim yapılmaksızın değiştirilebilir.
              </p>
              <h3 className="text-white/90 font-medium mt-4 mb-2">4.2 Fiyatlandırma ve KDV</h3>
              <p>
                Tüm fiyatlar aksi belirtilmedikçe Türk Lirası (₺) cinsindendir ve yasal KDV oranını içermektedir.
                Şirket, fiyatları dilediği zaman revize etme hakkını saklı tutar. Fiyat artışları mevcut
                abonelere en az 14 (on dört) gün öncesinden e-posta ile bildirilir; bu süre içinde aboneliği
                iptal etmeyen kullanıcı yeni fiyatı kabul etmiş sayılır.
              </p>
              <h3 className="text-white/90 font-medium mt-4 mb-2">4.3 Otomatik Yenileme</h3>
              <p>
                Abonelikler, dönem sonunda Kullanıcı tarafından iptal edilmediği sürece aynı plan ve fiyat
                koşullarıyla otomatik olarak yenilenir. Ödeme, her dönemin başında kayıtlı ödeme yönteminden
                tahsil edilir. Otomatik yenilemeyi devre dışı bırakmak için dönem bitişinden en geç 24 saat önce
                Platform üzerinden iptal işlemi gerçekleştirilmelidir.
              </p>
              <h3 className="text-white/90 font-medium mt-4 mb-2">4.4 İptal ve İade</h3>
              <p>
                İptal, mevcut dönemin sona ermesiyle birlikte geçerli olur. İptal anından itibaren kalan süre
                için ücret iadesi yapılmaz; Kullanıcı, dönem sonuna kadar Platforma erişim hakkını korur. Yıllık
                aboneliklerde ilk 14 (on dört) gün içinde yapılan iptallerde, 6502 sayılı Kanun kapsamındaki
                cayma hakkı saklı kalmak kaydıyla, orantılı kullanım bedeli düşülerek iade değerlendirilebilir.
                İade talepleri <strong>legal@funbreakseo.com</strong> adresine yazılı olarak iletilmelidir.
              </p>
              <h3 className="text-white/90 font-medium mt-4 mb-2">4.5 Başarısız Ödeme</h3>
              <p>
                Ödeme başarısız olduğunda Şirket, kayıtlı ödeme yöntemi üzerinden 3 (üç) iş günü aralıklarla
                toplam 3 (üç) kez yeniden tahsilat denemesi yapar. Bu girişimlerin tamamı başarısız olursa
                hesap &quot;ödeme askıda&quot; statüsüne alınır ve bazı özellikler kısıtlanabilir. 7 (yedi) takvim günü
                içinde ödeme gerçekleştirilmezse abonelik askıya alınır; 30 (otuz) güne kadar ödeme yapılmaz ise
                hesap kapatılabilir ve veriler silinebilir. Silinen veriler geri getirilemez.
              </p>
              <h3 className="text-white/90 font-medium mt-4 mb-2">4.6 Krediler ve Promosyonlar</h3>
              <p>
                Şirket tarafından tanımlanan promosyon kredileri, denemeler veya indirim kodları tek kullanımlıktır,
                başkasına devredilemez, nakit karşılığı talep edilemez ve yalnızca Şirketin belirlediği koşullar
                çerçevesinde kullanılabilir.
              </p>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">5. Kabul Edilemez Kullanım</h2>
              <p>Kullanıcı, Platformu aşağıdaki amaçlarla kullanamaz:</p>
              <ul>
                <li>Türk Ceza Kanunu, fikri mülkiyet mevzuatı veya diğer ulusal/uluslararası hukuka aykırı
                içerik üretmek, iletmek veya yaymak;</li>
                <li>Toplu e-posta gönderimi (spam), oltalama (phishing) veya dolandırıcılık faaliyeti yürütmek;</li>
                <li>Kötü amaçlı yazılım (malware, ransomware, spyware) yaymak veya Platform altyapısına
                yetkisiz erişim sağlamaya çalışmak;</li>
                <li>Platform API'lerini ve veri tabanlarını otomatik araçlarla (bot, scraper, crawler) aşırı
                sorgulamak ya da rakip ürün geliştirme amacıyla veri toplamak;</li>
                <li>Platform yazılımını tersine mühendislik yapmak (reverse engineer), kaynak kodunu elde etmek,
                kopyalamak veya türev ürün geliştirmek;</li>
                <li>Platform verilerini veya çıktılarını doğrudan rakip SEO hizmetleri olarak yeniden satmak
                (resale) ya da başkalarına ticari lisans vermek;</li>
                <li>Başka kullanıcıların hesaplarına, kişisel verilerine veya ödeme bilgilerine yetkisiz
                erişim sağlamaya çalışmak;</li>
                <li>Telif hakkıyla korunan içerikleri, telif hakkı sahibinin izni olmaksızın Platform
                üzerinden çoğaltmak veya dağıtmak;</li>
                <li>Platform altyapısına DDoS veya benzeri saldırı gerçekleştirmek ya da kasıtlı olarak
                sistemin stabil çalışmasını engellemek;</li>
                <li>Sahte değerlendirme, uydurma içerik veya yanıltıcı SEO sinyali üretmek.</li>
              </ul>
              <p>
                Bu maddelere aykırı davranılması; önceden uyarı yapılmaksızın hesabın askıya alınması veya
                kalıcı kapatılması, tahakkuk etmiş ücretlerin iadesi yapılmaması ve uğranılan zararın
                tazmin edilmesi için hukuki yola başvurulması sonuçlarını doğurabilir.
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">6. Fikri Mülkiyet Hakları</h2>
              <h3 className="text-white/90 font-medium mt-4 mb-2">6.1 Şirketin Hakları</h3>
              <p>
                Platform yazılımının tüm hakları (kaynak kodu, nesne kodu, API&apos;ler, veritabanı yapısı dahil),
                tasarımlar, grafik unsurlar, markalar, ticaret unvanları, logolar, içerikler ve diğer tüm
                fikri mülkiyet unsurları münhasıran <strong>FunBreak Global Teknoloji Ltd. Şti.</strong>&apos;ye
                aittir veya lisanslıdır. Platforma erişim, bu hakların Kullanıcıya devredildiği anlamına gelmez.
              </p>
              <p>
                Şirket; Kullanıcıya, bu Şartlar geçerli olduğu süre boyunca ve yalnızca kendi iş amaçları
                doğrultusunda kullanmak üzere sınırlı, münhasır olmayan, devredilemez ve lisans verilemez
                bir kullanım hakkı tanır.
              </p>
              <h3 className="text-white/90 font-medium mt-4 mb-2">6.2 Kullanıcı İçerikleri</h3>
              <p>
                Kullanıcının Platforma yüklediği veriler (domain bilgileri, anahtar kelimeler, proje içerikleri vb.)
                Kullanıcıya ait olmaya devam eder. Kullanıcı, bu verilerin Platform tarafından hizmetin
                sağlanması, teknik işleyişin sürdürülmesi ve sistem güvenliğinin korunması amacıyla işlenmesine
                açıkça izin verir.
              </p>
              <p>
                Şirket, kişisel veriler çıkarılmış ve anonim hale getirilmiş toplu kullanım verilerini hizmet
                iyileştirme ve istatistiksel analiz amacıyla kullanma hakkını saklı tutar.
              </p>
              <h3 className="text-white/90 font-medium mt-4 mb-2">6.3 Geri Bildirimler</h3>
              <p>
                Kullanıcının Şirkete ilettiği öneri, fikir veya geri bildirimler herhangi bir telif hakkı veya
                tazminat yükümlülüğü doğurmaksızın Şirket tarafından serbestçe kullanılabilir.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">7. Üçüncü Taraf Entegrasyonları ve Dış Hizmetler</h2>
              <p>
                Platform; Google Search Console, Google Analytics, DataForSEO, Anthropic Claude, OpenAI ve
                benzeri üçüncü taraf hizmetlerle entegre çalışabilir. Bu entegrasyonlar Şirket tarafından kolaylık
                amacıyla sunulmaktadır; ancak söz konusu üçüncü taraf hizmetlerinin kullanılabilirliği, doğruluğu,
                güvenliği veya sürekliliğinden Şirket sorumlu değildir.
              </p>
              <p>
                Google&apos;ın algoritma değişiklikleri, API politika güncellemeleri, DataForSEO veri kısıtlamaları
                veya diğer harici değişiklikler nedeniyle Platform özelliklerinin işleyişinde aksaklık yaşanması
                halinde Şirket herhangi bir tazminat yükümlülüğü üstlenmez.
              </p>
              <p>
                Üçüncü taraf platformların kendi kullanım şartları ve gizlilik politikaları geçerlidir;
                Kullanıcı bu koşulları bağımsız olarak değerlendirmekle yükümlüdür.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">8. Sorumluluk Reddi ve Sorumluluk Sınırlaması</h2>
              <h3 className="text-white/90 font-medium mt-4 mb-2">8.1 Garanti Reddi</h3>
              <p>
                Platform <strong>&quot;olduğu gibi&quot; (as-is)</strong> ve <strong>&quot;mevcut durumda&quot; (as-available)</strong>
                sunulmaktadır. Şirket; açık veya zımni hiçbir garanti vermemektedir. Özellikle aşağıdakiler
                garanti edilmez:
              </p>
              <ul>
                <li>Belirli arama motoru sıralama artışları veya organik trafik kazanımları;</li>
                <li>Yapay zeka sistemlerinde (ChatGPT, Gemini, Perplexity vb.) belirli görünürlük seviyeleri;</li>
                <li>Platformun kesintisiz, hatasız veya güvenli şekilde çalışması;</li>
                <li>Platform tarafından üretilen içeriklerin belirli bir kalite veya orijinallik standardını karşılaması;</li>
                <li>Backlink satın alma işlemlerinin SEO değerine olumlu katkı sağlaması.</li>
              </ul>
              <p>
                SEO ve GEO sonuçları; içerik kalitesi, domain otoritesi, rakip rekabeti, Google algoritma
                değişiklikleri ve kullanıcı deneyimi dahil pek çok faktöre bağlıdır. Bu faktörler üzerinde
                Şirketin kontrolü bulunmamaktadır.
              </p>
              <h3 className="text-white/90 font-medium mt-4 mb-2">8.2 Sorumluluk Tavanı</h3>
              <p>
                Yürürlükteki hukuk çerçevesinde Şirketin azami sorumluluğu, davanın doğduğu tarihten önceki
                <strong> son 3 (üç) aylık abonelik bedelini</strong> hiçbir koşulda aşamaz.
              </p>
              <h3 className="text-white/90 font-medium mt-4 mb-2">8.3 Dolaylı Zararlar</h3>
              <p>
                Şirket; kâr kaybı, iş kaybı, veri kaybı, itibar kaybı, iş fırsatı kaybı veya diğer dolaylı,
                tesadüfi, özel ya da cezai zararlardan sorumlu değildir. Bu sınırlama, zararın öngörülüp
                öngörülemeyeceğinden bağımsız olarak geçerlidir.
              </p>
              <h3 className="text-white/90 font-medium mt-4 mb-2">8.4 Mücbir Sebepler</h3>
              <p>
                Deprem, sel, yangın, salgın, hükümet kararları, internet altyapısı kesintileri, bulut hizmet
                sağlayıcısı arızaları, siber saldırılar, grev, abluka veya tarafların makul şekilde önleyemeyeceği
                diğer mücbir sebep halleri nedeniyle yükümlülüklerin yerine getirilmemesinden Şirket sorumlu
                tutulamaz.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">9. Tazminat</h2>
              <p>
                Kullanıcı; (a) bu Şartları ihlal etmesi, (b) Platformu hukuka aykırı biçimde kullanması,
                (c) üçüncü tarafların fikri mülkiyet haklarını ihlal etmesi veya (d) yanlış ya da yanıltıcı
                bilgi sağlaması nedeniyle Şirkete, yöneticilerine, çalışanlarına ve iş ortaklarına yöneltilebilecek
                her türlü iddia, dava, zarar, yükümlülük, masraf ve makul avukatlık ücretlerinden Şirketi
                kayıtsız şartsız tazmin etmekle yükümlüdür.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">10. Fesih ve Hesap Kapatma</h2>
              <h3 className="text-white/90 font-medium mt-4 mb-2">10.1 Kullanıcı Tarafından Fesih</h3>
              <p>
                Kullanıcı, hesabını istediği zaman Platform üzerindeki hesap ayarlarından veya
                <strong> legal@funbreakseo.com</strong> adresine yazılı bildirim yaparak kapatabilir. Hesap
                kapatma işlemi mevcut dönem sonunda geçerli olur; kalan süre için ücret iadesi yapılmaz.
              </p>
              <h3 className="text-white/90 font-medium mt-4 mb-2">10.2 Şirket Tarafından Fesih</h3>
              <p>
                Şirket, aşağıdaki hallerde önceden bildirim yapmaksızın hesabı askıya alabilir veya kapatabilir:
              </p>
              <ul>
                <li>Bu Şartların herhangi bir maddesinin ihlali;</li>
                <li>Ödeme yükümlülüklerinin 30 (otuz) günden uzun süre yerine getirilmemesi;</li>
                <li>Platformun kötüye kullanımı veya yasadışı faaliyetlerde kullanılması;</li>
                <li>Mahkeme kararı veya yasal zorunluluk;</li>
                <li>Üçüncü taraflara zarar verici faaliyetlerin tespiti.</li>
              </ul>
              <p>
                Şirket tarafından yapılan fesihte, ihlale dayalı ise ödenen ücretler iade edilmez. Şirket
                takdirine dayalı ise (örn. hizmetin sonlandırılması) kalan dönem orantılı olarak iade edilir.
              </p>
              <h3 className="text-white/90 font-medium mt-4 mb-2">10.3 Veri Silme</h3>
              <p>
                Hesap kapatılmasının ardından Kullanıcı verileri 90 (doksan) gün içinde sistemden kalıcı olarak
                silinir. Kullanıcı, kapatma öncesinde verilerini dışa aktarmakla yükümlüdür. Şirket, hesap
                kapatma sonrasında veri kurtarma hizmeti sunmaz.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">11. Hizmet Düzeyi ve Bakım</h2>
              <p>
                Şirket, Platform için aylık %99 çalışma süresi (uptime) hedeflemektedir. Bu hedef, bir taahhüt
                veya garanti değildir; planlanmış bakım pencereleri, acil durum güncellemeleri veya üçüncü taraf
                altyapı sorunları bu sürenin dışındadır.
              </p>
              <p>
                Planlanmış bakım çalışmaları mümkün olduğunda en az 24 (yirmi dört) saat öncesinden
                bildirilmeye çalışılır. Acil bakım durumlarında önceden bildirim yapılamayabilir.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">12. Değişiklik Hakkı</h2>
              <p>
                Şirket, bu Şartları herhangi bir zamanda güncelleme hakkını saklı tutar. Önemli değişiklikler
                en az 14 (on dört) gün öncesinden kayıtlı e-posta adresine bildirilir ve Platform ana sayfasında
                duyurulur. Değişikliğin yürürlüğe girmesinin ardından Platformu kullanmaya devam etmeniz,
                güncel Şartları kabul ettiğiniz anlamına gelir. Şartları kabul etmiyorsanız hesabınızı
                kapatma hakkınız saklıdır.
              </p>
            </section>

            {/* 13 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">13. Uygulanacak Hukuk ve Yetki</h2>
              <p>
                Bu Şartlar, Türkiye Cumhuriyeti hukukuna tabidir. İşbu Sözleşmeden doğan veya doğabilecek
                her türlü anlaşmazlığın çözümünde <strong>İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri</strong>
                münhasıran yetkilidir. Kullanıcı bu yetki sözleşmesini peşinen kabul eder.
              </p>
              <p>
                Şartların herhangi bir hükmünün yetkili mahkeme tarafından geçersiz ya da uygulanamaz bulunması
                halinde, bu hüküm geçerli en yakın hükümle değiştirilir; diğer hükümler geçerliliğini korumaya
                devam eder.
              </p>
            </section>

            {/* 14 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">14. Gizlilik ve Kişisel Veri</h2>
              <p>
                Kişisel verilerin işlenmesine ilişkin detaylı bilgi için lütfen{' '}
                <a href="/gizlilik-politikasi" className="text-indigo-400 hover:text-indigo-300">Gizlilik Politikamızı</a>{' '}
                ve{' '}
                <a href="/kvkk" className="text-indigo-400 hover:text-indigo-300">KVKK Aydınlatma Metnimizi</a>{' '}
                inceleyiniz. Çerez kullanımı için{' '}
                <a href="/cerez-politikasi" className="text-indigo-400 hover:text-indigo-300">Çerez Politikamıza</a>{' '}
                başvurabilirsiniz.
              </p>
            </section>

            {/* 15 */}
            <section>
              <h2 className="text-white font-semibold text-xl mb-3">15. İletişim</h2>
              <p>Bu Şartlara ilişkin sorularınız, şikayetleriniz veya yasal bildirimler için:</p>
              <div className="mt-3 p-4 rounded-xl bg-white/5 border border-white/10 space-y-1 text-sm">
                <p><strong className="text-white/80">Şirket:</strong> FunBreak Global Teknoloji Ltd. Şti.</p>
                <p><strong className="text-white/80">Hukuk E-posta:</strong> legal@funbreakseo.com</p>
                <p><strong className="text-white/80">Destek E-posta:</strong> destek@funbreakseo.com</p>
                <p><strong className="text-white/80">Adres:</strong> Çifte Havuzlar Mah. Eski Londra Asfaltı Cad. Kuluçka Merkezi B2 Blok No:151/1C İç Kapı No:2B Esenler / İstanbul</p>
              </div>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
