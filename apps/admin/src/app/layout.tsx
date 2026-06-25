import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FunBreak SEO Admin',
  description: 'Yönetici Paneli',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}