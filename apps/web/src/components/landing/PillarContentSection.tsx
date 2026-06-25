'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from 'next-intl';

export function PillarContentSection() {
  const locale = useLocale();
  if (locale !== 'tr') return null;
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 border-y border-white/5" id="seo-rehberi">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm px-4 py-1.5 mb-5">
            <span className="text-xs font-medium text-white/50">Kapsamlı Rehber</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            SEO ve GEO: Kapsamlı Başlangıç Rehberi
          </h2>
          <p className="text-white/45 text-lg max-w-2xl mx-auto">
            Google ve yapay zeka aramalarında nasıl görünür olunur? Temel kavramlar, stratejiler ve en iyi uygulamalar.
          </p>
        </div>

        {/* Content — always in DOM, max-height collapsed via CSS */}
        <div
          className={cn(
            'pillar-content prose prose-invert max-w-none',
            expanded && 'expanded'
          )}
        >
          <div className="space-y-6 text-white/70 leading-relaxed">
            <h2 className="text-white">SEO Nedir ve Neden Önemlidir?</h2>
            <p>
              Arama Motoru Optimizasyonu (SEO), web sitenizin Google, Bing ve diğer arama motorlarında organik
              (ücretli olmayan) arama sonuçlarında üst sıralarda yer almasını sağlamak için uygulanan stratejiler
              ve teknikler bütünüdür. SEO, potansiyel müşterilerinizin sizi bulmasını kolaylaştırır ve uzun vadeli
              sürdürülebilir bir dijital büyüme sağlar.
            </p>
            <p>
              2024 yılı itibarıyla Google'da gerçekleştirilen arama sayısı günde 8,5 milyarı aşmıştır. Bu aramaların
              %53&apos;ü organik arama sonuçlarından tıklama alırken, yalnızca %27&apos;si ücretli reklamlardan gelmektedir.
              Bu veri, SEO&apos;nun dijital pazarlamadaki kritik önemini açıkça ortaya koymaktadır.
            </p>

            <h2 className="text-white">Teknik SEO: Temelden Başlamak</h2>
            <p>
              Teknik SEO, web sitenizin arama motoru robotları (crawler) tarafından düzgün okunabilmesini ve
              indekslenmesini sağlayan altyapı çalışmalarıdır. En temel teknik SEO unsurları şunlardır:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Site Hızı:</strong> Google Core Web Vitals metriklerine göre, LCP (En Büyük İçerik Boyası) 2.5 saniyenin altında, CLS (Kümülatif Düzen Kayması) 0.1&apos;in altında ve INP (Bir Sonraki Boyamayla Etkileşim) 200ms&apos;nin altında olmalıdır.</li>
              <li><strong className="text-white">Mobil Uyumluluk:</strong> Google, Mobile-First indeksleme yaklaşımını kullandığından mobil deneyim kritiktir. Responsive tasarım ve düzgün viewport ayarları şarttır.</li>
              <li><strong className="text-white">HTTPS ve Güvenlik:</strong> SSL sertifikası artık temel bir sıralama sinyali olmuştur. HTTP&apos;den HTTPS&apos;e geçiş kaçınılmazdır.</li>
              <li><strong className="text-white">XML Sitemap:</strong> Tüm önemli sayfaları içeren ve düzenli güncellenen bir XML sitemap, arama motorlarının sitenizi keşfetmesini hızlandırır.</li>
              <li><strong className="text-white">Robots.txt:</strong> Hangi sayfaların indeksleneceğini, hangilerinin indekslenmeyeceğini kontrol eder. Yanlış yapılandırma önemli sayfalanın indekslenmesini engelleyebilir.</li>
              <li><strong className="text-white">Canonical Tags:</strong> Yinelenen içerik sorunlarını önlemek için kanonik URL&apos;ler tanımlanmalıdır.</li>
              <li><strong className="text-white">Yapısal Veri (Schema.org):</strong> Zengin snippet&apos;lar için JSON-LD formatında yapısal veri eklemek tıklanma oranlarını artırır.</li>
            </ul>

            <h2 className="text-white">İçerik SEO: Kullanıcı Niyetini Anlamak</h2>
            <p>
              İçerik SEO, hedef kitlenizin arama niyetine (search intent) uygun, yüksek kaliteli içerikler
              oluşturma sanatıdır. Google&apos;ın EEAT (Deneyim, Uzmanlık, Otorite, Güvenilirlik) rehberleri
              doğrultusunda içerikler hazırlanmalıdır.
            </p>
            <p>
              Anahtar kelime araştırması, içerik SEO&apos;nun temelidir. Doğru anahtar kelimeleri seçmek için şu
              kriterleri değerlendirmeniz gerekir:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Arama Hacmi:</strong> Aylık kaç kullanıcının bu kelimeyi aradığını gösterir. Yüksek hacimli kelimeler daha fazla potansiyel trafik sunar.</li>
              <li><strong className="text-white">Anahtar Kelime Zorluğu (KD):</strong> 0-100 arasında değişen bu skor, kelimede sıralamaya girmenin ne kadar zor olduğunu gösterir.</li>
              <li><strong className="text-white">Arama Niyeti:</strong> Bilgisel, gezinme amaçlı, işlem amaçlı veya ticari araştırma olmak üzere dört kategoride değerlendirilir.</li>
              <li><strong className="text-white">Long-tail Kelimeler:</strong> Daha az rekabetçi, daha spesifik kelimeler genellikle daha yüksek dönüşüm oranı sağlar.</li>
            </ul>

            <h2 className="text-white">GEO (Generative Engine Optimization) Nedir?</h2>
            <p>
              Generative Engine Optimization (GEO), geleneksel SEO&apos;yu tamamlayan ve web sitenizin yapay zeka
              destekli arama motorlarında (ChatGPT, Gemini, Perplexity, Claude, Google AI Overviews) görünür
              olmasını sağlamak için uygulanan yeni nesil optimizasyon stratejisidir.
            </p>
            <p>
              2024-2025 yıllarında yapay zeka aramaları patlama yaşadı. ChatGPT aylık 100 milyonun üzerinde aktif
              kullanıcıya ulaştı, Google AI Overviews ise arama sonuç sayfalarının %80&apos;inden fazlasında
              görünmeye başladı. Bu durum, içerik stratejistleri ve SEO uzmanları için tamamen yeni bir oyun
              alanı yarattı.
            </p>
            <p>
              GEO optimizasyonunun temel unsurları şunlardır:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Entity (Varlık) Optimizasyonu:</strong> Marka adınızın, ürünlerinizin ve uzman kişilerinizin bilgi grafları (Knowledge Graph) üzerinde net biçimde tanımlanması gerekir. Google Yapılandırılmış Veri, Wikipedia benzeri referanslar ve güvenilir kaynaklardan backlinkler entity otoritesini güçlendirir.</li>
              <li><strong className="text-white">Cevap Öncelikli (Answer-First) Yazım:</strong> AI modelleri, soruya doğrudan cevap veren içerikleri tercih eder. Her içerik, hedef soruya ilk 50-100 kelimede net bir cevap sunmalıdır.</li>
              <li><strong className="text-white">Kaynak Alıntılanabilirlik (Citation):</strong> AI&apos;ların güvenilir bulduğu kaynakları alıntılaması için içeriğinizin akademik makaleler, istatistikler ve orijinal araştırmalar içermesi gerekir.</li>
              <li><strong className="text-white">Prompt İzleme:</strong> Hedef kitlenizin yapay zekaya ne tür sorular sorduğunu analiz edin ve içeriğinizi bu sorgulara göre optimize edin.</li>
              <li><strong className="text-white">Mention vs Citation Oranı:</strong> AI konuşmalarında adınızın geçmesi (mention) ile sitenizin kaynak gösterilmesi (citation) arasındaki oranı izleyin. Düşük citation oranı içerik yapısı sorununa işaret eder.</li>
            </ul>

            <h2 className="text-white">Backlink Stratejisi ve Dijital PR</h2>
            <p>
              Backlink, başka web sitelerinin sizin sitenize verdiği bağlantılardır. Google&apos;ın algoritması,
              kaliteli backlink&apos;leri bir güven ve otorite göstergesi olarak değerlendirir. Ancak her backlink
              eşit değerde değildir.
            </p>
            <p>
              Kaliteli backlink profili oluşturmak için şu stratejiler uygulanabilir:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Yayıncı Marketplace:</strong> Onaylı, yüksek DR&apos;li yayıncılardan güvenceli sipariş ile backlink satın almak, hızlı otorite kazanmanın en etkili yollarından biridir.</li>
              <li><strong className="text-white">Dijital PR / Outreach:</strong> İnfografikler, orijinal araştırmalar ve basın bültenleri ile medya kuruluşlarından organik link kazanımı sağlanabilir.</li>
              <li><strong className="text-white">Kırık Link İnşası:</strong> Rakiplerin kırık bağlantılarını tespit edip, o bağlantıları içeriğinizle değiştirmeyi teklif etmek etkili bir yöntemdir.</li>
              <li><strong className="text-white">Misafir Yazarlık:</strong> Sektörünüzdeki otoriter bloglara misafir yazılar yazarak doğal link profili oluşturabilirsiniz.</li>
            </ul>

            <h2 className="text-white">Sıralama Takibi ve Analitik</h2>
            <p>
              SEO çalışmalarınızın etkinliğini ölçmek için doğru KPI&apos;ları (Temel Performans Göstergesi) takip
              etmeniz kritiktir. En önemli SEO metrikleri şunlardır:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Organik Oturum:</strong> Google Analytics 4&apos;ten takip edilebilecek temel trafik metriğidir.</li>
              <li><strong className="text-white">Anahtar Kelime Pozisyonu:</strong> Hedef kelimelerinizde Google SERP&apos;te kaçıncı sırada olduğunuzun günlük takibi.</li>
              <li><strong className="text-white">Görünürlük Skoru:</strong> Tüm takip edilen kelimeleriniz için ağırlıklı ortalama tıklanma oranı (CTR) potansiyelini gösterir.</li>
              <li><strong className="text-white">Domain Rating (DR) / Domain Authority (DA):</strong> Site otorite metriklerinin zaman içindeki değişimi.</li>
              <li><strong className="text-white">Core Web Vitals:</strong> Google Search Console üzerinden LCP, CLS ve INP metriklerinin düzenli kontrolü.</li>
              <li><strong className="text-white">GEO Görünürlük Skoru:</strong> AI platformlarında mention ve citation sayınızın toplam GEO sağlığını gösteren bileşik metrik.</li>
            </ul>

            <h2 className="text-white">Yerel SEO (Local SEO): Fiziksel İşletmeler İçin Zorunlu</h2>
            <p>
              Fiziksel bir işletmeniz varsa — restoran, klinik, hukuk bürosu, otomotiv galerisi veya herhangi bir
              yerel hizmet — Yerel SEO sizi internet üzerinde bölgenizdeki potansiyel müşterilere ulaştırmanın en
              etkili yoludur. Google, kullanıcının konumuna göre kişiselleştirilmiş sonuçlar gösterir; bu yüzden
              &ldquo;yakınımdaki diş kliniği&rdquo; veya &ldquo;İstanbul karşıyaka SEO ajansı&rdquo; gibi aramalarda üst sıralarda yer
              almak büyük önem taşır.
            </p>
            <p>
              Yerel SEO&apos;nun temel bileşenleri şunlardır:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Google İşletme Profili (GBP):</strong> Eski adıyla Google Benim İşletmem olan bu platform, yerel aramalarda &ldquo;local pack&rdquo; denilen harita listesinde görünmenizi sağlar. Profili tam ve güncel tutmak, fotoğraf eklemek, çalışma saatlerini güncellemek çok önemlidir.</li>
              <li><strong className="text-white">NAP Tutarlılığı:</strong> İşletme adı (Name), adres (Address) ve telefon (Phone) bilgilerinin tüm online rehberlerde, sosyal medya profillerinde ve web sitenizde aynı formatta yer alması gerekir. Tutarsızlıklar Google&apos;ı karıştırır ve yerel sıralamayı olumsuz etkiler.</li>
              <li><strong className="text-white">Müşteri Yorumları:</strong> Google incelemeleri hem sıralama sinyali hem de güven faktörüdür. Memnun müşterileri yorum bırakmaya teşvik eden sistemli bir süreç oluşturun. Olumsuz yorumlara saygılı ve yapıcı şekilde yanıt verin.</li>
              <li><strong className="text-white">Yerel İçerik:</strong> &ldquo;İstanbul Avrupa Yakası&apos;nda SEO hizmeti&rdquo; gibi coğrafi hedefli içerikler oluşturun. Şehir veya ilçe sayfaları oluşturmak, birden fazla konumda hizmet veren işletmeler için güçlü bir stratejidir.</li>
              <li><strong className="text-white">Yerel Atıflar ve Dizinler:</strong> Yelp, Foursquare, Yandex Haritalar, Türkiye&apos;de ise Sahibinden, Mobi ve sektöre özel rehberlerde işletme bilgilerinizin doğru şekilde yer alması yerel otoriteyi güçlendirir.</li>
            </ul>

            <h2 className="text-white">Uluslararası SEO: Global Pazarlara Açılmak</h2>
            <p>
              Birden fazla ülkeye veya dil grubuna hizmet veren işletmeler için uluslararası SEO, organik büyümenin
              anahtar bileşenidir. Yanlış yapılandırılmış uluslararası SEO, farklı ülkelerdeki sayfaların birbirleriyle
              rekabet etmesine (cannibalization) yol açabilir.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Hreflang Etiketleri:</strong> Farklı dil ve bölge versiyonlarını Google&apos;a bildiren HTML etiketleridir. Her sayfada doğru hreflang implementasyonu, doğru sayfanın doğru ülkedeki kullanıcıya gösterilmesini sağlar.</li>
              <li><strong className="text-white">URL Yapısı:</strong> Alt dizin (/en/, /de/), alt alan adı (en.site.com) veya ülke kodu üst düzey alan adı (site.de) arasında tercih yapılmalıdır. Her yaklaşımın avantajları ve dezavantajları bulunur.</li>
              <li><strong className="text-white">İçerik Yerelleştirme:</strong> Yalnızca çeviri yapmak yeterli değildir. Hedef ülkenin kültürel referansları, para birimi, ölçü birimleri ve yerel arama alışkanlıkları gözetilerek içerik uyarlanmalıdır.</li>
              <li><strong className="text-white">Yerel Bağlantı İnşası:</strong> Hedef ülkedeki otoriter yayıncılardan backlink edinmek, uluslararası SEO&apos;nun en zorlu ama en ödüllendirici bileşenidir.</li>
            </ul>
            <p>
              FunBreak SEO, 8 dili (Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, Arapça, Rusça, Hintçe) destekler
              ve hreflang implementasyonunu otomatik olarak yönetir.
            </p>

            <h2 className="text-white">E-ticaret SEO: Ürün Sayfalarını Optimize Etmek</h2>
            <p>
              E-ticaret SEO&apos;su, standart içerik sitelerinden farklı zorluklar içerir. Yüzlerce veya binlerce ürün
              sayfasını yönetmek, tekrarlayan içerik sorunlarını önlemek ve kategori sayfalarını doğru optimize etmek
              kritik önem taşır.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Ürün Sayfa Optimizasyonu:</strong> Benzersiz, bilgi yoğun ürün açıklamaları yazın. Üretici açıklamalarını kopyalamak tekrarlayan içerik cezasına neden olabilir. Her ürün için hedef anahtar kelimesi belirleyin ve başlık, meta açıklama ile URL&apos;ye doğal biçimde entegre edin.</li>
              <li><strong className="text-white">Kategori Sayfaları:</strong> En yüksek organik trafik potansiyeline sahip sayfalardır. Güçlü bir giriş metni, filtreleme seçenekleri ve internal linking yapısı ile optimize edilmelidir.</li>
              <li><strong className="text-white">Product Schema:</strong> Ürün şeması (fiyat, stok durumu, inceleme puanı) Google&apos;da zengin snippet görünümü sağlar ve tıklanma oranını %20-30 artırabilir.</li>
              <li><strong className="text-white">Faceted Navigation:</strong> Filtreleme sayfalarının (renge göre, bedene göre vb.) yanlış indekslenmesi büyük tekrarlayan içerik sorunlarına yol açar. Canonical ve noindex direktifleri dikkatli kullanılmalıdır.</li>
              <li><strong className="text-white">Site Hızı:</strong> E-ticaret siteleri, yüksek görsel sayısı nedeniyle yavaşlamaya eğilimlidir. Google alışveriş deneyimini doğrudan site hızıyla ilişkilendirir; her saniyelik gecikme dönüşüm oranını %7 düşürebilir.</li>
            </ul>

            <h2 className="text-white">SEO Trendleri: 2026 ve Ötesi</h2>
            <p>
              SEO, durmaksızın evrilen bir disiplindir. Günümüzde öne çıkan ve gelecekte daha da büyük önem
              kazanması beklenen trendler şunlardır:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">AI Overview (SGE) Optimizasyonu:</strong> Google&apos;ın Arama Üretici Deneyimi, geleneksel mavi bağlantıların önüne geçerek sorgulara doğrudan cevap verir. Bu &ldquo;sıfır tıklama&rdquo; (zero-click) dünyasında, AI cevabında adınızın geçmesi yeni bir önem kazanmıştır.</li>
              <li><strong className="text-white">Sesli Arama:</strong> Akıllı hoparlörler ve mobil ses aramaların artmasıyla birlikte doğal dil sorguları artmaktadır. Soru-cevap formatında, konuşma diline uygun içerikler bu alanda avantaj sağlar.</li>
              <li><strong className="text-white">Görsel Arama:</strong> Google Lens gibi araçlarla görsel üzerinden arama giderek yaygınlaşmaktadır. Görsellerin alt text&apos;i, dosya adı ve çevresindeki metin optimizasyonu önem kazanmaktadır.</li>
              <li><strong className="text-white">E-E-A-T Güçlendirme:</strong> Google&apos;ın Deneyim, Uzmanlık, Otorite ve Güvenilirlik (E-E-A-T) çerçevesi, özellikle YMYL (Hayatınızı Etkileyen Kararlar — sağlık, finans, hukuk) kategorilerinde giderek daha belirleyici hale gelmektedir.</li>
              <li><strong className="text-white">Core Updates ve Algoritma Değişiklikleri:</strong> Google yılda birkaç kez büyük algoritma güncellemesi yayınlar. Bu güncellemelerde ayakta kalmak için asıl odak noktası her zaman kullanıcı deneyimi ve içerik kalitesi olmalıdır.</li>
            </ul>

            <h2 className="text-white">SEO Araçları: Hangi Araçları Kullanmalısınız?</h2>
            <p>
              Profesyonel bir SEO çalışması için doğru araçları seçmek, hem zaman hem de bütçe açısından kritiktir.
              İşte en sık kullanılan SEO araçları:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Google Search Console:</strong> Ücretsiz ve zorunlu. Sitenizin Google indeksindeki durumunu, tıklanma ve gösterim verilerini, Core Web Vitals raporlarını ve hataları gösterir.</li>
              <li><strong className="text-white">Google Analytics 4 (GA4):</strong> Kullanıcı davranışlarını, dönüşüm hunisini ve organik trafik kalitesini analiz etmek için kullanılır.</li>
              <li><strong className="text-white">DataForSEO / Ahrefs / SEMrush:</strong> Anahtar kelime araştırması, rakip analizi ve backlink profili takibi için kullanılan ücretli araçlardır. FunBreak SEO altyapısında DataForSEO API&apos;si entegre edilmiştir.</li>
              <li><strong className="text-white">Screaming Frog / Playwright Crawler:</strong> Site tarama araçları; kırık bağlantılar, yinelenen içerik, yanlış redirect&apos;ler ve teknik sorunları tespit etmek için kullanılır.</li>
              <li><strong className="text-white">FunBreak SEO:</strong> Tüm bu araçların işlevlerini tek çatı altında toplayan, Türkiye&apos;ye özel (TL ödemeli, KVKK uyumlu) entegre SEO + GEO platformu.</li>
            </ul>

            <h2 className="text-white">SEO Yatırım Getirisi (ROI): Beklentileri Doğru Belirlemek</h2>
            <p>
              SEO, ücretli reklamcılığın aksine, uzun vadeli ve bileşik bir büyüme stratejisidir. Ücretli reklam
              bütçenizi durdurduğunuzda trafik anında kesilir; ancak SEO ile elde ettiğiniz organik sıralamalar,
              doğru bakım yapıldığı takdirde yıllarca ayakta kalabilir.
            </p>
            <p>
              Gerçekçi SEO zaman çizelgesi şu şekilde değerlendirilebilir:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">0-3. Ay:</strong> Teknik SEO altyapısının kurulması, içerik stratejisinin oluşturulması, temel backlink profilinin analizi. Görünür sıralama değişikliği beklenmez.</li>
              <li><strong className="text-white">3-6. Ay:</strong> Long-tail anahtar kelimelerde ilk sıralamalar başlar. Organik trafik yavaş ama istikrarlı şekilde artmaya başlar.</li>
              <li><strong className="text-white">6-12. Ay:</strong> Orta rekabetli kelimeler için güçlü sıralamalar hedeflenebilir. Organik trafik kayda değer düzeye ulaşır.</li>
              <li><strong className="text-white">12+ Ay:</strong> Yüksek rekabetli ana kelimeler için ciddi görünürlük kazanılmaya başlanır. Backlink profili güçlendikçe otorite artışı ivme kazanır.</li>
            </ul>
            <p>
              SEO ROI hesaplamasında dikkat edilmesi gereken nokta şudur: Organik bir ziyaretçinin değeri, ücretli
              reklamdan gelen ziyaretçinin 2-3 katı olabilir; çünkü organik aramayla gelen kullanıcılar
              genellikle daha bilinçli ve satın almaya daha yakın aşamadadır.
            </p>

            <h2 className="text-white">FunBreak SEO ile Tüm Bu Süreçleri Otomatikleştirin</h2>
            <p>
              FunBreak SEO, yukarıda anlattığımız tüm SEO ve GEO süreçlerini tek bir platformda toplar ve büyük
              ölçüde otomatikleştirir. Platform, aylık düzenli taramalar, AI destekli içerik önerileri, GEO
              görünürlük izleme, backlink profili takibi ve outreach kampanyası yönetimini kesintisiz olarak
              gerçekleştirir. Teknik SEO sorunlarını otomatik tespit eder, öncelik sıralaması yapar ve JavaScript
              enjeksiyonu veya WordPress bağlantısı ile doğrudan sitenize uygular.
            </p>
            <p>
              Çok dilli destek sayesinde (TR, EN, DE, FR, ES, AR, RU, HI) tek platformdan tüm global SEO
              operasyonunuzu yönetebilirsiniz. Autopilot modu ile içerik takviminizi oluşturun, haftalık performans
              özetlerini e-postanıza alın ve yapay zeka çağında rakiplerinizin önünde kalın.
            </p>
            <p>
              14 günlük ücretsiz deneme ile kendi sitenizi analiz edin, rakiplerinizin güçlü ve zayıf yönlerini
              keşfedin ve yapay zeka çağında görünür olmanın yolunu öğrenin.
            </p>
          </div>
        </div>

        {/* Expand/collapse button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-6 flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors mx-auto"
          aria-expanded={expanded}
        >
          {expanded ? 'Daha az göster' : 'Tamamını oku'}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
    </section>
  );
}
