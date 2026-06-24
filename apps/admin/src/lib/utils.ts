import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDate(d: string | Date, locale = 'tr-TR') {
  return new Date(d).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtMoney(amount: number, currency = 'TRY', locale = 'tr-TR') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function fmtNumber(n: number, locale = 'tr-TR') {
  return new Intl.NumberFormat(locale).format(n);
}
