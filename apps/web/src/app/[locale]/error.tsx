'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="p-5 rounded-3xl bg-red-500/[0.08] border border-red-500/20 mb-8">
        <AlertTriangle className="h-12 w-12 text-red-400" />
      </div>
      <p className="text-sm font-mono text-red-400/70 mb-3">500</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">{t('serverError')}</h1>
      {error.digest && <p className="text-xs text-white/25 font-mono mb-6">{error.digest}</p>}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> {t('retry')}
        </button>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 hover:bg-white/10 px-6 py-3 text-sm font-medium text-white/70 transition-colors"
        >
          {t('goHome')}
        </a>
      </div>
    </main>
  );
}
