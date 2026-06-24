import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Brain, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';

const GEO_PLATFORMS = [
  { name: 'ChatGPT', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { name: 'Gemini', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { name: 'Perplexity', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { name: 'Claude', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { name: 'AI Overview', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { name: 'AI Mode', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
];

export function GeoSection() {
  const t = useTranslations('geo');
  const locale = useLocale();
  const localePath = (path: string) => locale === 'tr' ? path : `/${locale}${path}`;

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Purple glow background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 mb-6">
              <Brain className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-medium text-purple-300">{t('badge')}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              {t('title')}
            </h2>
            <p className="text-white/60 text-lg mb-8 leading-relaxed">{t('subtitle')}</p>

            {/* GEO metrics */}
            <div className="space-y-4 mb-8">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t('mention')}</div>
                  <div className="text-xs text-white/50">{t('mentionDesc')}</div>
                </div>
                <div className="ml-auto text-2xl font-bold text-purple-400">247</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-indigo-500/20">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t('citation')}</div>
                  <div className="text-xs text-white/50">{t('citationDesc')}</div>
                </div>
                <div className="ml-auto text-2xl font-bold text-indigo-400">89</div>
              </div>

              <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t('ratio')}</div>
                  <div className="text-xs text-orange-400">{t('ratioDesc')}</div>
                </div>
                <div className="ml-auto text-2xl font-bold text-orange-400">36%</div>
              </div>
            </div>

            <Link
              href={localePath('/geo')}
              className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 px-6 py-3 text-sm font-medium text-purple-300 hover:bg-purple-500/10 transition-colors"
            >
              GEO hakkında daha fazla bilgi <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Right: Platform grid */}
          <div className="space-y-4">
            <p className="text-sm text-white/40 mb-4">İzlenen AI platformları:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GEO_PLATFORMS.map((platform) => (
                <div
                  key={platform.name}
                  className={`rounded-xl border ${platform.color} p-4 text-center`}
                >
                  <div className="text-sm font-medium">{platform.name}</div>
                  <div className="text-xs opacity-60 mt-1">İzleniyor</div>
                </div>
              ))}
            </div>

            {/* Mock GEO card */}
            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-white">GEO Görünürlük Skoru</span>
                <span className="text-xs text-white/40">Son 30 gün</span>
              </div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-bold gradient-text-geo">78</span>
                <span className="text-white/40 text-sm pb-1">/100</span>
                <span className="text-emerald-400 text-sm pb-1 ml-2">+12</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: '78%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
