import { CURRENCY_SYMBOLS, LOCALE_CURRENCY } from '../constants';
import type { Locale } from '../types';

export function formatPrice(amount: number, currency: string, locale: string = 'tr-TR'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  // TRY shows symbol after number (₺499), others before
  if (currency === 'TRY') {
    return `${formatted}${symbol}`;
  }
  return `${symbol}${formatted}`;
}

export function getCurrencyForLocale(locale: Locale): string {
  return LOCALE_CURRENCY[locale] || 'TRY';
}

export function convertPrice(amountTry: number, targetCurrency: string, rates: Record<string, number>): number {
  if (targetCurrency === 'TRY') return amountTry;
  const rate = rates[targetCurrency];
  if (!rate) return amountTry;
  return Math.round(amountTry / rate);
}

export function calcVat(total: number, vatRate: number = 0.20) {
  const base = total / (1 + vatRate);
  const vat = total - base;
  return { total, base, vat };
}

export function slugify(text: string): string {
  const trMap: Record<string, string> = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u',
  };
  return text
    .split('')
    .map(c => trMap[c] || c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function generateReferralCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function paginate<T>(
  items: T[],
  page: number,
  limit: number
): { data: T[]; total: number; page: number; limit: number; totalPages: number } {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return { data, total, page, limit, totalPages };
}

export function isRTL(locale: string): boolean {
  return locale === 'ar';
}

export function getDrTier(dr: number): string {
  if (dr < 20) return 'DR 0-20';
  if (dr < 30) return 'DR 20-30';
  if (dr < 50) return 'DR 30-50';
  if (dr < 70) return 'DR 50-70';
  return 'DR 70+';
}

export function calcOpportunityScore(volume: number, difficulty: number, intent: string): number {
  const intentWeight = { TRANSACTIONAL: 1.5, COMMERCIAL: 1.3, INFORMATIONAL: 1.0, NAVIGATIONAL: 0.8 };
  const weight = intentWeight[intent as keyof typeof intentWeight] || 1.0;
  return Math.round((volume * (100 - difficulty) * weight) / 1000);
}
