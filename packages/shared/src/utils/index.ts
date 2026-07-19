import { CURRENCY_SYMBOLS, LOCALE_CURRENCY } from '../types';
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

// ---------------------------------------------------------------------------
// Site-audit scoring — shared by the post-crawl aggregator, the competitor
// comparison endpoint, and the free-analysis preview so all three agree on
// what a "score" and a "grade" mean.
// ---------------------------------------------------------------------------

import type { CategoryScore } from '../types';
import { scoreToLetterGrade } from '../types';

export function toCategoryScore(raw: number): CategoryScore {
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return { score, grade: scoreToLetterGrade(score) };
}

/** 100 minus a weighted penalty per recommendation priority — used when no direct 0-100 score exists for a category. */
export function penaltyScore(recs: { priority: 'CRITICAL' | 'MEDIUM' | 'LOW' }[]): number {
  let score = 100;
  for (const r of recs) {
    if (r.priority === 'CRITICAL') score -= 8;
    else if (r.priority === 'MEDIUM') score -= 4;
    else score -= 1;
  }
  return Math.max(0, score);
}

export function weightedOverallScore(categoryScores: {
  onPage: CategoryScore;
  geo: CategoryScore;
  backlink: CategoryScore;
  usability: CategoryScore;
  performance: CategoryScore;
}): number {
  return Math.round(
    categoryScores.onPage.score * 0.25 +
      categoryScores.geo.score * 0.15 +
      categoryScores.backlink.score * 0.2 +
      categoryScores.usability.score * 0.2 +
      categoryScores.performance.score * 0.2,
  );
}
