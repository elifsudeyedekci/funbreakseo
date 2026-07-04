import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { SUPPORTED_LOCALES, RTL_LOCALES, type Locale } from '@funbreakseo/shared';
import { Providers } from '@/components/Providers';
import { WhatsAppFab } from '@/components/WhatsAppFab';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!SUPPORTED_LOCALES.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();
  const isRTL = RTL_LOCALES.includes(locale as Locale);

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen`}>
        {/* Top accent line */}
        <div className="fixed top-0 left-0 right-0 h-px z-[200] bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
        {/* Noise texture overlay */}
        <div className="noise-overlay" aria-hidden="true" />
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>
            {children}
            <WhatsAppFab />
            <CookieConsentBanner />
            <ServiceWorkerRegister />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
