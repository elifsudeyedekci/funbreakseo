import { useTranslations } from 'next-intl';
import { Globe, Cpu, TrendingUp } from 'lucide-react';

const STEP_META = [
  {
    num: '01',
    icon: Globe,
    numColor: 'text-indigo-500/12',
    iconBg: 'bg-indigo-500/12',
    iconColor: 'text-indigo-400',
    glowBg: 'bg-indigo-500/8',
    border: 'border-indigo-500/14 hover:border-indigo-500/28',
  },
  {
    num: '02',
    icon: Cpu,
    numColor: 'text-purple-500/12',
    iconBg: 'bg-purple-500/12',
    iconColor: 'text-purple-400',
    glowBg: 'bg-purple-500/8',
    border: 'border-purple-500/14 hover:border-purple-500/28',
  },
  {
    num: '03',
    icon: TrendingUp,
    numColor: 'text-emerald-500/12',
    iconBg: 'bg-emerald-500/12',
    iconColor: 'text-emerald-400',
    glowBg: 'bg-emerald-500/8',
    border: 'border-emerald-500/14 hover:border-emerald-500/28',
  },
];

export function HowItWorksSection() {
  const t = useTranslations('howItWorks');

  const steps = [
    { ...STEP_META[0], title: t('step1Title'), desc: t('step1Desc') },
    { ...STEP_META[1], title: t('step2Title'), desc: t('step2Desc') },
    { ...STEP_META[2], title: t('step3Title'), desc: t('step3Desc') },
  ];

  return (
    <section className="relative py-28 px-4 sm:px-6 lg:px-8">
      {/* Separator */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-28 bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" />

      {/* Ambient glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[280px] rounded-full bg-indigo-800/6 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm px-4 py-1.5 mb-5">
            <span className="text-xs font-medium text-white/50">{t('badge')}</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            {t('title')}
          </h2>
          <p className="text-white/35 text-lg max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-[4.5rem] left-[calc(16.67%+3.5rem)] right-[calc(16.67%+3.5rem)] h-px bg-gradient-to-r from-indigo-500/25 via-purple-500/20 to-emerald-500/25 pointer-events-none" />

          {steps.map((step) => (
            <div
              key={step.num}
              className={`relative rounded-2xl border ${step.border} bg-white/[0.025] backdrop-blur-sm p-8 text-center overflow-hidden transition-all duration-300 group hover:bg-white/[0.04]`}
            >
              <div
                className={`absolute top-3 right-4 text-8xl font-black ${step.numColor} leading-none select-none pointer-events-none`}
                aria-hidden="true"
              >
                {step.num}
              </div>

              <div className={`relative z-10 inline-flex p-4 rounded-2xl ${step.iconBg} mb-6 border border-white/[0.05] group-hover:scale-105 transition-transform`}>
                <step.icon className={`h-6 w-6 ${step.iconColor}`} />
              </div>

              <h3 className="relative z-10 text-xl font-semibold text-white mb-3">{step.title}</h3>
              <p className="relative z-10 text-white/38 leading-relaxed text-sm">{step.desc}</p>

              <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 w-36 h-36 rounded-full ${step.glowBg} blur-2xl pointer-events-none`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
