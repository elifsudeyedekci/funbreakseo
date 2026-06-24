'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PillarContentSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 border-y border-white/5" id="seo-rehberi">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          SEO ve GEO: Kapsamlı Başlangıç Rehberi
        </h2>
        <p className="text-white/50 mb-8 text-lg">
          Google ve yapay zeka aramalarında nasıl görünür olunur? Temel kavramlar, stratejiler ve en iyi uygulamalar.
        </p>

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

            <h2 className="text-white">FunBreak SEO ile Tüm Bu Süreçleri Otomatikleştirin</h2>
            <p>
              FunBreak SEO, yukarıda anlattığımız tüm SEO ve GEO süreçlerini tek bir platformda toplar ve büyük
              ölçüde otomatikleştirir. Platform, aylık düzenli taramalar, AI destekli içerik önerileri, GEO
              görünürlük izleme, backlink profili takibi ve outreach kampanyası yönetimini kesintisiz olarak gerçekleştirir.
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
