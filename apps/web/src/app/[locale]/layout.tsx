import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { SUPPORTED_LOCALES, RTL_LOCALES, type Locale } from '@funbreakseo/shared';
import { Providers } from '@/components/Providers';
import { WhatsAppFab } from '@/components/WhatsAppFab';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';

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
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>
            {children}
            <WhatsAppFab />
            <CookieConsentBanner />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
