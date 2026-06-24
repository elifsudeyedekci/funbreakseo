import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Mesafeli Satış Sözleşmesi | FunBreak SEO',
};

export default function DistanceSalesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-white mb-2">Mesafeli Satış Sözleşmesi</h1>
          <p className="text-white/40 text-sm mb-10">Son güncelleme: 1 Ocak 2025</p>

          <div className="prose prose-invert max-w-none space-y-8 text-white/70">
            <section>
              <h2>1. Taraflar</h2>
              <p>
                <strong>SATICI:</strong><br />
                Unvan: FunBreak Global Teknoloji Ltd. Şti.<br />
                Adres: Çifte Havuzlar Mah. Eski Londra Asfaltı Cad. Kuluçka Merkezi B2 Blok No:151/1C İç Kapı No:2B Esenler/İstanbul<br />
                Telefon: 0533 448 82 53<br />
                E-posta: destek@funbreakseo.com<br />
                MERSİS No: Tescil aşamasında
              </p>
              <p>
                <strong>ALICI:</strong> Platforma kayıt olan ve ödeme gerçekleştiren bireysel kullanıcı
                veya yetkili tüzel kişilik temsilcisi.
              </p>
            </section>

            <section>
              <h2>2. Sözleşme Konusu</h2>
              <p>
                İşbu sözleşme, ALICI&apos;nın FunBreak SEO platformunda seçtiği abonelik planına ilişkin
                olarak, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler
                Yönetmeliği kapsamında tarafların hak ve yükümlülüklerini düzenler.
              </p>
            </section>

            <section>
              <h2>3. Ürün/Hizmet Bilgileri</h2>
              <p>
                Platform&apos;da sunulan hizmetler dijital (elektronik) hizmet niteliğindedir:
              </p>
              <ul>
                <li>Başlangıç Planı: ₺499/ay (KDV dahil)</li>
                <li>Büyüme Planı: ₺999/ay (KDV dahil)</li>
                <li>Pro Planı: ₺2.499/ay (KDV dahil)</li>
                <li>Kurumsal Plan: Özel fiyat</li>
              </ul>
              <p>Yıllık aboneliklerde 2 ay bedava kampanyası uygulanır.</p>
            </section>

            <section>
              <h2>4. Cayma Hakkı</h2>
              <p>
                6502 sayılı Kanun&apos;un 49. maddesi ve ilgili yönetmelik çerçevesinde, dijital içerik
                ve hizmetlerde cayma hakkının istisnaları uygulanmaktadır. ALICI, teslim anında
                (platforma ilk erişim) dijital içerik ifasına açık rıza gösterdiğinden ve cayma
                hakkından feragat ettiğinden haberdar olduğunu kabul eder.
              </p>
              <p>
                Bununla birlikte, hizmetin kullanılmadığının ispatlanabildiği hallerde, ilk fatura
                dönemine ilişkin iade talepleri değerlendirilebilir. Ayrıntılar için
                <a href="/iade-ve-iptal">İade ve İptal Politikamızı</a> inceleyiniz.
              </p>
            </section>

            <section>
              <h2>5. Ödeme Şartları</h2>
              <p>
                Ödeme, abonelik başlangıcında ve her dönem yenilenmesinde kredi/banka kartı veya
                platform cüzdanı üzerinden tahsil edilir. Tüm ödemeler KDV dahildir.
                Yıllık planlarda ödeme tek seferlik alınır.
              </p>
            </section>

            <section>
              <h2>6. Hizmetin Süresi ve Sona Ermesi</h2>
              <p>
                Abonelik, seçilen plana göre aylık veya yıllık dönemler halinde devam eder.
                İptal edilmediği sürece otomatik olarak yenilenir. İptal, bir sonraki dönem
                başlamadan önce platform üzerinden gerçekleştirilebilir.
              </p>
            </section>

            <section>
              <h2>7. Uyuşmazlıkların Çözümü</h2>
              <p>
                İşbu sözleşmeden doğan uyuşmazlıklarda Türkiye Cumhuriyeti mahkemeleri ve
                Tüketici Hakem Heyetleri yetkilidir. İstanbul (Çağlayan) Mahkemeleri esas
                yetki mahkemesidir. Tüketiciler, Tüketici Hakem Heyetleri&apos;ne başvurabilir.
              </p>
            </section>

            <section>
              <h2>8. Yürürlük</h2>
              <p>
                ALICI, ödeme ekranında onay kutucuklarını işaretleyerek ve &quot;Satın Al&quot; düğmesine
                tıklayarak işbu sözleşmeyi okuduğunu, anladığını ve kabul ettiğini beyan eder.
                Sözleşme, ödemenin gerçekleşmesiyle birlikte yürürlüğe girer.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
