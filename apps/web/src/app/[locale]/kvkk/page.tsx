import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni | FunBreak SEO',
  description: 'FunBreak Global Teknoloji Ltd. Şti. KVKK 6698 sayılı Kanun kapsamında kişisel veri işleme aydınlatma metni.',
};

export default function KvkkPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-white mb-2">KVKK Kişisel Verilerin Korunması Aydınlatma Metni</h1>
          <p className="text-white/40 text-sm mb-10">Son güncelleme: 1 Ocak 2025</p>

          <div className="prose prose-invert max-w-none space-y-8 text-white/70">
            <section>
              <h2>1. Veri Sorumlusunun Kimliği</h2>
              <p>
                6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, kişisel verileriniz;
                veri sorumlusu sıfatıyla <strong>FunBreak Global Teknoloji Ltd. Şti.</strong> tarafından
                aşağıda açıklanan kapsamda işlenmektedir.
              </p>
              <p>
                <strong>Şirket Ünvanı:</strong> FunBreak Global Teknoloji Ltd. Şti.<br />
                <strong>Adres:</strong> Çifte Havuzlar Mah. Eski Londra Asfaltı Cad. Kuluçka Merkezi B2 Blok No:151/1C İç Kapı No:2B Esenler/İstanbul<br />
                <strong>Vergi No:</strong> İstanbul Vergi Dairesi<br />
                <strong>E-posta:</strong> destek@funbreakseo.com<br />
                <strong>Telefon:</strong> 0533 448 82 53
              </p>
            </section>

            <section>
              <h2>2. İşlenen Kişisel Veriler</h2>
              <p>FunBreak SEO platformunu kullandığınızda aşağıdaki kişisel veriler işlenmektedir:</p>
              <ul>
                <li><strong>Kimlik Verileri:</strong> Ad, soyad, kullanıcı adı</li>
                <li><strong>İletişim Verileri:</strong> E-posta adresi, telefon numarası</li>
                <strong>Şirket Verileri:</strong> Şirket adı, vergi numarası, fatura adresi
                <li><strong>Finansal Veriler:</strong> Ödeme yöntemi bilgileri (kartın son 4 hanesi), fatura bilgileri</li>
                <li><strong>Kullanım Verileri:</strong> Platform kullanım logları, oturum bilgileri, IP adresi, tarayıcı bilgisi</li>
                <li><strong>Proje Verileri:</strong> Girilen domain bilgileri, anahtar kelimeler, analiz sonuçları</li>
                <li><strong>Çerez Verileri:</strong> Tercih çerezleri, analitik çerezler (onay verilmesi halinde)</li>
              </ul>
            </section>

            <section>
              <h2>3. Kişisel Verilerin İşlenme Amaçları</h2>
              <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
              <ul>
                <li>Platformun sağlanması ve hizmetin yürütülmesi</li>
                <li>Hesap oluşturma ve kimlik doğrulama</li>
                <li>Abonelik yönetimi ve faturalama</li>
                <li>Müşteri desteği ve iletişim</li>
                <li>Platform güvenliğinin sağlanması ve dolandırıcılık önleme</li>
                <li>Yasal yükümlülüklerin yerine getirilmesi (vergi mevzuatı, e-Devlet bildirimleri)</li>
                <li>Hizmet kalitesinin iyileştirilmesi (onay verilmesi halinde analitik)</li>
                <li>Pazarlama iletişimleri (açık rıza alınması halinde)</li>
              </ul>
            </section>

            <section>
              <h2>4. Hukuki Dayanak</h2>
              <p>Kişisel verileriniz KVKK&apos;nın 5. maddesi kapsamında aşağıdaki hukuki dayanaklar ile işlenmektedir:</p>
              <ul>
                <li><strong>Sözleşmenin ifası:</strong> Hizmet sözleşmesinin kurulması ve yürütülmesi için zorunlu işlemler</li>
                <li><strong>Yasal yükümlülük:</strong> Vergi kanunları, ticaret kanunu kapsamındaki yükümlülükler</li>
                <li><strong>Meşru menfaat:</strong> Platform güvenliği, hata tespiti ve geliştirme faaliyetleri</li>
                <li><strong>Açık rıza:</strong> Pazarlama iletişimleri ve isteğe bağlı analitik çerezler</li>
              </ul>
            </section>

            <section>
              <h2>5. Kişisel Verilerin Aktarımı</h2>
              <p>
                Kişisel verileriniz; hizmetin sağlanması amacıyla aşağıdaki alıcı gruplarına aktarılabilir:
              </p>
              <ul>
                <li><strong>Altyapı ve Bulut Hizmetleri:</strong> Verileriniz şifreli olarak Türkiye veya AB sınırları içindeki sunucularda saklanır</li>
                <li><strong>Ödeme İşleme:</strong> Ödeme verileri PCI-DSS sertifikalı ödeme altyapısı aracılığıyla işlenir</li>
                <li><strong>E-posta Servisi:</strong> İşlemsel e-postalar için KVKK uyumlu servisler kullanılır</li>
                <li><strong>Yetkili Makamlar:</strong> Yargı kararı veya yasal zorunluluk halinde yetkili makamlarla paylaşılabilir</li>
              </ul>
              <p>
                Verileriniz hiçbir surette üçüncü taraf pazarlamacılara veya reklam şirketlerine satılmamaktadır.
              </p>
            </section>

            <section>
              <h2>6. Saklama Süreleri</h2>
              <ul>
                <li>Hesap verileri: Hesap kapanışından itibaren 3 yıl (yasal yükümlülükler saklı)</li>
                <li>Fatura ve finansal kayıtlar: 10 yıl (Türk Ticaret Kanunu)</li>
                <li>Teknik loglar: 6 ay</li>
                <li>Çerez verileri: Çerez politikasında belirtilen süreler</li>
              </ul>
            </section>

            <section>
              <h2>7. İlgili Kişinin Hakları</h2>
              <p>KVKK&apos;nın 11. maddesi kapsamında aşağıdaki haklara sahipsiniz:</p>
              <ul>
                <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
                <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                <li>Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri öğrenme</li>
                <li>Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme</li>
                <li>KVKK&apos;nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerin silinmesini veya yok edilmesini isteme</li>
                <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkması hâlinde buna itiraz etme</li>
                <li>Kişisel verilerin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
              </ul>
              <p>
                Haklarınızı kullanmak için <strong>destek@funbreakseo.com</strong> adresine e-posta gönderebilir
                veya <strong>0533 448 82 53</strong> numaralı telefonu arayabilirsiniz.
              </p>
            </section>

            <section>
              <h2>8. Veri Güvenliği</h2>
              <p>
                Kişisel verilerinizin güvenliği için AES-256 şifreleme, SSL/TLS protokolleri, düzenli güvenlik
                denetimleri ve erişim kontrolü mekanizmaları uygulanmaktadır. Veri ihlali durumunda KVKK
                mevzuatı çerçevesinde Kişisel Verileri Koruma Kurumu&apos;na bildirim yapılacak ve etkilenen
                kullanıcılar bilgilendirilecektir.
              </p>
            </section>

            <section>
              <h2>9. Çerez Politikası</h2>
              <p>
                Platformumuzda kullanılan çerezler hakkında ayrıntılı bilgi için{' '}
                <a href="/cerez-politikasi">Çerez Politikamızı</a> inceleyiniz.
              </p>
            </section>

            <section>
              <h2>10. Şikâyet Yolu</h2>
              <p>
                Kişisel veri işleme faaliyetlerimize ilişkin şikayetlerinizi önce bize iletmenizi tavsiye ederiz.
                Çözüme kavuşturulamayan şikayetler için Kişisel Verileri Koruma Kurumu&apos;na (KVKK)
                başvurabilirsiniz: <strong>www.kvkk.gov.tr</strong>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
