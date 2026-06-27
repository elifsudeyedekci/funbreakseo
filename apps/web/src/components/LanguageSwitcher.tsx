'use client';

import { useLocale } from 'next-intl';
import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { SUPPORTED_LOCALES } from '@funbreakseo/shared';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from '@/i18n/navigation';

const LOCALE_LABELS: Record<string, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  ar: 'العربية',
  ru: 'Русский',
  hi: 'हिन्दी',
};

const LOCALE_FLAGS: Record<string, string> = {
  tr: '🇹🇷',
  en: '🇺🇸',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
  ar: '🇸🇦',
  ru: '🇷🇺',
  hi: '🇮🇳',
};

export function LanguageSwitcher({ variant = 'dropdown' }: { variant?: 'dropdown' | 'flags' }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function switchLocale(newLocale: string) {
    // Persist locale in cookie so next-intl middleware reads it on refresh
    if (typeof document !== 'undefined') {
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    }
    // next-intl's useRouter handles locale prefix in URL automatically
    router.replace(pathname, { locale: newLocale });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Change language"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{LOCALE_FLAGS[locale]} {locale.toUpperCase()}</span>
        <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 glass rounded-xl border border-white/10 shadow-2xl py-1 overflow-hidden">
          {SUPPORTED_LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => switchLocale(l)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/10',
                l === locale ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/70'
              )}
            >
              <span className="text-base">{LOCALE_FLAGS[l]}</span>
              <span>{LOCALE_LABELS[l]}</span>
              {l === locale && (
                <svg className="ml-auto h-3.5 w-3.5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
