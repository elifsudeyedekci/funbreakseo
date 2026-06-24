'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_KEY = 'funbreak_cookie_consent';

export function CookieConsentBanner() {
  const t = useTranslations('cookie');
  const [visible, setVisible] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_KEY);
    if (!saved) {
      setVisible(true);
    }
  }, []);

  function save(preferences: CookiePreferences) {
    localStorage.setItem(
      COOKIE_KEY,
      JSON.stringify({ preferences, timestamp: Date.now() })
    );
    setVisible(false);
    setShowManage(false);
  }

  function acceptAll() {
    save({ essential: true, analytics: true, marketing: true });
  }

  function declineAll() {
    save({ essential: true, analytics: false, marketing: false });
  }

  function saveManaged() {
    save(prefs);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6">
      <div className="mx-auto max-w-4xl glass rounded-xl shadow-2xl border border-white/10 p-5">
        {!showManage ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">{t('title')}</h3>
              <p className="text-xs text-white/60 leading-relaxed max-w-2xl">{t('desc')}</p>
            </div>
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <button
                onClick={() => setShowManage(true)}
                className="rounded-lg border border-white/20 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition-colors"
              >
                {t('manage')}
              </button>
              <button
                onClick={declineAll}
                className="rounded-lg border border-white/20 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition-colors"
              >
                {t('decline')}
              </button>
              <button
                onClick={acceptAll}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                {t('accept')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold text-white">{t('title')}</h3>
            <div className="space-y-3">
              <CookieToggle
                label={t('essential')}
                checked={true}
                disabled={true}
                onChange={() => {}}
              />
              <CookieToggle
                label={t('analytics')}
                checked={prefs.analytics}
                onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
              />
              <CookieToggle
                label={t('marketing')}
                checked={prefs.marketing}
                onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowManage(false)}
                className="rounded-lg border border-white/20 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 transition-colors"
              >
                {t('decline')}
              </button>
              <button
                onClick={saveManaged}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                {t('save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CookieToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn('text-sm', disabled ? 'text-white/40' : 'text-white/80')}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative h-5 w-9 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500',
          checked ? 'bg-indigo-600' : 'bg-white/20',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform',
            checked && 'translate-x-4'
          )}
        />
      </button>
    </div>
  );
}
