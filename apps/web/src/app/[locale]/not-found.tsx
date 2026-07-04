import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { SearchX } from 'lucide-react';

export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations('errors');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 mb-8">
        <SearchX className="h-12 w-12 text-indigo-400" />
      </div>
      <p className="text-sm font-mono text-indigo-400/70 mb-3">404</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">{t('notFound')}</h1>
      <Link
        href={`/${locale}`}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors"
      >
        {t('goHome')}
      </Link>
    </main>
  );
}
