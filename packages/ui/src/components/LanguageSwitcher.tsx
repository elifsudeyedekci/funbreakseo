'use client';
import * as React from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { cn } from '../utils';

const LOCALES = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
];

interface LanguageSwitcherProps {
  currentLocale: string;
  onLocaleChange: (locale: string) => void;
  className?: string;
  variant?: 'dropdown' | 'pills';
}

export function LanguageSwitcher({ currentLocale, onLocaleChange, className, variant = 'dropdown' }: LanguageSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const current = LOCALES.find((l) => l.code === currentLocale) ?? LOCALES[0];

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (variant === 'pills') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {LOCALES.map((l) => (
          <button key={l.code} type="button" onClick={() => onLocaleChange(l.code)}
            className={cn('flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              l.code === currentLocale ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}>
            <span>{l.flag}</span><span>{l.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
        <Globe className="h-4 w-4" />
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-1 shadow-xl">
          {LOCALES.map((l) => (
            <button key={l.code} type="button"
              onClick={() => { onLocaleChange(l.code); setOpen(false); }}
              className={cn('flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--bg-base)] transition-colors',
                l.code === currentLocale ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
              )}>
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
