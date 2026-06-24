import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://funbreakseo.com'),
  title: {
    template: '%s | FunBreak SEO',
    default: 'FunBreak SEO — SEO + GEO Platformu',
  },
  description:
    'Google ve yapay zeka aramalarında görünürlüğünüzü artıran tam otomatik SEO + GEO platformu. ChatGPT, Gemini, Perplexity takibi.',
  keywords: ['seo', 'geo', 'yapay zeka arama', 'chatgpt seo', 'sıralama takibi', 'backlink', 'içerik üretimi'],
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://funbreakseo.com',
    siteName: 'FunBreak SEO',
  },
  robots: { index: true, follow: true },
};

// Root layout: locale-aware html/body lives in [locale]/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
