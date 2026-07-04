import type { IntlBlogContent } from './types';

/**
 * Kelime sayısı düşük kalan Türkçe blogların tam genişletilmiş içerikleri.
 * Slug'lar mevcut kayıtlarla eşleşir — seed upsert ile üzerine yazar.
 */
export const BLOGS_TR_EXPANSIONS: Record<string, IntlBlogContent> = {
  'backlink-nedir': {
    title: 'Backlink Nedir? Kaliteli Backlink Nasıl Alınır? (2026 Rehberi)',
    excerpt:
      'Backlink, başka bir sitenin sizin sitenize verdiği bağlantıdır ve Google için en güçlü otorite sinyallerinden biridir. Bu rehberde backlink türlerini, kalite kriterlerini ve 2026\'da işe yarayan link kazanma yöntemlerini bulacaksınız.',
    metaTitle: 'Backlink Nedir? Kaliteli Backlink Nasıl Alınır? | FunBreak SEO',
    metaDescription:
      'Backlink nedir, dofollow/nofollow farkı ne, kaliteli backlink nasıl alınır? 2026 için güncel, cezasız link kazanma rehberi.',
    readingMinutes: 8,
    faqSection: [
      {
        question: 'Dofollow ve nofollow backlink arasındaki fark nedir?',
        answer:
          'Dofollow linkler PageRank (otorite) aktarır ve sıralamayı doğrudan etkiler. Nofollow linkler otorite aktarmaz ama trafik ve marka bilinirliği sağlar; doğal bir link profilinde her ikisi de bulunur.',
      },
      {
        question: 'Kaç backlink almam gerekiyor?',
        answer:
          'Evrensel bir sayı yok — hedef kelimenizin rekabetine bağlı. İlk 10 sonucu inceleyin: onların referans domain sayıları gerçekçi aralığı belirler. İlgili ve otoriter 10 site linki, bin dizin linkinden daha değerlidir.',
      },
      {
        question: 'Backlink satın almak cezaya yol açar mı?',
        answer:
          'Link çiftliklerinden toplu alım en hızlı ceza yoludur. Güvenli olan: gerçekten ilgili içeriğin şeffaf sponsorluğu ve her yerleşimin gerçek trafikli gerçek bir sitede olduğu, linkin yayında kaldığının otomatik doğrulandığı denetimli pazaryerleri.',
      },
    ],
    bodyMarkdown: `**Backlink (geri bağlantı), başka bir web sitesinin kendi sayfasından sizin sitenize verdiği bağlantıdır. Google bu bağlantıları bir tür "güven oyu" olarak değerlendirir: ilgili ve otoriter sitelerden ne kadar çok kaliteli link alırsanız, sıralamada o kadar güçlenirsiniz.** 2026'da kazanan yaklaşım az ama kaliteli link: alakalı sitelerden, değer üreterek kazanılmış bağlantılar.

## Backlink Neden Bu Kadar Önemli?

Google, linklerin temel sıralama sinyali olduğunu defalarca doğruladı ve tüm büyük korelasyon çalışmaları aynı sonuca varıyor: ilk 3'teki sayfaların referans domain sayısı, 2. sayfadakilerden belirgin şekilde fazla. Üstelik yapay zeka arama sistemleri de hangi kaynağı alıntılayacağını seçerken link otoritesini kullanıyor — yani link inşası artık iki kez kazandırıyor: hem Google sıralamasında hem AI görünürlüğünde.

## Backlink Türleri

- **Dofollow:** Otorite (PageRank) aktarır, sıralamayı doğrudan etkiler. En değerli tür.
- **Nofollow:** Otorite aktarmaz ama trafik ve bilinirlik getirir. Doğal profilin parçasıdır.
- **Editoryal link:** İçeriğiniz değerli olduğu için kendiliğinden verilen link — en güçlüsü.
- **Misafir yazısı linki:** İlgili bir sitede yayınladığınız yazı içinden gelen bağlamsal link.
- **Dizin/profil linkleri:** Düşük değerli; yalnızca temel kurumsal varlık için.

## Kaliteli Backlink'in 4 Kriteri

1. **Alaka:** Link veren site sizin konunuzla ilgili mi? DR 80 ama alakasız bir siteden gelen link otorite değil şüphe taşır.
2. **Otorite (DR):** Domain Rating, sitenin link profil gücünü 0-100 arası tahmin eder. Yüksek DR + alaka = en değerli kombinasyon.
3. **Gerçek trafik:** Sadece skoru değil, sitenin gerçek organik ziyaretçisi olup olmadığını kontrol edin.
4. **Doğal anchor:** Link metni doğal olmalı — hep aynı anahtar kelimeyle gelen linkler manipülasyon izi bırakır.

## 2026'da İşe Yarayan Link Kazanma Yöntemleri

### 1. Orijinal veriyle dijital PR
Kimsede olmayan bir anket, kıyaslama veya sektör istatistiği yayınlayın. Gazeteciler veriyi alıntılamadan duramaz — güçlü tek bir veri çalışması yıllarca onlarca otoriter link getirir.

### 2. Ücretsiz araçlar
Gerçekten işe yarayan ücretsiz bir araç (denetim aracı, hesaplayıcı) kalıcı bir link mıknatısıdır.

### 3. İlgili sitelerde misafir yazıları
Okuyucu için yazıldığında hâlâ etkili: gerçek sektör yayınları, dolu dolu yazılar, bir bağlamsal link. Adayları konu alakası ve DR'a göre önceliklendirin.

### 4. Linksiz marka bahisleri
Markanız zaten link verilmeden anılıyor. Bu bahisleri bulun, kibarca link isteyin — tüm taktikler içinde en yüksek dönüşüm oranı budur.

### 5. Kırık link inşası
Nişinizdeki ölü kaynakları bulun, daha iyisini üretin, hâlâ ölü sayfaya link verenlere haber verin.

### 6. Rakip açık analizi
İki rakibinize link verip size vermeyen her domain sıcak bir adaydır.

## Kaçınmanız Gereken 3 Taktik

1. **Çiftlik/PBN'den toplu link** — kalıpla tespit edilir, değersizleştirilir veya cezalandırılır.
2. **Birebir anchor doldurma** — klasik manipülasyon izi; anchor'ları doğal ve çeşitli tutun.
3. **Alakasız yüksek DR linkleri** — otorite değil şüphe aktarır.

## Basit Aylık Rutin

50 ilgili site bulun, DR ve alakaya göre sıralayın, kişiselleştirilmiş e-posta gönderin, iki kez takip edin ve kazandığınız her linkin yayında, dofollow ve doğru anchor'lı olduğunu doğrulayın. Referans domainlerinizi sıralamalarınızla yan yana takip edin — kendi verinizde göreceğiniz korelasyon, devam etmek için en iyi motivasyondur.`,
  },

  'schema-markup-nedir': {
    title: 'Schema Markup Nedir? Zengin Sonuçlar İçin Yapılandırılmış Veri Rehberi',
    excerpt:
      'Schema markup, sayfanızın içeriğini arama motorlarına ve yapay zekaya makine diliyle anlatan yapılandırılmış veri kodudur. Zengin sonuçlar, daha yüksek tıklama oranı ve AI görünürlüğü için nasıl kullanacağınızı anlatıyoruz.',
    metaTitle: 'Schema Markup Nedir? Yapılandırılmış Veri Rehberi | FunBreak SEO',
    metaDescription:
      'Schema markup (JSON-LD) nedir, hangi türleri var, nasıl eklenir? Zengin sonuçlar ve AI görünürlüğü için 2026 yapılandırılmış veri rehberi.',
    readingMinutes: 7,
    faqSection: [
      {
        question: 'Schema markup sıralamayı doğrudan etkiler mi?',
        answer:
          'Doğrudan bir sıralama faktörü değildir; ancak zengin sonuçlar (yıldız, SSS, fiyat) tıklama oranını belirgin artırır ve yapay zeka sistemlerinin içeriğinizi doğru anlayıp alıntılamasını kolaylaştırır — dolaylı etkisi büyüktür.',
      },
      {
        question: 'Hangi schema formatını kullanmalıyım?',
        answer:
          "Google'ın önerdiği format JSON-LD'dir: sayfa koduna bir script bloğu olarak eklenir, HTML'i kirletmez ve yönetimi en kolay olandır. Microdata ve RDFa eski alternatiflerdir.",
      },
      {
        question: 'Schema eklediğim halde zengin sonuç çıkmıyor, neden?',
        answer:
          "Zengin sonuç garantisi yoktur — Google uygunluğu kendi değerlendirir. Yine de: Rich Results Test'ten hatasız geçtiğinden, içeriğin görünür sayfayla birebir örtüştüğünden ve sayfanın indekslendiğinden emin olun. Yanıltıcı schema (sayfada olmayan içerik) manuel işlem cezasına yol açabilir.",
      },
    ],
    bodyMarkdown: `**Schema markup (yapılandırılmış veri), sayfanızın içeriğini arama motorlarının ve yapay zeka modellerinin net biçimde anlayacağı ortak bir sözlükle (Schema.org) etiketleyen koddur. "Bu bir makale, yazarı şu, yayın tarihi bu; bu bir ürün, fiyatı şu" gibi bilgileri makine diliyle beyan edersiniz.** Karşılığında Google zengin sonuçlar gösterebilir, yapay zeka ise içeriğinizi doğru anlayıp kaynak olarak alıntılayabilir.

## Schema Neden Önemli?

- **Zengin sonuçlar:** Yıldızlı puanlar, SSS açılırları, fiyat bilgisi, ekmek kırıntısı — arama sonucunuzu büyütür ve tıklama oranını (CTR) belirgin artırır.
- **AI görünürlüğü (GEO):** ChatGPT, Gemini ve Google AI Overviews, yapılandırılmış veriyi içeriği güvenle çıkarmak için kullanır. Schema'sı düzgün bir sayfa, alıntılanmaya çok daha yakındır.
- **Varlık (entity) netliği:** Organization schema'sı markanızın kim olduğunu, ne yaptığını arama motorunun bilgi grafiğine kaydettirir.

## En Çok Kullanılan Schema Türleri

- **Organization + WebSite:** Ana sayfada — marka adı, logo, iletişim, sosyal profiller.
- **Article / BlogPosting:** Her blog yazısında — başlık, yazar, tarih, görsel.
- **FAQPage:** Soru-cevap bölümlerinde — sonuçlarda açılır SSS kutuları kazandırır.
- **Product + Offer:** Ürün/fiyat sayfalarında — fiyat, stok, puan bilgisi.
- **BreadcrumbList:** Gezinme yolunu sonuçlarda gösterir.
- **HowTo:** Adım adım rehberlerde.
- **LocalBusiness:** Fiziksel işletmelerde — adres, çalışma saatleri, telefon.
- **Review / AggregateRating:** Müşteri değerlendirmelerinde yıldız gösterimi.

## JSON-LD ile Nasıl Eklenir?

Google'ın önerdiği format JSON-LD'dir: sayfanın head veya body bölümüne eklenen bir script bloğu. Görünen HTML'e dokunmaz, tema değişse bile bozulmaz ve tek yerden yönetilir. Modern CMS ve framework'lerin çoğu (WordPress eklentileri, Next.js) JSON-LD üretimini destekler; FunBreak SEO içerik motoru da ürettiği her yazıya uygun Article + FAQ schema'sını otomatik ekler.

## Doğrulama ve Sık Hatalar

1. **Her şablon değişikliğinden sonra test edin:** Google Rich Results Test ve Schema.org validator'ı kullanın.
2. **Görünür içerikle birebir eşleşsin:** Sayfada olmayan bilgiyi schema'ya yazmak (sahte yıldız, sahte SSS) manuel işlem cezası riskidir.
3. **Zorunlu alanları doldurun:** Eksik alanlar (ör. Article'da image, datePublished) zengin sonuç şansını düşürür.
4. **Tek sayfada çakışan türlerden kaçının:** Aynı içeriği hem Article hem NewsArticle olarak işaretlemeyin.

## Schema ve GEO İlişkisi

Yapay zeka asistanları cevap üretirken içeriği "cümle cümle" değil "beyan beyan" tüketir. FAQPage schema'sındaki her soru-cevap çifti, modelin doğrudan alıntılayabileceği hazır bir bilgi paketidir. Bu yüzden GEO stratejisinin en ucuz ve en hızlı adımı, önemli sayfalarınıza eksiksiz schema eklemektir. Sitenizin schema durumunu görmek için ücretsiz analiz aracımızla 30 saniyede kontrol yapabilirsiniz.`,
  },

  'sayfa-hizi-optimizasyonu': {
    title: 'Sayfa Hızı Optimizasyonu: Core Web Vitals Rehberi (2026)',
    excerpt:
      'Sayfa hızı hem sıralama sinyali hem dönüşüm faktörüdür. LCP, INP ve CLS metriklerini, mobil performans bütçesini ve en etkili hızlandırma tekniklerini bu rehberde bulacaksınız.',
    metaTitle: 'Sayfa Hızı Optimizasyonu: Core Web Vitals Rehberi | FunBreak SEO',
    metaDescription:
      'LCP, INP, CLS nedir ve nasıl iyileştirilir? Görsel optimizasyonu, kod bölme, önbellekleme — 2026 sayfa hızı ve Core Web Vitals rehberi.',
    readingMinutes: 8,
    faqSection: [
      {
        question: 'Core Web Vitals için hedef değerler nedir?',
        answer:
          'LCP (en büyük içerik boyaması) 2,5 saniyenin, INP (etkileşim gecikmesi) 200 milisaniyenin, CLS (görsel kayma) 0,1\'in altında olmalı — ve bu değerler mobilde, gerçek kullanıcı verisinde (CrUX) tutturulmalı.',
      },
      {
        question: 'Sayfa hızı sıralamayı gerçekten etkiliyor mu?',
        answer:
          'Evet — Core Web Vitals doğrulanmış bir sıralama sinyalidir. Dolaylı etkisi daha da büyük: yavaş sayfa hemen çıkma oranını artırır, dönüşümü düşürür. Yapılan ölçümlerde yükleme süresindeki her 1 saniyelik artış dönüşümü belirgin azaltır.',
      },
      {
        question: 'Mobilde sitem neden masaüstünden çok daha yavaş?',
        answer:
          'Mobil cihazların işlemcisi zayıf, ağı değişkendir. En sık suçlular: büyük görseller, ağır JavaScript, sabit arka plan katmanları (background-attachment: fixed), büyük blur/gölge efektleri ve sonsuz animasyonlar. Orta segment gerçek bir telefonda test etmeden "hızlı" demeyin.',
      },
    ],
    bodyMarkdown: `**Sayfa hızı optimizasyonu, sitenizin yüklenme ve etkileşim performansını Google'ın Core Web Vitals metriklerine (LCP, INP, CLS) göre iyileştirme işidir. Hız hem doğrulanmış bir sıralama sinyalidir hem de dönüşümün en sessiz belirleyicisidir: yavaş site, ziyaretçiyi daha ilk saniyelerde kaybeder.**

## Core Web Vitals: Üç Kritik Metrik

- **LCP (Largest Contentful Paint) — hedef < 2,5 sn:** Sayfanın en büyük görsel öğesinin (genelde kapak görseli veya başlık bloğu) görünme süresi.
- **INP (Interaction to Next Paint) — hedef < 200 ms:** Kullanıcı etkileşimine (tık, dokunuş) sayfanın tepki süresi. Uzun JavaScript görevleri en büyük düşman.
- **CLS (Cumulative Layout Shift) — hedef < 0,1:** İçeriğin yüklenirken zıplaması. Boyutu belirtilmemiş görseller ve sonradan yüklenen reklamlar başlıca sebep.

Bu değerler laboratuvar testinde değil, gerçek kullanıcı verisinde (Chrome UX Report) tutturulmalıdır.

## En Etkili Hızlandırma Teknikleri

### 1. Görsel disiplini
- Modern formatlar: **AVIF/WebP** (JPEG'e göre %30-60 küçük).
- Responsive boyutlar: telefonda 4000px'lik görsel yüklemeyin.
- Ekran dışı görsellere **lazy loading**; LCP görseline ise tam tersi — **preload**.

### 2. JavaScript'i zayıflatın
- Kod bölme (code splitting): her sayfa yalnızca ihtiyacı olan JS'i alsın.
- Kritik olmayan script'leri erteleyin (defer/async).
- Kullanılmayan kütüphaneleri atın — her 100 KB JS, mobil işlemcide yüzlerce milisaniye demek.

### 3. Önbellek ve CDN
- Statik varlıklara 1 yıllık cache + içerik değişince dosya adı değişimi (hash).
- HTML için akıllı cache kuralları (SSG/ISR).
- Kullanıcıya en yakın sunucudan servis için CDN.

### 4. Mobil performans bütçesi
Masaüstü geliştirici makinesinde her site hızlıdır. Gerçek testi orta segment bir telefonda yapın. Mobilde en sık görülen görünmez katiller:

- **background-attachment: fixed** — her kaydırma karesinde tüm arka planı yeniden boyatır.
- **Büyük blur/glow efektleri** (100px+ blur'lu dev dekoratif katmanlar) — GPU'yu boğar.
- **Sonsuz animasyonlar** — sürekli compositing, FPS ve pil düşmanı.
- **backdrop-filter** yoğun kullanımı — cam efekti güzeldir ama mobilde pahalıdır.

Bunları mobilde kapatmak (media query ile) çoğu sitede tek başına "donuyor" şikayetini bitirir.

### 5. Sunucu tarafı
- HTTP/2 veya HTTP/3, sıkıştırma (brotli), erken ipuçları.
- Yavaş API çağrılarını sayfa render'ından ayırın; iskelet (skeleton) gösterin.

## Ölçüm Araçları

PageSpeed Insights (gerçek kullanıcı + laboratuvar verisi birlikte), Lighthouse (geliştirme sırasında), Search Console Core Web Vitals raporu (site geneli sağlık). FunBreak SEO teknik taraması da her taramada sayfa bazlı yüklenme sürelerini raporlar ve yavaş sayfaları sorun listesine ekler.

## Öncelik Sırası

Önce LCP görselini optimize edin (en hızlı kazanım), sonra JavaScript'i küçültün (INP), sonra yerleşim kaymalarını sabitleyin (CLS). Her düzeltmeden sonra gerçek cihazda ölçün — hız optimizasyonu tahminle değil ölçümle yapılır.`,
  },

  'e-ticaret-seo-rehberi': {
    title: 'E-Ticaret SEO Rehberi 2026: Online Mağazanızı Zirveye Taşıyın',
    excerpt:
      'E-ticaret SEO\'su; kategori mimarisi, ürün sayfası optimizasyonu, teknik altyapı ve içerik stratejisinin birleşimidir. Satış getiren organik trafik için eksiksiz 2026 rehberi.',
    metaTitle: 'E-Ticaret SEO Rehberi 2026: Satış Getiren Stratejiler | FunBreak SEO',
    metaDescription:
      'E-ticaret SEO rehberi: kategori yapısı, ürün sayfası optimizasyonu, Product schema, faceted navigation ve içerik stratejisi — 2026 için eksiksiz yol haritası.',
    readingMinutes: 9,
    faqSection: [
      {
        question: 'E-ticaret sitemde önce hangi sayfaları optimize etmeliyim?',
        answer:
          'Önce kategori sayfaları: ticari niyetli aramaların ("erkek koşu ayakkabısı") çoğunu kategori sayfaları kazanır. Sonra en çok ciro getiren ürünler, en son bilgilendirici blog içerikleri.',
      },
      {
        question: 'Stokta olmayan ürün sayfalarını silmeli miyim?',
        answer:
          'Geçici stoksuzlukta sayfayı koruyun (benzer ürün önerin), kalıcı olarak kalktıysa en yakın kategori veya ürüne 301 yönlendirme yapın. Toplu 404, biriktirdiğiniz otoriteyi çöpe atar.',
      },
      {
        question: 'Üretici açıklamasını kopyalamak neden sorun?',
        answer:
          'Aynı açıklama yüzlerce sitede varsa Google\'a hangi sayfanın gösterileceğine dair sinyal veremezsiniz — genelde en otoriter site kazanır, siz kaybedersiniz. Özgün açıklama + gerçek kullanım bilgisi + SSS bloğu fark yaratır.',
      },
    ],
    bodyMarkdown: `**E-ticaret SEO'su, online mağazanızın kategori ve ürün sayfalarını arama motorlarında üst sıralara taşıyarak reklamsız, sürdürülebilir satış trafiği kazanma disiplinidir.** Kurumsal siteden farkı ölçektir: binlerce sayfa, sürekli değişen stok ve ağır teknik tuzaklar. Doğru mimariyle bu ölçek avantaja döner.

## 1. Site Mimarisi: Kategori > Ürün Hiyerarşisi

- **Üç tık kuralı:** Her ürün, ana sayfadan en fazla üç tıkla ulaşılabilir olmalı.
- **Kategori sayfaları ticari kelimelerin sahibidir:** "kadın spor ayakkabı" gibi yüksek hacimli aramaları ürün değil kategori sayfaları kazanır. Her kategoriye özgün açıklama metni (300+ kelime) ekleyin.
- **URL yapısı:** kısa, hiyerarşik, anahtar kelimeli: /kadin/spor-ayakkabi/urun-adi.
- **Breadcrumb + BreadcrumbList schema:** hem kullanıcı hem Google için yol haritası.

## 2. Faceted Navigation (Filtre) Tuzağı

Renk, beden, fiyat filtreleri milyonlarca URL kombinasyonu üretebilir — tarama bütçenizi yer ve içerik tekrarı yaratır:

- Değerli kombinasyonları (ör. /spor-ayakkabi/nike) indekslenebilir statik sayfa yapın.
- Değersiz kombinasyonlara canonical + gerekirse robots kuralı uygulayın.
- Parametreli URL'lerin sitemap'e girmediğinden emin olun.

## 3. Ürün Sayfası Optimizasyonu

- **Özgün açıklama:** Üretici metnini kopyalamayın — yüzlerce rakiple aynı içeriğe düşersiniz. Özgün fayda odaklı açıklama + kullanım senaryosu + SSS bloğu yazın.
- **Product + Offer schema:** fiyat, stok durumu, puan — zengin sonuçta fiyat ve yıldız gösterimi CTR'ı ciddi artırır.
- **Görseller:** çok açılı, WebP/AVIF, açıklayıcı alt etiketleri.
- **Müşteri yorumları:** hem taze özgün içerik hem Review schema ile yıldız kaynağı.
- **Stok yönetimi:** geçici stoksuzda sayfayı koruyup benzer ürün önerin; kalıcı kalktıysa 301 ile en yakın kategoriye yönlendirin. Toplu 404 otorite kaybıdır.

## 4. Teknik Kontrol Listesi

1. Mobil hız: ürün görselleri ağırdır — lazy loading + responsive boyutlar şart.
2. Çift içerik: aynı ürünün renk varyantları tek canonical altında toplanmalı.
3. Sayfalama: kategori sayfalandırmasında her sayfa kendine canonical vermeli.
4. XML sitemap: yalnızca stokta ve indekslenebilir ürünler; otomatik güncellenmeli.
5. Site içi arama sonuç sayfaları: noindex.

## 5. İçerik Stratejisi: Satın Alma Hunisinin Üstü

Ticari sayfalar hunininin altını kazanır; blog içerikleri üstünü besler: "koşu ayakkabısı nasıl seçilir" rehberi, ilgili kategoriye iç link vererek hem otorite hem hazır alıcı taşır. Her rehber, ilgili kategori ve ürünlere bağlamsal link vermeli (pillar-cluster modeli).

## 6. E-Ticarette GEO

Yapay zeka asistanlarına "en iyi X hangisi?" diye soran alıcılar artıyor. Ürün ve kategori sayfalarına SSS blokları, karşılaştırma tabloları ve net spesifikasyon listeleri ekleyin — AI modelleri bu formatları alıntılamayı sever. Markanızın AI cevaplarındaki görünürlüğünü düzenli ölçün.

## Ölçüm

Organik ciroyu (sadece trafiği değil) takip edin: Search Console + GA4 e-ticaret raporları. Kategori bazlı sıralama takibi kurun; her ay en çok gelir kaçıran (yüksek gösterim, düşük tıklama) sayfaları optimize edin.`,
  },
};
