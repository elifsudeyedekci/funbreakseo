'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ExternalLink, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api';

export function ConsentModal() {
  const { pendingConsents, clearPendingConsent } = useAuthStore();
  const locale = useLocale();
  const t = useTranslations('consentModal');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const localePath = (path: string) => locale === 'tr' ? path : `/${locale}${path}`;

  if (!pendingConsents || pendingConsents.length === 0) return null;

  const allChecked = pendingConsents.every((type) => checked[type]);

  const CONSENT_LABELS: Record<string, { label: string; link: string }> = {
    TERMS: { label: t('consentTerms'), link: localePath('/kullanim-sartlari') },
    KVKK: { label: t('consentKvkk'), link: localePath('/kvkk') },
    DISTANCE_SALES: { label: t('consentDistanceSales'), link: localePath('/mesafeli-satis-sozlesmesi') },
    PRIVACY: { label: t('consentPrivacy'), link: localePath('/gizlilik-politikasi') },
  };

  async function handleAccept() {
    setLoading(true);
    try {
      await Promise.all(
        pendingConsents.map((type) =>
          apiClient.post('/account/consent', { type, version: '2.0' })
        )
      );
      pendingConsents.forEach((type) => clearPendingConsent(type));
    } catch {
      // still clear locally on error to not block the user entirely
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-indigo-500/20">
            <Shield className="h-5 w-5 text-indigo-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">{t('heading')}</h2>
        </div>
        <p className="text-sm text-white/60 mb-5 leading-relaxed">
          {t('description')}
        </p>

        <div className="space-y-3 mb-6">
          {pendingConsents.map((type) => {
            const info = CONSENT_LABELS[type];
            if (!info) return null;
            return (
              <label key={type} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!checked[type]}
                  onChange={(e) => setChecked((prev) => ({ ...prev, [type]: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border border-white/20 bg-white/5 text-indigo-600 cursor-pointer"
                />
                <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">
                  <Link
                    href={info.link}
                    target="_blank"
                    className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-0.5"
                  >
                    {info.label} <ExternalLink className="h-3 w-3" />
                  </Link>
                  {' '}{t('readAndAccept')}
                </span>
              </label>
            );
          })}
        </div>

        <button
          onClick={handleAccept}
          disabled={!allChecked || loading}
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? t('saving') : t('acceptAndContinue')}
        </button>
      </div>
    </div>
  );
}
