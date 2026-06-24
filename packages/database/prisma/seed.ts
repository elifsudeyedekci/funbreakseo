import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting FunBreak SEO database seed...');

  // ============================================================
  // 1. ADMIN USER
  // ============================================================
  const passwordHash = await bcrypt.hash('Admin123!', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@funbreakseo.com' },
    update: {},
    create: {
      email: 'admin@funbreakseo.com',
      passwordHash,
      fullName: 'FunBreak Admin',
      role: 'SUPER_ADMIN',
      emailVerified: true,
      status: 'ACTIVE',
      locale: 'tr',
    },
  });
  console.log('✅ Admin user created:', adminUser.email);

  // ============================================================
  // 2. PLANS
  // ============================================================
  const plans = [
    {
      name: 'Ücretsiz',
      slug: 'free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      sortOrder: 0,
      limits: {
        projects: 1,
        keywords: 10,
        crawlsPerMonth: 1,
        aiBlogsPerMonth: 0,
        geoQueriesPerMonth: 5,
        outreachProspectsPerMonth: 0,
        teamMembers: 1,
      },
    },
    {
      name: 'Başlangıç',
      slug: 'starter',
      monthlyPrice: 299,
      yearlyPrice: 2868,
      sortOrder: 1,
      limits: {
        projects: 3,
        keywords: 100,
        crawlsPerMonth: 5,
        aiBlogsPerMonth: 10,
        geoQueriesPerMonth: 50,
        outreachProspectsPerMonth: 50,
        teamMembers: 2,
      },
    },
    {
      name: 'Büyüme',
      slug: 'growth',
      monthlyPrice: 699,
      yearlyPrice: 6708,
      sortOrder: 2,
      limits: {
        projects: 10,
        keywords: 500,
        crawlsPerMonth: 20,
        aiBlogsPerMonth: 50,
        geoQueriesPerMonth: 200,
        outreachProspectsPerMonth: 200,
        teamMembers: 5,
      },
    },
    {
      name: 'Pro',
      slug: 'pro',
      monthlyPrice: 1299,
      yearlyPrice: 12468,
      sortOrder: 3,
      limits: {
        projects: -1,
        keywords: -1,
        crawlsPerMonth: -1,
        aiBlogsPerMonth: 200,
        geoQueriesPerMonth: -1,
        outreachProspectsPerMonth: -1,
        teamMembers: -1,
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {},
      create: {
        name: plan.name,
        slug: plan.slug,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        currency: 'TRY',
        isActive: true,
        sortOrder: plan.sortOrder,
        limits: plan.limits,
      },
    });
    console.log(`✅ Plan created: ${plan.name} (${plan.monthlyPrice}₺/ay)`);
  }

  // ============================================================
  // 3. SYSTEM SETTINGS
  // ============================================================
  const systemSettings = [
    {
      key: 'dataforseo_daily_cost_limit_usd',
      value: { amount: 50, currency: 'USD' },
    },
    {
      key: 'llm_monthly_cost_limit_usd',
      value: { amount: 500, currency: 'USD' },
    },
    {
      key: 'vat_rate',
      value: { rate: 0.20, label: 'KDV %20' },
    },
    {
      key: 'maintenance_mode',
      value: { enabled: false, message: '' },
    },
    {
      key: 'whatsapp_support_url',
      value: { url: 'https://wa.me/905334488253?text=Merhaba%2C%20FunBreak%20SEO%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum.' },
    },
    {
      key: 'trial_duration_days',
      value: { days: 14 },
    },
    {
      key: 'affiliate_commission_rate',
      value: { rate: 0.15, label: '%15' },
    },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
      },
    });
  }
  console.log(`✅ ${systemSettings.length} system settings created`);

  // ============================================================
  // 4. SEO RULE DEFINITIONS
  // ============================================================
  const seoRules = [
    {
      code: 'TITLE_MISSING',
      category: 'TITLE' as const,
      severity: 'CRITICAL' as const,
      titleTr: 'Sayfa Başlığı Eksik',
      descriptionTr: 'Sayfanın <title> etiketi boş veya mevcut değil.',
      recommendationTr: 'Her sayfa için 50-60 karakter arasında benzersiz bir <title> etiketi ekleyin.',
      weight: 10,
      autoFixable: false,
    },
    {
      code: 'META_DESCRIPTION_MISSING',
      category: 'META' as const,
      severity: 'WARNING' as const,
      titleTr: 'Meta Açıklaması Eksik',
      descriptionTr: 'Sayfanın meta açıklaması tanımlanmamış.',
      recommendationTr: '150-160 karakter arasında ilgi çekici bir meta açıklaması ekleyin.',
      weight: 7,
      autoFixable: false,
    },
    {
      code: 'H1_MISSING',
      category: 'HEADING' as const,
      severity: 'CRITICAL' as const,
      titleTr: 'H1 Etiketi Eksik',
      descriptionTr: 'Sayfada hiçbir H1 başlık etiketi bulunamadı.',
      recommendationTr: 'Her sayfa için odak anahtar kelimeyi içeren tek bir H1 etiketi kullanın.',
      weight: 9,
      autoFixable: false,
    },
    {
      code: 'TITLE_TOO_LONG',
      category: 'TITLE' as const,
      severity: 'WARNING' as const,
      titleTr: 'Sayfa Başlığı Çok Uzun',
      descriptionTr: 'Sayfa başlığı 60 karakterden uzun. Arama motorları başlığı kısaltabilir.',
      recommendationTr: 'Sayfa başlığını 50-60 karakter arasında tutun.',
      weight: 5,
      autoFixable: false,
    },
    {
      code: 'IMAGES_MISSING_ALT',
      category: 'CONTENT' as const,
      severity: 'NOTICE' as const,
      titleTr: 'Görsellerde Alt Metin Eksik',
      descriptionTr: 'Bir veya daha fazla görselde alt metin (alt attribute) bulunmuyor.',
      recommendationTr: 'Tüm anlamlı görseller için açıklayıcı alt metin ekleyin.',
      weight: 4,
      autoFixable: false,
    },
  ];

  for (const rule of seoRules) {
    await prisma.seoRuleDefinition.upsert({
      where: { code: rule.code },
      update: {},
      create: rule,
    });
  }
  console.log(`✅ ${seoRules.length} SEO rule definitions created`);

  // ============================================================
  // 5. LEGAL DOCUMENTS
  // ============================================================
  const legalDocs = [
    {
      type: 'TERMS' as const,
      version: '1.0',
      locale: 'tr',
      content: `# Kullanım Şartları\n\nSon güncelleme: ${new Date().toLocaleDateString('tr-TR')}\n\nFunBreak SEO platformunu kullanarak aşağıdaki kullanım şartlarını kabul etmiş sayılırsınız.\n\n## 1. Hizmet Tanımı\n\nFunBreak SEO, işletmelerin arama motoru ve yapay zeka görünürlüklerini artırmalarına yardımcı olan bir SaaS platformudur.\n\n## 2. Hesap Sorumlulukları\n\nKullanıcılar hesap güvenliklerinden sorumludur. Şifrenizi kimseyle paylaşmayın.\n\n## 3. Ödeme Koşulları\n\nAbonelik ücretleri aylık veya yıllık olarak alınır. İade politikamız için lütfen iade koşullarımızı inceleyin.\n\n## 4. Hizmet Kesintileri\n\nFunBreak SEO, planlı bakım çalışmaları dışında %99.9 uptime garantisi vermektedir.\n\n## 5. Fikri Mülkiyet\n\nPlatform içeriği ve yazılımı FunBreak SEO'ya aittir ve telif hukuku ile korunmaktadır.`,
      effectiveDate: new Date(),
      isActive: true,
    },
    {
      type: 'KVKK' as const,
      version: '1.0',
      locale: 'tr',
      content: `# KVKK Aydınlatma Metni\n\nSon güncelleme: ${new Date().toLocaleDateString('tr-TR')}\n\n## Veri Sorumlusu\n\nFunBreak SEO olarak kişisel verilerinizi 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında işlemekteyiz.\n\n## Toplanan Veriler\n\n- Ad, soyad, e-posta adresi\n- Fatura ve ödeme bilgileri\n- Platform kullanım verileri\n- İletişim tercihleri\n\n## Verilerin Kullanımı\n\nKişisel verileriniz hizmet sunumu, faturalama ve müşteri desteği amacıyla kullanılmaktadır.\n\n## Haklarınız\n\nKVKK kapsamında kişisel verilerinize erişim, düzeltme, silme ve itiraz haklarına sahipsiniz.\n\n## İletişim\n\nKVKK talepleriniz için: kvkk@funbreakseo.com`,
      effectiveDate: new Date(),
      isActive: true,
    },
    {
      type: 'PRIVACY' as const,
      version: '1.0',
      locale: 'tr',
      content: `# Gizlilik Politikası\n\nSon güncelleme: ${new Date().toLocaleDateString('tr-TR')}\n\n## Veri Toplama\n\nFunBreak SEO, hizmetlerimizi sağlamak için gerekli minimum düzeyde kişisel veri toplamaktadır.\n\n## Çerezler\n\nPlatformumuz, oturum yönetimi ve analitik amaçlı çerezler kullanmaktadır. Çerez tercihlerinizi tarayıcınızdan yönetebilirsiniz.\n\n## Üçüncü Taraf Hizmetler\n\nStripe (ödeme), Resend (e-posta) gibi güvenilir üçüncü taraf hizmetleri kullanmaktayız.\n\n## Veri Güvenliği\n\nTüm veriler şifreli bağlantılar (SSL/TLS) üzerinden iletilir ve güvenli sunucularda saklanır.\n\n## İletişim\n\nGizlilik sorularınız için: gizlilik@funbreakseo.com`,
      effectiveDate: new Date(),
      isActive: true,
    },
  ];

  for (const doc of legalDocs) {
    await prisma.legalDocument.upsert({
      where: {
        type_locale_version: {
          type: doc.type,
          locale: doc.locale,
          version: doc.version,
        },
      },
      update: {},
      create: doc,
    });
  }
  console.log(`✅ ${legalDocs.length} legal documents created`);

  console.log('\n🎉 FunBreak SEO database seed completed successfully!');
  console.log('\nAdmin credentials:');
  console.log('  Email: admin@funbreakseo.com');
  console.log('  Password: Admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
