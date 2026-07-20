import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SUPPORTED_LOCALES } from '@funbreakseo/shared';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { GeoSection } from '@/components/landing/GeoSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { PricingPreview } from '@/components/landing/PricingPreview';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { CaseStudiesSection } from '@/components/landing/CaseStudiesSection';
import { PillarContentSection } from '@/components/landing/PillarContentSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { CtaSection } from '@/components/landing/CtaSection';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://funbreakseo.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'hero' });

  const hreflangAlternates = Object.fromEntries(
    SUPPORTED_LOCALES.map((l) => [l, `${APP_URL}/${l === 'tr' ? '' : l}`])
  );

  return {
    title: 'FunBreak SEO — SEO + GEO Platformu | Google ve AI Aramalarında Görünür Ol',
    description: t('subtitle'),
    alternates: {
      canonical: `${APP_URL}/${locale === 'tr' ? '' : locale}`,
      languages: hreflangAlternates,
    },
  };
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'FunBreak Global Teknoloji Ltd. Şti.',
  url: APP_URL,
  logo: `${APP_URL}/logo.png`,
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+90-533-448-82-53',
    contactType: 'customer service',
    availableLanguage: ['Turkish', 'English'],
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'İstanbul',
    addressCountry: 'TR',
  },
  sameAs: [
    'https://www.linkedin.com/company/funbreakseo',
    'https://twitter.com/funbreakseo',
  ],
};

const softwareAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'FunBreak SEO',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '499',
    priceCurrency: 'TRY',
    priceValidUntil: '2026-12-31',
    availability: 'https://schema.org/InStock',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '200',
    bestRating: '5',
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'FunBreak SEO',
  url: APP_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${APP_URL}/blog?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params; // ensure locale param is awaited

  return (
    <>
      {/* JSON-LD schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <GeoSection />
        <HowItWorksSection />
        <PricingPreview />
        <TestimonialsSection />
        <CaseStudiesSection />
        <PillarContentSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
