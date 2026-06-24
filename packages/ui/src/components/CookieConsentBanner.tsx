'use client';
import * as React from 'react';
import { Cookie, X } from 'lucide-react';
import { cn } from '../utils';

interface CookieConsentBannerProps {
  onAccept: () => void;
  onDecline: () => void;
  className?: string;
  texts?: {
    title?: string;
    desc?: string;
    accept?: string;
    decline?: string;
    privacyLink?: string;
    privacyHref?: string;
  };
}

export function CookieConsentBanner({ onAccept, onDecline, className, texts }: CookieConsentBannerProps) {
  const t = {
    title: texts?.title ?? 'Çerez Tercihleri',
    desc: texts?.desc ?? 'Deneyiminizi geliştirmek için zorunlu ve analitik çerezler kullanıyoruz.',
    accept: texts?.accept ?? 'Tümünü Kabul Et',
    decline: texts?.decline ?? 'Yalnızca Zorunlular',
    privacyLink: texts?.privacyLink ?? 'Gizlilik Politikası',
    privacyHref: texts?.privacyHref ?? '/gizlilik-politikasi',
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[100] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 shadow-2xl',
        className
      )}
      role="dialog"
      aria-live="polite"
      aria-label={t.title}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-lg bg-[var(--accent)]/10 p-2">
          <Cookie className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{t.title}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
            {t.desc}{' '}
            <a href={t.privacyHref} className="text-[var(--accent)] hover:underline">{t.privacyLink}</a>
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="flex-1 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              {t.accept}
            </button>
            <button
              type="button"
              onClick={onDecline}
              className="flex-1 rounded-md border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-base)] transition-colors"
            >
              {t.decline}
            </button>
          </div>
        </div>
        <button type="button" onClick={onDecline} className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
