import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RTL_LOCALES, type Locale } from '@funbreakseo/shared';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isRTL(locale: string): boolean {
  return RTL_LOCALES.includes(locale as Locale);
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale?: string
): string {
  try {
    return new Intl.NumberFormat(locale || 'tr-TR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatNumber(n: number, locale = 'tr-TR'): string {
  return new Intl.NumberFormat(locale).format(n);
}

export function formatDate(
  date: string | Date,
  locale = 'tr-TR',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(d);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export function readingTime(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function buildHreflangTags(
  pathname: string,
  locales: string[]
): Array<{ rel: string; hrefLang: string; href: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://funbreakseo.com';
  return locales.map((locale) => ({
    rel: 'alternate',
    hrefLang: locale,
    href: `${baseUrl}/${locale}${pathname}`,
  }));
}

export function getDomainFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
