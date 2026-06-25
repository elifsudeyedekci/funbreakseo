import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, Shield, Clock, Headphones } from 'lucide-react';

export function CtaSection() {
  const locale = useLocale();
  const t = useTranslations('cta');
  const localePath = (path: string) => (locale === 'tr' ? path : `/${locale}${path}`);

  return (
    <section className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Strong dual-orb glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] rounded-full bg-indigo-700/20 blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-purple-700/15 blur-[90px]" />
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="relative rounded-3xl border border-indigo-500/20 overflow-hidden">
          {/* Card bg gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/30 via-[#0e0e1e]/80 to-[#09090b]/90 pointer-events-none" />

          {/* Inner dot grid */}
          <div
            className="absolute inset-0 opacity-[0.12] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/70 to-transparent" />
          {/* Bottom accent */}
          <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

          {/* Inner glow spots */}
          <div className="absolute -top-20 left-1/4 w-48 h-48 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 right-1/4 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

          <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-sm px-4 py-1.5 mb-8">
              <span className="text-xs font-medium text-indigo-300">{t('badge')}</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-5 tracking-tight leading-tight">
              {t('title')}
              <br />
              <span className="gradient-text">{t('titleHighlight')}</span>
            </h2>

            <p className="text-white/40 text-lg mb-12 max-w-xl mx-auto leading-relaxed">
              {t('subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href={localePath('/kayit')}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white transition-all duration-200 hover:bg-indigo-500 shadow-[0_0_32px_rgba(99,102,241,0.45)] hover:shadow-[0_0_56px_rgba(99,102,241,0.65)] hover:-translate-y-0.5"
              >
                {t('primary')}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href={localePath('/iletisim')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] backdrop-blur-sm px-8 py-4 text-base font-semibold text-white/60 hover:bg-white/10 hover:text-white hover:border-white/25 transition-all duration-200"
              >
                {t('secondary')}
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
              {[
                { icon: Shield, label: t('trust1') },
                { icon: Clock, label: t('trust2') },
                { icon: Headphones, label: t('trust3') },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-white/25">
                  <Icon className="h-4 w-4 text-white/15" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
