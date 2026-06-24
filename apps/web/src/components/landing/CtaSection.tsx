import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  const locale = useLocale();
  const localePath = (path: string) => locale === 'tr' ? path : `/${locale}${path}`;

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center relative">
        {/* Glow */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="w-[500px] h-[300px] rounded-full bg-indigo-600/20 blur-[80px]" />
        </div>

        <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/10 to-transparent p-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            SEO ve GEO Yolculuğunuzu Bugün Başlatın
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-2xl mx-auto">
            14 günlük ücretsiz denemeyle platformun tüm özelliklerini keşfedin.
            Kredi kartı gerekmez, anında başlayın.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={localePath('/kayit')}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white hover:bg-indigo-500 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
            >
              14 Gün Ücretsiz Dene <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={localePath('/iletisim')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all"
            >
              Demo Talep Et
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/30">Kredi kartı gerekmez · Anında kurulum · 7/24 destek</p>
        </div>
      </div>
    </section>
  );
}
