import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SUPPORT_PHONE, SUPPORT_EMAIL, COMPANY_NAME } from '@funbreakseo/shared';
import { MapPin, Mail, Phone, Globe, Users, Target, Lightbulb, ArrowRight } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'hakkimizdaPage' });
  return {
    title: `${t('title')} ${t('titleHighlight')} | FunBreak SEO`,
    description: t('subtitle'),
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'hakkimizdaPage' });

  type Milestone = { year: string; title: string; desc: string };
  type TeamMember = { initial: string; name: string; role: string; bio: string; skills: string[] };
  const milestones = t.raw('milestones') as Milestone[];
  const team = t.raw('team') as TeamMember[];

  const kayitPath = locale === 'tr' ? '/kayit' : `/${locale}/kayit`;
  const iletisimPath = locale === 'tr' ? '/iletisim' : `/${locale}/iletisim`;

  const mvv = [
    { Icon: Target, key: 'mission' as const, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/18' },
    { Icon: Lightbulb, key: 'vision' as const, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/18' },
    { Icon: Users, key: 'values' as const, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/18' },
  ];

  const teamGradients = ['from-indigo-500 to-purple-600', 'from-emerald-500 to-teal-600', 'from-orange-500 to-rose-500', 'from-purple-500 to-indigo-600'];

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Hero */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm px-4 py-1.5 mb-5">
              <span className="text-xs font-medium text-white/50">{t('badge')}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
              {t('title')}<br />
              <span className="gradient-text">{t('titleHighlight')}</span>
            </h1>
            <p className="text-xl text-white/45 max-w-2xl mx-auto leading-relaxed">{t('subtitle')}</p>
          </div>

          {/* Mission / Vision / Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
            {mvv.map(({ Icon, key, color, bg, border }) => (
              <div key={key} className={`rounded-2xl border ${border} ${bg} p-7`}>
                <Icon className={`h-6 w-6 ${color} mb-4`} />
                <h3 className="text-lg font-semibold text-white mb-3">{t(`${key}.title`)}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{t(`${key}.desc`)}</p>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="mb-20">
            <h2 className="text-2xl font-bold text-white mb-10 text-center">{t('storyTitle')}</h2>
            <div className="relative">
              <div className="absolute left-[3.5rem] top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/40 via-purple-500/20 to-transparent hidden sm:block" />
              <div className="space-y-6">
                {milestones.map((m, i) => (
                  <div key={i} className="flex gap-6 items-start">
                    <div className="flex-shrink-0 w-[5.5rem] text-right hidden sm:block">
                      <span className="text-xs font-mono font-bold text-indigo-400/70">{m.year}</span>
                    </div>
                    <div className="hidden sm:flex flex-shrink-0 w-3 h-3 rounded-full bg-indigo-500/60 border border-indigo-400/40 mt-1" />
                    <div className="flex-1 rounded-xl border border-white/8 bg-white/[0.025] p-5">
                      <div className="sm:hidden text-xs font-mono text-indigo-400/70 mb-1">{m.year}</div>
                      <h3 className="font-semibold text-white mb-1">{m.title}</h3>
                      <p className="text-sm text-white/45">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="mb-20">
            <h2 className="text-2xl font-bold text-white mb-3 text-center">{t('teamTitle')}</h2>
            <p className="text-white/40 text-center mb-10 text-sm max-w-xl mx-auto">{t('teamSubtitle')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {team.map((member, i) => (
                <div key={member.name} className="rounded-2xl border border-white/10 bg-white/[0.025] p-7">
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${teamGradients[i % teamGradients.length]} flex items-center justify-center text-lg font-bold text-white flex-shrink-0`}>
                      {member.initial}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{member.name}</h3>
                      <p className="text-xs text-white/40">{member.role}</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed mb-4">{member.bio}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {member.skills.map((skill) => (
                      <span key={skill} className="text-[10px] rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/40">{skill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Company info */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 mb-12">
            <h2 className="text-xl font-bold text-white mb-7">{t('companyTitle')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-white/35 uppercase tracking-widest mb-1.5">{t('companyNameLabel')}</p>
                <p className="text-white font-medium">{COMPANY_NAME}</p>
              </div>
              <div>
                <p className="text-xs text-white/35 uppercase tracking-widest mb-1.5">{t('foundedLabel')}</p>
                <p className="text-white font-medium">{t('foundedValue')}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-white/35 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> {t('addressLabel')}
                </p>
                <p className="text-white font-medium">{t('addressValue')}</p>
              </div>
              <div>
                <p className="text-xs text-white/35 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> {t('phoneLabel')}
                </p>
                <a href={`tel:${SUPPORT_PHONE}`} className="text-white font-medium hover:text-indigo-300 transition-colors">{SUPPORT_PHONE}</a>
              </div>
              <div>
                <p className="text-xs text-white/35 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> {t('emailLabel')}
                </p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-white font-medium hover:text-indigo-300 transition-colors">{SUPPORT_EMAIL}</a>
              </div>
              <div>
                <p className="text-xs text-white/35 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Globe className="h-3 w-3" /> {t('serviceAreasLabel')}
                </p>
                <p className="text-white font-medium">{t('serviceAreasValue')}</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center rounded-2xl border border-indigo-500/20 bg-indigo-900/15 p-10">
            <h2 className="text-2xl font-bold text-white mb-3">{t('ctaTitle')}</h2>
            <p className="text-white/40 mb-7 max-w-md mx-auto text-sm">{t('ctaSubtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={kayitPath} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all">
                {t('ctaButton')} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={iletisimPath} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-all">
                {t('ctaContactButton')}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
