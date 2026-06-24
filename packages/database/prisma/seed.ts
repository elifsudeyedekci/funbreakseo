import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// bcrypt hash of "Admin123!" — pre-computed (cost 10)
const ADMIN_PASSWORD_HASH = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

async function main() {
  console.log('Seeding database...');

  // ── 1. SUPER ADMIN ──────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@funbreakseo.com' },
    update: {},
    create: {
      email: 'admin@funbreakseo.com',
      passwordHash: ADMIN_PASSWORD_HASH,
      fullName: 'FunBreak Admin',
      role: 'SUPER_ADMIN',
      emailVerified: true,
      status: 'ACTIVE',
    },
  });
  console.log('Admin user created:', admin.email);

  // ── 2. PLANS ────────────────────────────────────────────────
  const plans = [
    {
      name: 'Başlangıç',
      slug: 'starter',
      monthlyPrice: 499,
      yearlyPrice: 4990,
      sortOrder: 1,
      limits: {
        projects: 1,
        keywords: 50,
        monthlyCrawls: 5,
        aiBlogsPerProject: 5,
        geoQueries: 25,
        outreachCampaigns: 0,
        teamSeats: 1,
        technicalFixSites: 1,
        whitelabelReports: false,
        customerApi: false,
        prioritySupport: false,
        trackingDepth: 'FIRST_PAGE',
      },
    },
    {
      name: 'Büyüme',
      slug: 'growth',
      monthlyPrice: 999,
      yearlyPrice: 9990,
      sortOrder: 2,
      limits: {
        projects: 5,
        keywords: 250,
        monthlyCrawls: 25,
        aiBlogsPerProject: 25,
        geoQueries: 150,
        outreachCampaigns: 2,
        teamSeats: 3,
        technicalFixSites: 5,
        whitelabelReports: true,
        customerApi: false,
        prioritySupport: false,
        trackingDepth: 'TOP_100',
      },
    },
    {
      name: 'Pro',
      slug: 'pro',
      monthlyPrice: 2499,
      yearlyPrice: 24990,
      sortOrder: 3,
      limits: {
        projects: 15,
        keywords: 1000,
        monthlyCrawls: 100,
        aiBlogsPerProject: 100,
        geoQueries: 750,
        outreachCampaigns: 10,
        teamSeats: 10,
        technicalFixSites: 15,
        whitelabelReports: true,
        customerApi: true,
        prioritySupport: true,
        trackingDepth: 'TOP_100',
      },
    },
    {
      name: 'Kurumsal',
      slug: 'enterprise',
      monthlyPrice: 0,
      yearlyPrice: 0,
      sortOrder: 4,
      limits: {
        projects: 999999,
        keywords: 999999,
        monthlyCrawls: 999999,
        aiBlogsPerProject: 999999,
        geoQueries: 999999,
        outreachCampaigns: 999999,
        teamSeats: 999999,
        technicalFixSites: 999999,
        whitelabelReports: true,
        customerApi: true,
        prioritySupport: true,
        trackingDepth: 'TOP_100',
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: { monthlyPrice: plan.monthlyPrice, yearlyPrice: plan.yearlyPrice, limits: plan.limits },
      create: { ...plan, currency: 'TRY', isActive: true },
    });
  }
  console.log('Plans created.');

  // ── 3. SEO RULE DEFINITIONS (50 rules) ─────────────────────
  const seoRules = [
    // TITLE (10)
    { code: 'TITLE_MISSING', category: 'TITLE', severity: 'CRITICAL', weight: 10, titleTr: 'Sayfa Başlığı Eksik', descriptionTr: 'Sayfada <title> etiketi bulunamadı. Bu durum SEO açısından kritik bir sorundur.', recommendationTr: 'Her sayfaya benzersiz, 50-60 karakter uzunluğunda bir <title> etiketi ekleyin.', autoFixable: false },
    { code: 'TITLE_TOO_SHORT', category: 'TITLE', severity: 'WARNING', weight: 6, titleTr: 'Başlık Çok Kısa', descriptionTr: '30 karakterden kısa başlıklar yeterli anahtar kelime bilgisi içermez ve SEO değeri taşımaz.', recommendationTr: 'Başlığı 50-60 karakter aralığına genişletin; focus keyword ve marka adını dahil edin.', autoFixable: false },
    { code: 'TITLE_TOO_LONG', category: 'TITLE', severity: 'WARNING', weight: 5, titleTr: 'Başlık Çok Uzun', descriptionTr: '60 karakterden uzun başlıklar Google SERP\'te kırpılır ve tıklama oranını düşürür.', recommendationTr: 'Başlığı 60 karakterin altında tutun. Gereksiz kelimeler çıkarın, önemli bilgileri öne alın.', autoFixable: false },
    { code: 'TITLE_KEYWORD_MISSING', category: 'TITLE', severity: 'WARNING', weight: 7, titleTr: 'Focus Keyword Başlıkta Yok', descriptionTr: 'Hedef anahtar kelime sayfa başlığında bulunmuyor. Bu, sayfanın ilgili aramalarda görünme şansını azaltır.', recommendationTr: 'Focus keyword\'ü başlığın mümkün olan en başına yerleştirin.', autoFixable: false },
    { code: 'DUPLICATE_TITLE', category: 'TITLE', severity: 'CRITICAL', weight: 9, titleTr: 'Yinelenen Başlık', descriptionTr: 'Aynı başlık birden fazla sayfada kullanılmış. Google hangi sayfayı sıralayacağını belirleyemez.', recommendationTr: 'Her sayfaya sayfanın içeriğini yansıtan benzersiz bir başlık yazın.', autoFixable: false },
    { code: 'TITLE_STARTS_WITH_NUMBER', category: 'TITLE', severity: 'NOTICE', weight: 2, titleTr: 'Başlık Rakamla Başlıyor', descriptionTr: 'Rakamla başlayan başlıklar bazı SERP görünümlerinde garip görünebilir.', recommendationTr: 'Başlığı anlamlı bir kelimeyle başlatmayı değerlendirin.', autoFixable: false },
    { code: 'TITLE_ALL_CAPS', category: 'TITLE', severity: 'NOTICE', weight: 2, titleTr: 'Başlık Tamamen Büyük Harf', descriptionTr: 'Tamamen büyük harfle yazılmış başlıklar okunabilirliği düşürür ve spam izlenimi verebilir.', recommendationTr: 'Normal cümle büyüklüğü kullanın; sadece ilk harf ve özel isimler büyük olsun.', autoFixable: false },
    { code: 'TITLE_SPECIAL_CHARS', category: 'TITLE', severity: 'NOTICE', weight: 2, titleTr: 'Başlıkta Özel Karakter', descriptionTr: 'Başlıkta aşırı özel karakter kullanımı (!, ?, | gibi) SERP görünümünü bozabilir.', recommendationTr: 'Özel karakterlerin kullanımını sınırlayın; gerçekten anlam katan karakterleri tercih edin.', autoFixable: false },
    { code: 'TITLE_SITE_NAME_MISSING', category: 'TITLE', severity: 'NOTICE', weight: 2, titleTr: 'Başlıkta Site Adı Eksik', descriptionTr: 'Başlıkta marka/site adı bulunmuyor. Marka bilinirliği için marka adını başlığa eklemek önerilir.', recommendationTr: 'Başlığın sonuna " | Marka Adı" formatında site adını ekleyin.', autoFixable: false },
    { code: 'TITLE_CLICK_WORTHY', category: 'TITLE', severity: 'NOTICE', weight: 3, titleTr: 'Başlık Tıklanabilirlik Açısından Zayıf', descriptionTr: 'Başlık yeterli duygusal tetikleyici veya güç kelimesi içermiyor; organik CTR düşük kalabilir.', recommendationTr: 'Rakam, soru, güç kelimesi veya yıl gibi unsurlar ekleyerek başlığı daha çekici hale getirin.', autoFixable: false },
    // META (8)
    { code: 'META_DESC_MISSING', category: 'META', severity: 'WARNING', weight: 7, titleTr: 'Meta Açıklama Eksik', descriptionTr: 'Sayfada meta description etiketi yok. Google kendi açıklamasını üretecek, bu da CTR\'yi olumsuz etkiler.', recommendationTr: '120-155 karakter arasında, focus keyword ve CTA içeren bir meta açıklama yazın.', autoFixable: false },
    { code: 'META_DESC_TOO_SHORT', category: 'META', severity: 'WARNING', weight: 4, titleTr: 'Meta Açıklama Çok Kısa', descriptionTr: '80 karakterden kısa meta açıklamalar sayfanın değerini yeterince aktaramaz.', recommendationTr: 'Meta açıklamayı 120-155 karakter arasına genişletin; hizmet/ürün faydalarını vurgulayın.', autoFixable: false },
    { code: 'META_DESC_TOO_LONG', category: 'META', severity: 'WARNING', weight: 4, titleTr: 'Meta Açıklama Çok Uzun', descriptionTr: '155 karakterden uzun meta açıklamalar SERP\'te kırpılır ve anahtar kelimeler görünmeyebilir.', recommendationTr: 'Meta açıklamayı 155 karakterin altında tutun; en önemli bilgileri öne alın.', autoFixable: false },
    { code: 'META_KEYWORD_MISSING', category: 'META', severity: 'WARNING', weight: 5, titleTr: 'Focus Keyword Meta\'da Yok', descriptionTr: 'Hedef anahtar kelime meta açıklamada geçmiyor. Bu, arama sonuçlarında bold gösterimi kaçırtır.', recommendationTr: 'Focus keyword\'ü meta açıklamanın ilk 100 karakterine doğal biçimde dahil edin.', autoFixable: false },
    { code: 'DUPLICATE_META', category: 'META', severity: 'WARNING', weight: 5, titleTr: 'Yinelenen Meta Açıklama', descriptionTr: 'Aynı meta açıklama birden fazla sayfada kullanılmış.', recommendationTr: 'Her sayfa için o sayfanın içeriğini yansıtan benzersiz bir meta açıklama yazın.', autoFixable: false },
    { code: 'META_DESC_CTA_MISSING', category: 'META', severity: 'NOTICE', weight: 3, titleTr: 'Meta\'da Eylem Çağrısı Yok', descriptionTr: 'Meta açıklamada "hemen deneyin", "ücretsiz başlayın" gibi eylem çağrısı bulunamadı.', recommendationTr: 'Meta açıklamaya güçlü bir eylem çağrısı ekleyin; bu tıklama oranını artırabilir.', autoFixable: false },
    { code: 'META_ROBOTS_NOINDEX', category: 'META', severity: 'CRITICAL', weight: 10, titleTr: 'Robots Noindex Direktifi Var', descriptionTr: 'Sayfada meta robots noindex direktifi bulunuyor. Bu sayfa Google tarafından indekslenmeyecek.', recommendationTr: 'Sayfanın indekslenmesini istiyorsanız noindex direktifini kaldırın veya index olarak değiştirin.', autoFixable: false },
    { code: 'META_VIEWPORT_MISSING', category: 'META', severity: 'CRITICAL', weight: 9, titleTr: 'Viewport Meta Etiketi Eksik', descriptionTr: 'Sayfada viewport meta etiketi yok. Mobil cihazlarda sayfa düzgün görüntülenemez; Google mobil-önce indekslemede dezavantaj yaratır.', recommendationTr: '<meta name="viewport" content="width=device-width, initial-scale=1"> etiketini <head> içine ekleyin.', autoFixable: true },
    // HEADING (8)
    { code: 'H1_MISSING', category: 'HEADING', severity: 'CRITICAL', weight: 9, titleTr: 'H1 Başlık Eksik', descriptionTr: 'Sayfada H1 etiketi bulunamadı. H1, arama motorlarına sayfanın ana konusunu anlatan en önemli etiketlerden biridir.', recommendationTr: 'Her sayfaya tam olarak bir H1 ekleyin; focus keyword\'ü H1\'e dahil edin.', autoFixable: false },
    { code: 'MULTIPLE_H1', category: 'HEADING', severity: 'WARNING', weight: 6, titleTr: 'Birden Fazla H1', descriptionTr: 'Sayfada birden fazla H1 etiketi var. Bu, arama motorlarının sayfanın ana konusunu anlamasını zorlaştırır.', recommendationTr: 'Sayfada yalnızca bir H1 kullanın; diğerlerini H2 veya H3 olarak değiştirin.', autoFixable: false },
    { code: 'H1_TOO_LONG', category: 'HEADING', severity: 'NOTICE', weight: 3, titleTr: 'H1 Çok Uzun', descriptionTr: '70 karakterden uzun H1 başlıkları okunabilirliği düşürür ve odak dağıtır.', recommendationTr: 'H1\'i 60-70 karakter aralığında tutun; ana mesajı net ve öz ifade edin.', autoFixable: false },
    { code: 'H1_KEYWORD_MISSING', category: 'HEADING', severity: 'WARNING', weight: 7, titleTr: 'H1\'de Focus Keyword Yok', descriptionTr: 'H1 etiketi focus keyword içermiyor. Bu, sayfanın ilgili aramalarda sıralanma şansını azaltır.', recommendationTr: 'Focus keyword\'ü H1\'in olabildiğince başına yerleştirin.', autoFixable: false },
    { code: 'HEADING_SKIP', category: 'HEADING', severity: 'WARNING', weight: 5, titleTr: 'Başlık Hiyerarşisi Atlama', descriptionTr: 'H1\'den doğrudan H3\'e geçilmiş (H2 atlanmış). Bu, sayfa yapısının anlambilimsel bütünlüğünü bozar.', recommendationTr: 'Başlık hiyerarşisini sırayla kullanın: H1 → H2 → H3. Hiçbir seviyeyi atlamayın.', autoFixable: false },
    { code: 'NO_H2', category: 'HEADING', severity: 'WARNING', weight: 5, titleTr: 'H2 Başlık Yok', descriptionTr: 'Sayfada hiç H2 başlık bulunmuyor. H2\'ler içeriği bölümlere ayırır ve tarama kolaylığı sağlar.', recommendationTr: 'İçeriğinizi mantıklı bölümlere ayırın ve her ana bölüm için bir H2 ekleyin.', autoFixable: false },
    { code: 'HEADINGS_TOO_FEW', category: 'HEADING', severity: 'NOTICE', weight: 3, titleTr: 'Yetersiz Başlık Sayısı', descriptionTr: '500 kelime üzeri içerikte 2\'den az başlık var. Yapılandırılmamış içerik okunabilirliği ve SEO\'yu zayıflatır.', recommendationTr: 'Her 200-300 kelimede bir H2 veya H3 ekleyin; içeriği mantıksal bölümlere ayırın.', autoFixable: false },
    { code: 'HEADINGS_KEYWORD_OVERUSE', category: 'HEADING', severity: 'WARNING', weight: 5, titleTr: 'Başlıklarda Anahtar Kelime Aşımı', descriptionTr: 'Anahtar kelime tüm başlıklarda tekrar edecek şekilde aşırı kullanılmış; bu keyword stuffing sinyali verebilir.', recommendationTr: 'Focus keyword\'ü yalnızca H1\'de kullanın; H2/H3\'lerde eş anlamlı veya LSI kelimeler tercih edin.', autoFixable: false },
    // CONTENT (8)
    { code: 'THIN_CONTENT', category: 'CONTENT', severity: 'WARNING', weight: 7, titleTr: 'İnce İçerik', descriptionTr: 'Sayfa 300 kelimeden az içerik barındırıyor. Google ince içerikleri düşük kaliteli olarak değerlendirir.', recommendationTr: 'En az 600-800 kelimelik, kullanıcı sorusunu tam yanıtlayan içerik oluşturun.', autoFixable: false },
    { code: 'LOW_WORD_COUNT', category: 'CONTENT', severity: 'NOTICE', weight: 4, titleTr: 'Düşük Kelime Sayısı', descriptionTr: 'Sayfa 500 kelimeden az içeriyor. Rekabetçi konularda daha kapsamlı içerik gereklidir.', recommendationTr: 'Rakip sayfaların ortalama kelime sayısını analiz edin ve içeriğinizi buna göre genişletin.', autoFixable: false },
    { code: 'KEYWORD_DENSITY_LOW', category: 'CONTENT', severity: 'NOTICE', weight: 3, titleTr: 'Düşük Anahtar Kelime Yoğunluğu', descriptionTr: 'Focus keyword yoğunluğu %0.5\'in altında. Sayfa bu kelime için yeterince optimize edilmemiş olabilir.', recommendationTr: 'Focus keyword\'ü içerikte doğal biçimde %0.5-2 yoğunlukta kullanın.', autoFixable: false },
    { code: 'KEYWORD_DENSITY_HIGH', category: 'CONTENT', severity: 'WARNING', weight: 6, titleTr: 'Yüksek Anahtar Kelime Yoğunluğu', descriptionTr: 'Focus keyword yoğunluğu %3\'ü aşıyor; bu anahtar kelime doldurmacası (keyword stuffing) olarak değerlendirilebilir.', recommendationTr: 'Keyword yoğunluğunu %1-2 aralığına düşürün; eş anlamlılar ve LSI kelimeler kullanın.', autoFixable: false },
    { code: 'NO_INTERNAL_LINKS', category: 'CONTENT', severity: 'WARNING', weight: 6, titleTr: 'İç Link Yok', descriptionTr: 'Sayfa hiç iç bağlantı içermiyor. İç linkler link juice dağıtır ve kullanıcıyı sitede tutar.', recommendationTr: 'İçerikle alakalı en az 3-5 iç link ekleyin; açıklayıcı anchor text kullanın.', autoFixable: false },
    { code: 'NO_EXTERNAL_LINKS', category: 'CONTENT', severity: 'NOTICE', weight: 3, titleTr: 'Dış Link Yok', descriptionTr: 'Sayfa hiç dış kaynak bağlantısı içermiyor. Güvenilir kaynaklara link vermek E-E-A-T sinyali gönderir.', recommendationTr: 'İddialarınızı destekleyen 1-3 yetkili dış kaynağa bağlantı verin.', autoFixable: false },
    { code: 'DUPLICATE_CONTENT', category: 'CONTENT', severity: 'CRITICAL', weight: 10, titleTr: 'Kopya İçerik', descriptionTr: 'Bu sayfanın içeriği başka bir sayfayla büyük ölçüde örtüşüyor. Kopya içerik filtresine girebilir.', recommendationTr: 'İçeriği tamamen yeniden yazın veya kanonik etiketle orijinal sayfayı belirtin.', autoFixable: false },
    { code: 'CONTENT_HAS_NO_IMAGES', category: 'CONTENT', severity: 'NOTICE', weight: 3, titleTr: 'İçerikte Görsel Yok', descriptionTr: 'Sayfa hiç görsel içermiyor. Görseller kullanıcı deneyimini ve içerik kalite sinyallerini güçlendirir.', recommendationTr: 'İçeriğe ilgili, optimize edilmiş alt etiketli görseller ekleyin.', autoFixable: false },
    // TECHNICAL (10)
    { code: 'BROKEN_LINK', category: 'TECHNICAL', severity: 'CRITICAL', weight: 8, titleTr: 'Kırık Bağlantı', descriptionTr: 'Sayfada 404 veya 5xx döndüren bağlantılar var. Kırık linkler kullanıcı deneyimini ve tarama bütçesini olumsuz etkiler.', recommendationTr: 'Kırık bağlantıları güncelleyin veya kaldırın; hedef sayfalar silinmişse yönlendirme yapın.', autoFixable: false },
    { code: 'REDIRECT_CHAIN', category: 'TECHNICAL', severity: 'WARNING', weight: 6, titleTr: 'Yönlendirme Zinciri', descriptionTr: '2 veya daha fazla ardışık yönlendirme tespit edildi. Yönlendirme zincirleri sayfa hızını ve link juice\'u azaltır.', recommendationTr: 'Yönlendirmeleri doğrudan hedef URL\'e kısaltın; ara yönlendirmeleri ortadan kaldırın.', autoFixable: false },
    { code: 'MISSING_CANONICAL', category: 'TECHNICAL', severity: 'WARNING', weight: 6, titleTr: 'Kanonik Etiket Eksik', descriptionTr: 'Sayfada canonical etiketi bulunmuyor. Kopyalanabilir URL\'lerde (filtreler, sıralama vb.) kopya içerik sorunu oluşabilir.', recommendationTr: 'Her sayfaya kendi kanonik URL\'ini gösteren <link rel="canonical"> etiketi ekleyin.', autoFixable: true },
    { code: 'CANONICAL_MISMATCH', category: 'TECHNICAL', severity: 'CRITICAL', weight: 8, titleTr: 'Kanonik URL Uyuşmazlığı', descriptionTr: 'Canonical etiketi farklı bir URL\'e işaret ediyor. Bu, Google\'ın yanlış sayfayı sıralamasına neden olabilir.', recommendationTr: 'Canonical URL\'inin o sayfanın tercih edilen URL\'i ile tam olarak eşleştiğini doğrulayın.', autoFixable: false },
    { code: 'NO_HTTPS', category: 'TECHNICAL', severity: 'CRITICAL', weight: 10, titleTr: 'HTTPS Kullanılmıyor', descriptionTr: 'Site HTTP üzerinde sunuluyor. HTTPS, Google için doğrudan bir sıralama faktörüdür ve güven sinyali verir.', recommendationTr: 'SSL/TLS sertifikası alın ve tüm trafiği HTTPS\'e yönlendirin. HTTP\'yi kalıcı olarak devre dışı bırakın.', autoFixable: false },
    { code: 'MIXED_CONTENT', category: 'TECHNICAL', severity: 'WARNING', weight: 6, titleTr: 'Karma İçerik (Mixed Content)', descriptionTr: 'HTTPS sayfasında HTTP üzerinden yüklenen kaynak (resim, script vb.) var. Tarayıcılar bu kaynakları engelleyebilir.', recommendationTr: 'Tüm kaynakları HTTPS üzerinden sunacak şekilde güncelleyin; protokol-göreceli URL\'ler kullanmaktan kaçının.', autoFixable: false },
    { code: 'SLOW_PAGE', category: 'TECHNICAL', severity: 'WARNING', weight: 7, titleTr: 'Yavaş Sayfa Yükleme', descriptionTr: 'Sayfa yükleme süresi 3000ms\'yi aşıyor. Yavaş sayfalar sıralama kaybına ve yüksek hemen çıkma oranına yol açar.', recommendationTr: 'Görselleri sıkıştırın, render-blocking kaynakları erteleyın, tarayıcı önbelleklemesini ve CDN kullanın.', autoFixable: false },
    { code: 'LARGE_PAGE_SIZE', category: 'TECHNICAL', severity: 'WARNING', weight: 5, titleTr: 'Büyük Sayfa Boyutu', descriptionTr: 'Sayfa toplam boyutu 1MB\'ı aşıyor. Büyük sayfalar özellikle mobil bağlantılarda yavaş yüklenir.', recommendationTr: 'Görselleri WebP\'ye dönüştürün, kullanılmayan JS/CSS\'i kaldırın, lazy loading uygulayın.', autoFixable: false },
    { code: 'TOO_MANY_LINKS', category: 'TECHNICAL', severity: 'WARNING', weight: 5, titleTr: 'Çok Fazla Bağlantı', descriptionTr: 'Sayfada 100\'den fazla link var. Aşırı link sayısı link juice\'u seyreltir ve spam sinyali verebilir.', recommendationTr: 'Gereksiz linkleri kaldırın; sayfa başına en fazla 100 link hedefleyin.', autoFixable: false },
    { code: 'CRAWL_DEPTH_DEEP', category: 'TECHNICAL', severity: 'NOTICE', weight: 3, titleTr: 'Derin Tarama Derinliği', descriptionTr: 'Sayfa, ana sayfadan 3\'ten fazla tıklama uzakta. Derin sayfalar daha az taranır ve sıralama gücü alır.', recommendationTr: 'Site mimarisini düzenleyin; önemli sayfalar ana sayfadan en fazla 3 tıklama uzakta olsun.', autoFixable: false },
    // SCHEMA (6)
    { code: 'NO_SCHEMA', category: 'SCHEMA', severity: 'WARNING', weight: 5, titleTr: 'Schema Markup Yok', descriptionTr: 'Sayfada yapılandırılmış veri (schema markup) bulunmuyor. Schema, zengin sonuçlar ve artırılmış snippet\'ler için gereklidir.', recommendationTr: 'Sayfa tipine uygun schema ekleyin: Article, Product, FAQ, BreadcrumbList vb.', autoFixable: false },
    { code: 'INVALID_SCHEMA', category: 'SCHEMA', severity: 'WARNING', weight: 6, titleTr: 'Geçersiz Schema Markup', descriptionTr: 'Sayfadaki schema markup geçersiz veya hatalı; Google Search Console\'da hata bildirilebilir.', recommendationTr: 'Google\'ın Zengin Sonuç Test Aracı ile schema\'yı doğrulayın ve hataları düzeltin.', autoFixable: false },
    { code: 'SCHEMA_MISSING_REQUIRED', category: 'SCHEMA', severity: 'WARNING', weight: 5, titleTr: 'Schema\'da Zorunlu Alan Eksik', descriptionTr: 'Mevcut schema tipinin zorunlu alanları (name, description vb.) eksik.', recommendationTr: 'Schema.org dokümantasyonunu inceleyerek zorunlu alanları tamamlayın.', autoFixable: false },
    { code: 'FAQ_SCHEMA_MISSING', category: 'SCHEMA', severity: 'NOTICE', weight: 4, titleTr: 'FAQ Schema Yok', descriptionTr: 'Sayfa SSS içeriği barındırıyor ancak FAQPage schema\'sı eklenmemiş; bu SERP\'te accordion görünümü kaçırtır.', recommendationTr: 'SSS içeriğinize FAQPage schema\'sı ekleyin; soru-cevap çiftlerini Question ve Answer tipleriyle işaretleyin.', autoFixable: false },
    { code: 'BREADCRUMB_MISSING', category: 'SCHEMA', severity: 'NOTICE', weight: 3, titleTr: 'Breadcrumb Schema Yok', descriptionTr: 'BreadcrumbList schema\'sı eklenmemiş. Breadcrumb şeması SERP\'te sayfa yolunu göstererek tıklama oranını artırır.', recommendationTr: 'Tüm alt sayfalara BreadcrumbList schema\'sı ekleyin.', autoFixable: false },
    { code: 'PRODUCT_SCHEMA_INCOMPLETE', category: 'SCHEMA', severity: 'NOTICE', weight: 4, titleTr: 'Ürün Schema\'sı Eksik', descriptionTr: 'Ürün sayfasında Product schema\'sı eksik veya fiyat/stok bilgileri girilmemiş.', recommendationTr: 'Product schema\'sına name, description, price, availability, aggregateRating alanlarını ekleyin.', autoFixable: false },
    // SPEED (5)
    { code: 'SLOW_LCP', category: 'SPEED', severity: 'WARNING', weight: 8, titleTr: 'Yüksek LCP (Largest Contentful Paint)', descriptionTr: 'LCP değeri 2.5 saniyeyi aşıyor. LCP, Core Web Vitals\'ın sıralama etkisi olan en önemli metriğidir.', recommendationTr: 'Hero görselini preload edin, sunucu yanıt süresini iyileştirin, CDN kullanın, kritik CSS\'i inline edin.', autoFixable: false },
    { code: 'HIGH_CLS', category: 'SPEED', severity: 'WARNING', weight: 7, titleTr: 'Yüksek CLS (Cumulative Layout Shift)', descriptionTr: 'CLS değeri 0.1\'i aşıyor. Beklenmedik düzen kaymaları kullanıcı deneyimini ciddi biçimde bozar.', recommendationTr: 'Görsellere width/height belirtin, web fontları için font-display: swap kullanın, dinamik içeriğe yer ayırın.', autoFixable: false },
    { code: 'SLOW_FID', category: 'SPEED', severity: 'WARNING', weight: 7, titleTr: 'Yüksek FID/INP', descriptionTr: 'FID veya INP değeri 200ms\'yi aşıyor. Yavaş interaktivite kullanıcı deneyimini ve sıralamayı etkiler.', recommendationTr: 'Uzun süre çalışan JavaScript görevlerini bölün, third-party script\'leri erteleyın, web worker kullanın.', autoFixable: false },
    { code: 'LARGE_IMAGES', category: 'SPEED', severity: 'WARNING', weight: 6, titleTr: 'Optimize Edilmemiş Görseller', descriptionTr: 'Sayfada sıkıştırılmamış veya boyutlandırılmamış görseller tespit edildi; sayfa ağırlığı gereksiz yere artıyor.', recommendationTr: 'Görselleri WebP/AVIF formatına dönüştürün, doğru boyutlarda sunun ve lazy loading uygulayın.', autoFixable: false },
    { code: 'RENDER_BLOCKING_RESOURCES', category: 'SPEED', severity: 'WARNING', weight: 6, titleTr: 'Render Engelleyen Kaynaklar', descriptionTr: 'CSS veya JavaScript dosyaları sayfanın ilk görüntülenmesini engelliyor.', recommendationTr: 'Kritik CSS\'i inline edin; JavaScript dosyalarına async/defer ekleyin; kullanılmayan CSS\'i kaldırın.', autoFixable: false },
    // LINKS (5)
    { code: 'BROKEN_EXTERNAL_LINK', category: 'LINKS', severity: 'NOTICE', weight: 3, titleTr: 'Kırık Dış Bağlantı', descriptionTr: 'Dış sitelere verilen bir veya daha fazla bağlantı 404 veya hata döndürüyor.', recommendationTr: 'Kırık dış linkleri güncelleyin, alternatif kaynaklarla değiştirin veya kaldırın.', autoFixable: false },
    { code: 'NOFOLLOW_INTERNAL', category: 'LINKS', severity: 'WARNING', weight: 5, titleTr: 'İç Linkte Nofollow', descriptionTr: 'Siteye ait iç bağlantılara nofollow atanmış. Bu, kendi sayfalarınıza link juice aktarımını engeller.', recommendationTr: 'İç bağlantılardan nofollow etiketini kaldırın; sadece üçüncü taraf bağlantılarda nofollow kullanın.', autoFixable: false },
    { code: 'ORPHAN_PAGE', category: 'LINKS', severity: 'WARNING', weight: 6, titleTr: 'Yetim Sayfa', descriptionTr: 'Bu sayfaya sitede hiçbir iç bağlantı vermiyor. Yetim sayfalar taranmakta zorlanır ve otorite almaz.', recommendationTr: 'Sitedeki ilgili sayfalardan bu sayfaya en az 3 iç bağlantı ekleyin.', autoFixable: false },
    { code: 'ANCHOR_TEXT_GENERIC', category: 'LINKS', severity: 'NOTICE', weight: 3, titleTr: 'Genel Anchor Text', descriptionTr: '"Buraya tıklayın", "daha fazlası" gibi anlamsız anchor text kullanılmış; bu bağlantının bağlamını zayıflatır.', recommendationTr: 'Anchor text\'i hedef sayfanın konusunu yansıtacak şekilde açıklayıcı yapın.', autoFixable: false },
    { code: 'DEEP_LINKING_MISSING', category: 'LINKS', severity: 'NOTICE', weight: 2, titleTr: 'Derinlemesine Linkleme Eksik', descriptionTr: 'İçerik sayfası yalnızca ana sayfa veya kategori sayfasına link veriyor; alt sayfalara yönlendirme yapılmıyor.', recommendationTr: 'Okuyucuyu daha derin sayfalara yönlendiren bağlamsal iç linkler ekleyin.', autoFixable: false },
    // MOBILE (3)
    { code: 'NOT_MOBILE_FRIENDLY', category: 'MOBILE', severity: 'CRITICAL', weight: 10, titleTr: 'Mobil Uyumlu Değil', descriptionTr: 'Sayfa mobil cihazlarda düzgün görüntülenmiyor. Google mobil-önce indeksleme yaptığından bu kritik bir sorundur.', recommendationTr: 'Responsive tasarım uygulayın; Google\'ın Mobil Uyumluluk Test Aracı ile sayfanızı test edin.', autoFixable: false },
    { code: 'TOUCH_TARGETS_SMALL', category: 'MOBILE', severity: 'WARNING', weight: 5, titleTr: 'Küçük Dokunmatik Hedef', descriptionTr: 'Tıklanabilir alanlar (buton, link) 44x44px\'den küçük. Mobil kullanıcılar yanlışlıkla farklı elementlere dokunabilir.', recommendationTr: 'Tüm dokunmatik hedefleri en az 44x44px yapın; aralarına yeterli boşluk bırakın.', autoFixable: false },
    { code: 'FONT_TOO_SMALL', category: 'MOBILE', severity: 'WARNING', weight: 4, titleTr: 'Mobilde Yazı Boyutu Çok Küçük', descriptionTr: 'Metin boyutu 12px\'den küçük. Küçük metin mobil okumayı zorlaştırır ve kullanıcı deneyimini bozar.', recommendationTr: 'Gövde metni için en az 14-16px, başlıklar için daha büyük boyutlar kullanın.', autoFixable: false },
    // SECURITY (3)
    { code: 'HTTP_ONLY', category: 'SECURITY', severity: 'CRITICAL', weight: 10, titleTr: 'HTTPS Yok (HTTP Only)', descriptionTr: 'Site yalnızca HTTP üzerinden erişilebilir. Kullanıcı verileri şifresiz iletiliyor; modern tarayıcılar "Güvenli Değil" uyarısı gösteriyor.', recommendationTr: 'Let\'s Encrypt veya ticari bir SSL sertifikası alarak tüm bağlantıları HTTPS\'e yönlendirin.', autoFixable: false },
    { code: 'MISSING_SECURITY_HEADERS', category: 'SECURITY', severity: 'WARNING', weight: 5, titleTr: 'Güvenlik HTTP Başlıkları Eksik', descriptionTr: 'Content-Security-Policy, X-Frame-Options, Strict-Transport-Security gibi güvenlik başlıkları ayarlanmamış.', recommendationTr: 'Web sunucusuna HSTS, CSP, X-Content-Type-Options, X-Frame-Options başlıklarını ekleyin.', autoFixable: false },
    { code: 'EXPOSED_ADMIN_PATH', category: 'SECURITY', severity: 'WARNING', weight: 7, titleTr: 'Açık Admin Yolu', descriptionTr: '/admin, /wp-admin veya /dashboard gibi yönetim paneli yolları herkes tarafından erişilebilir durumda.', recommendationTr: 'Admin yollarını IP kısıtlaması veya iki faktörlü kimlik doğrulama ile koruyun; varsayılan yolları değiştirin.', autoFixable: false },
  ];

  for (const rule of seoRules) {
    await prisma.seoRuleDefinition.upsert({
      where: { code: rule.code },
      update: { titleTr: rule.titleTr, descriptionTr: rule.descriptionTr, recommendationTr: rule.recommendationTr, weight: rule.weight },
      create: {
        code: rule.code,
        category: rule.category as any,
        severity: rule.severity as any,
        titleTr: rule.titleTr,
        descriptionTr: rule.descriptionTr,
        recommendationTr: rule.recommendationTr,
        weight: rule.weight,
        autoFixable: rule.autoFixable ?? false,
      },
    });
  }
  console.log(`SEO rules created: ${seoRules.length}`);
