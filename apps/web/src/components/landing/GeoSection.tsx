import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Brain, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';

const GEO_PLATFORMS = [
  { name: 'ChatGPT',    mentions: 89, color: 'text-emerald-400', bg: 'bg-emerald-500/10  border-emerald-500/20' },
  { name: 'Gemini',     mentions: 67, color: 'text-blue-400',    bg: 'bg-blue-500/10    border-blue-500/20' },
  { name: 'Perplexity', mentions: 54, color: 'text-purple-400',  bg: 'bg-purple-500/10  border-purple-500/20' },
  { name: 'Claude',     mentions: 37, color: 'text-orange-400',  bg: 'bg-orange-500/10  border-orange-500/20' },
  { name: 'AI Overview',mentions: 28, color: 'text-indigo-400',  bg: 'bg-indigo-500/10  border-indigo-500/20' },
  { name: 'AI Mode',    mentions: 19, color: 'text-rose-400',    bg: 'bg-rose-500/10    border-rose-500/20' },
];

export function GeoSection() {
  const t = useTranslations('geo');
  const locale = useLocale();
  const localePath = (path: string) => (locale === 'tr' ? path : `/${locale}${path}`);

  return (
    <section className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Strong purple section glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-purple-700/14 blur-[150px]" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-indigo-700/10 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* ── Left: text ── */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 backdrop-blur-sm px-4 py-1.5 mb-7">
              <Brain className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-medium text-purple-300">{t('badge')}</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight tracking-tight">
              {t('title')}
            </h2>
            <p className="text-white/40 text-lg mb-9 leading-relaxed">{t('subtitle')}</p>

            <div className="space-y-3 mb-9">
              {[
                {
                  icon: TrendingUp,
                  iconBg: 'bg-purple-500/15',
                  iconColor: 'text-purple-400',
                  title: t('mention'),
                  desc: t('mentionDesc'),
                  value: '247',
                  valueColor: 'text-purple-400',
                  border: 'border-white/[0.07] hover:border-purple-500/20',
                },
                {
                  icon: TrendingUp,
                  iconBg: 'bg-indigo-500/15',
                  iconColor: 'text-indigo-400',
                  title: t('citation'),
                  desc: t('citationDesc'),
                  value: '89',
                  valueColor: 'text-indigo-400',
                  border: 'border-white/[0.07] hover:border-indigo-500/20',
                },
                {
                  icon: AlertTriangle,
                  iconBg: 'bg-orange-500/15',
                  iconColor: 'text-orange-400',
                  title: t('ratio'),
                  desc: t('ratioDesc'),
                  value: '36%',
                  valueColor: 'text-orange-400',
                  border: 'border-orange-500/15 bg-orange-500/[0.03] hover:border-orange-500/25',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border ${item.border} bg-white/[0.025] backdrop-blur-sm p-4 flex items-start gap-4 transition-all duration-200 group`}
                >
                  <div className={`p-2.5 rounded-xl ${item.iconBg} flex-shrink-0`}>
                    <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    <div className={`text-xs mt-0.5 ${i === 2 ? 'text-orange-400/70' : 'text-white/30'}`}>{item.desc}</div>
                  </div>
                  <div className={`text-2xl font-bold flex-shrink-0 ${item.valueColor}`}>{item.value}</div>
                </div>
              ))}
            </div>

            <Link
              href={localePath('/geo')}
              className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/8 backdrop-blur-sm px-6 py-3 text-sm font-medium text-purple-300 hover:bg-purple-500/15 hover:border-purple-500/50 transition-all duration-200"
            >
              GEO hakkında daha fazla bilgi <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* ── Right: platform + score ── */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-white/25 uppercase tracking-widest mb-3">İzlenen AI Platformları</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GEO_PLATFORMS.map((platform) => (
                <div
                  key={platform.name}
                  className={`rounded-xl border ${platform.bg} p-4 text-center transition-all duration-200 hover:scale-[1.03] hover:shadow-lg`}
                >
                  <div className={`text-sm font-semibold ${platform.color}`}>{platform.name}</div>
                  <div className="text-xs text-white/20 mt-1">{platform.mentions} mention</div>
                </div>
              ))}
            </div>

            {/* GEO score card */}
            <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-900/25 via-indigo-900/10 to-transparent backdrop-blur-sm p-7 shadow-[inset_0_1px_0_rgba(168,85,247,0.15)]">
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-semibold text-white">GEO Görünürlük Skoru</span>
                <span className="text-xs text-white/25 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5">Son 30 gün</span>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-5xl font-bold gradient-text-geo">78</span>
                <span className="text-white/25 text-sm pb-2">/100</span>
                <span className="text-emerald-400 text-sm pb-2 ml-2 font-semibold">+12 ↑</span>
              </div>
              <div className="w-full bg-white/[0.07] rounded-full h-2.5 mb-6">
                <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-[0_0_12px_rgba(168,85,247,0.5)]" style={{ width: '78%' }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Mention', val: '247' },
                  { label: 'Citation', val: '89' },
                  { label: 'Platform', val: '6' },
                ].map((s) => (
                  <div key={s.label} className="text-center rounded-xl bg-white/[0.04] border border-white/[0.07] py-2.5">
                    <div className="text-xl font-bold text-white">{s.val}</div>
                    <div className="text-[9px] text-white/25 uppercase tracking-wide mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
