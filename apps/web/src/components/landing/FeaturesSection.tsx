'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import {
  Search, FileText, Brain, Link2, Mail, BarChart2, ArrowRight,
  Hash, Users, Download, Bot, Globe2, ChevronUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface FeatureCard {
  key: string;
  slug: string;
  Icon: LucideIcon;
  title: string;
  desc: string;
  gradient: string;
  border: string;
  iconBg: string;
  iconColor: string;
  glow: string;
  shadow: string;
}

const FEATURES: FeatureCard[] = [
  {
    key: 'seo',     slug: 'seo-tarama',
    Icon: Search,
    title: 'SEO Tarama',
    desc: '150+ teknik kontrol, Core Web Vitals, crawl hataları ve hız analizi tek tıkla.',
    gradient: 'from-indigo-600/16 via-indigo-500/5 to-transparent',
    border: 'border-indigo-500/22', iconBg: 'bg-indigo-500/14', iconColor: 'text-indigo-400',
    glow: 'bg-indigo-500/10', shadow: 'hover:shadow-[0_24px_64px_rgba(99,102,241,0.14)]',
  },
  {
    key: 'geo',     slug: 'geo-ai-gorunurluk',
    Icon: Brain,
    title: 'GEO & AI Görünürlük',
    desc: 'ChatGPT, Gemini, Perplexity ve Google AI Mode\'da markanızın anılma sayısını izleyin.',
    gradient: 'from-purple-600/16 via-purple-500/5 to-transparent',
    border: 'border-purple-500/22', iconBg: 'bg-purple-500/14', iconColor: 'text-purple-400',
    glow: 'bg-purple-500/10', shadow: 'hover:shadow-[0_24px_64px_rgba(168,85,247,0.14)]',
  },
  {
    key: 'content', slug: 'icerik-motoru',
    Icon: FileText,
    title: 'AI İçerik Motoru',
    desc: 'SEO uyumlu makaleler, meta taglar ve brief\'ler yapay zeka ile saniyeler içinde.',
    gradient: 'from-emerald-600/14 via-emerald-500/4 to-transparent',
    border: 'border-emerald-500/18', iconBg: 'bg-emerald-500/14', iconColor: 'text-emerald-400',
    glow: 'bg-emerald-500/8', shadow: 'hover:shadow-[0_20px_48px_rgba(34,197,94,0.1)]',
  },
  {
    key: 'backlink', slug: 'backlink-market',
    Icon: Link2,
    title: 'Backlink Market',
    desc: 'Kaliteli backlink fırsatlarını keşfedin, filtreleyin ve tek tıkla sipariş edin.',
    gradient: 'from-orange-600/14 via-orange-500/4 to-transparent',
    border: 'border-orange-500/18', iconBg: 'bg-orange-500/14', iconColor: 'text-orange-400',
    glow: 'bg-orange-500/8', shadow: 'hover:shadow-[0_20px_48px_rgba(249,115,22,0.1)]',
  },
  {
    key: 'outreach', slug: 'outreach',
    Icon: Mail,
    title: 'Outreach Kampanya',
    desc: 'AI ile kişiselleştirilmiş e-posta şablonları, otomatik takip ve yanıt yönetimi.',
    gradient: 'from-rose-600/14 via-rose-500/4 to-transparent',
    border: 'border-rose-500/18', iconBg: 'bg-rose-500/14', iconColor: 'text-rose-400',
    glow: 'bg-rose-500/8', shadow: 'hover:shadow-[0_20px_48px_rgba(244,63,94,0.1)]',
  },
  {
    key: 'rank',    slug: 'siralama-takibi',
    Icon: BarChart2,
    title: 'Sıralama Takibi',
    desc: 'Günlük pozisyon güncellemeleri ve rakip karşılaştırmasıyla büyümeyi gerçek zamanlı izleyin.',
    gradient: 'from-cyan-600/14 via-cyan-500/4 to-transparent',
    border: 'border-cyan-500/18', iconBg: 'bg-cyan-500/14', iconColor: 'text-cyan-400',
    glow: 'bg-cyan-500/8', shadow: 'hover:shadow-[0_20px_48px_rgba(6,182,212,0.1)]',
  },
  {
    key: 'keyword', slug: 'anahtar-kelime',
    Icon: Hash,
    title: 'Anahtar Kelime Araştırması',
    desc: 'Arama hacmi, zorluk skoru ve rakip analizi ile en değerli kelimeleri bulun.',
    gradient: 'from-yellow-600/14 via-yellow-500/4 to-transparent',
    border: 'border-yellow-500/18', iconBg: 'bg-yellow-500/14', iconColor: 'text-yellow-400',
    glow: 'bg-yellow-500/8', shadow: 'hover:shadow-[0_20px_48px_rgba(234,179,8,0.1)]',
  },
  {
    key: 'competitor', slug: 'rakip-analizi',
    Icon: Users,
    title: 'Rakip Analizi',
    desc: 'Rakiplerinizin trafik kaynaklarını, backlink profilini ve sıralama kazanımlarını takip edin.',
    gradient: 'from-red-600/14 via-red-500/4 to-transparent',
    border: 'border-red-500/18', iconBg: 'bg-red-500/14', iconColor: 'text-red-400',
    glow: 'bg-red-500/8', shadow: 'hover:shadow-[0_24px_64px_rgba(239,68,68,0.1)]',
  },
  {
    key: 'whitelabel', slug: 'white-label',
    Icon: Download,
    title: 'White Label Raporlar',
    desc: 'Markalı PDF ve Excel raporlar oluşturun; ajans müşterilerinize kendi logonuzla sunun.',
    gradient: 'from-teal-600/14 via-teal-500/4 to-transparent',
    border: 'border-teal-500/18', iconBg: 'bg-teal-500/14', iconColor: 'text-teal-400',
    glow: 'bg-teal-500/8', shadow: 'hover:shadow-[0_20px_48px_rgba(20,184,166,0.1)]',
  },
  {
    key: 'multilang', slug: 'cok-dilli-seo',
    Icon: Globe2,
    title: 'Çok Dilli SEO',
    desc: 'Türkçe, İngilizce, Almanca dahil 8 dilde hreflang, çeviri ve uluslararası sıralama takibi.',
    gradient: 'from-blue-600/14 via-blue-500/4 to-transparent',
    border: 'border-blue-500/18', iconBg: 'bg-blue-500/14', iconColor: 'text-blue-400',
    glow: 'bg-blue-500/8', shadow: 'hover:shadow-[0_20px_48px_rgba(59,130,246,0.1)]',
  },
  {
    key: 'autopilot', slug: 'autopilot',
    Icon: Bot,
    title: 'Autopilot',
    desc: 'Tarama, içerik üretimi, backlink bulma ve raporlamayı otomatikleştirin — tek tuşla tam otomasyon.',
    gradient: 'from-violet-600/14 via-violet-500/4 to-transparent',
    border: 'border-violet-500/18', iconBg: 'bg-violet-500/14', iconColor: 'text-violet-400',
    glow: 'bg-violet-500/8', shadow: 'hover:shadow-[0_24px_64px_rgba(139,92,246,0.14)]',
  },
];

/* ── Individual card ── */
function FeatureCard({ f, className = '', localePath, explore }: {
  f: FeatureCard;
  className?: string;
  localePath: (p: string) => string;
  explore: string;
}) {
  return (
    <Link
      href={localePath(`/ozellikler/${f.slug}`)}
      className={`group relative rounded-2xl border ${f.border} bg-gradient-to-br ${f.gradient} p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${f.shadow} ${className}`}
    >
      <div className={`inline-flex p-2.5 rounded-xl ${f.iconBg} mb-4`}>
        <f.Icon className={`h-5 w-5 ${f.iconColor}`} />
      </div>
      <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
      <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
      <div className={`mt-4 inline-flex items-center gap-1 text-xs font-medium ${f.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
        {explore} <ArrowRight className="h-3 w-3" />
      </div>
      <div className={`absolute -bottom-6 -right-6 w-32 h-32 rounded-full ${f.glow} blur-2xl pointer-events-none`} />
    </Link>
  );
}

/* ── Section header ── */
function SectionHeader({ tag, title, subtitle }: { tag: string; title: string; subtitle: string }) {
  return (
    <div className="text-center mb-16">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm px-4 py-1.5 mb-5">
        <span className="text-xs font-medium text-white/50">{tag}</span>
      </div>
      <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">{title}</h2>
      <p className="text-lg text-white/35 max-w-2xl mx-auto">{subtitle}</p>
    </div>
  );
}

export function FeaturesSection() {
  const locale = useLocale();
  const t = useTranslations('featuresSection');
  const localePath = (path: string) => (locale === 'tr' ? path : `/${locale}${path}`);

  const featureTitles: Record<string, string> = {
    seo: t('seo.title'), geo: t('geo.title'), content: t('content.title'),
    backlink: t('backlink.title'), outreach: t('outreach.title'), rank: t('rank.title'),
    keyword: t('keyword.title'), competitor: t('competitor.title'),
    whitelabel: t('whitelabel.title'), multilang: t('multilang.title'), autopilot: t('autopilot.title'),
  };
  const featureDescs: Record<string, string> = {
    seo: t('seo.desc'), geo: t('geo.desc'), content: t('content.desc'),
    backlink: t('backlink.desc'), outreach: t('outreach.desc'), rank: t('rank.desc'),
    keyword: t('keyword.desc'), competitor: t('competitor.desc'),
    whitelabel: t('whitelabel.desc'), multilang: t('multilang.desc'), autopilot: t('autopilot.desc'),
  };

  const withText = FEATURES.map((f) => ({ ...f, title: featureTitles[f.key] ?? f.title, desc: featureDescs[f.key] ?? f.desc }));

  const seo       = withText[0];
  const geo       = withText[1];
  const content   = withText[2];
  const backlink  = withText[3];
  const outreach  = withText[4];
  const rank      = withText[5];
  const keyword   = withText[6];
  const competitor = withText[7];
  const whitelabel = withText[8];
  const multilang  = withText[9];
  const autopilot  = withText[10];

  return (
    <section className="relative py-28 px-4 sm:px-6 lg:px-8" id="ozellikler">
      {/* Section ambient glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-full bg-indigo-800/5 blur-[160px]" />
      </div>

      <div className="mx-auto max-w-7xl">
        {/* ═══ Block 1: Core Features ═══ */}
        <SectionHeader
          tag={t('tag1')}
          title={t('title1')}
          subtitle={t('subtitle1')}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* SEO Tarama — featured 2-col */}
          <Link
            href={localePath(`/ozellikler/${seo.slug}`)}
            className={`group relative lg:col-span-2 rounded-2xl border ${seo.border} bg-gradient-to-br ${seo.gradient} p-8 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${seo.shadow}`}
          >
            <div className={`inline-flex p-3 rounded-xl ${seo.iconBg} mb-5`}>
              <seo.Icon className={`h-6 w-6 ${seo.iconColor}`} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">{seo.title}</h3>
            <p className="text-white/45 leading-relaxed mb-7 max-w-md">{seo.desc}</p>

            {/* Score bars */}
            <div className="rounded-xl border border-white/[0.07] bg-black/25 backdrop-blur-sm p-4 space-y-2.5">
              {[
                { label: t('coreWebVitals'), score: 94 },
                { label: t('structuredData'), score: 78 },
                { label: t('pageSpeed'),      score: 88 },
                { label: t('mobileCompat'),   score: 96 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xs text-white/28 w-28 flex-shrink-0">{item.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500/80 to-blue-400/60"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-indigo-400/60 w-8 text-right">{item.score}</span>
                </div>
              ))}
            </div>

            <div className={`mt-6 inline-flex items-center gap-1.5 text-xs font-medium ${seo.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
              {t('more')} <ArrowRight className="h-3 w-3" />
            </div>
            <div className={`absolute -bottom-12 -right-12 w-60 h-60 rounded-full ${seo.glow} blur-3xl pointer-events-none`} />
          </Link>

          {/* GEO — tall 1-col */}
          <Link
            href={localePath(`/ozellikler/${geo.slug}`)}
            className={`group relative rounded-2xl border ${geo.border} bg-gradient-to-br ${geo.gradient} p-7 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${geo.shadow}`}
          >
            <div className={`inline-flex p-3 rounded-xl ${geo.iconBg} mb-5`}>
              <geo.Icon className={`h-6 w-6 ${geo.iconColor}`} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{geo.title}</h3>
            <p className="text-white/45 text-sm leading-relaxed mb-6">{geo.desc}</p>

            <div className="space-y-2.5">
              {[
                { name: 'ChatGPT',     v: 89 },
                { name: 'Gemini',      v: 67 },
                { name: 'Perplexity',  v: 54 },
                { name: 'Claude',      v: 37 },
                { name: 'AI Overview', v: 28 },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 flex-shrink-0" />
                  <span className="text-xs text-white/28 w-20">{p.name}</span>
                  <div className="flex-1 h-1 rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-500/65 to-indigo-400/45" style={{ width: `${p.v}%` }} />
                  </div>
                  <span className="text-[10px] text-white/22">{p.v}</span>
                </div>
              ))}
            </div>

            <div className={`mt-6 inline-flex items-center gap-1.5 text-xs font-medium ${geo.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
              {t('more')} <ArrowRight className="h-3 w-3" />
            </div>
            <div className={`absolute -bottom-8 -right-8 w-44 h-44 rounded-full ${geo.glow} blur-3xl pointer-events-none`} />
          </Link>
        </div>

        {/* Row 2: 3 equal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <FeatureCard f={content}  localePath={localePath} explore={t('explore')} />
          <FeatureCard f={backlink} localePath={localePath} explore={t('explore')} />
          <FeatureCard f={outreach} localePath={localePath} explore={t('explore')} />
        </div>

        {/* Row 3: Rank — wide */}
        <Link
          href={localePath(`/ozellikler/${rank.slug}`)}
          className={`group relative rounded-2xl border ${rank.border} bg-gradient-to-r ${rank.gradient} p-7 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 ${rank.shadow} mb-4 block`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className={`inline-flex p-3 rounded-xl ${rank.iconBg} flex-shrink-0`}>
              <rank.Icon className={`h-6 w-6 ${rank.iconColor}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">{rank.title}</h3>
              <p className="text-white/38 text-sm leading-relaxed">{rank.desc}</p>
            </div>
            {/* Mini bar chart */}
            <div className="flex items-end gap-1 h-10 flex-shrink-0">
              {[28,40,35,52,48,64,58,74,68,86].map((h, i) => (
                <div key={i} className="w-3 rounded-sm bg-cyan-500/35 group-hover:bg-cyan-400/55 transition-colors duration-300"
                  style={{ height: `${h}%`, transitionDelay: `${i * 20}ms` }} />
              ))}
            </div>
            <div className={`flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-medium ${rank.iconColor}`}>
              {t('view')} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>

        {/* ═══ Block 2: Advanced Features ═══ */}
        <div className="mt-20">
          <SectionHeader
            tag={t('tag2')}
            title={t('title2')}
            subtitle={t('subtitle2')}
          />

          {/* Row 4: Keyword + Competitor (1+2) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Keyword */}
            <Link
              href={localePath(`/ozellikler/${keyword.slug}`)}
              className={`group relative rounded-2xl border ${keyword.border} bg-gradient-to-br ${keyword.gradient} p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${keyword.shadow}`}
            >
              <div className={`inline-flex p-2.5 rounded-xl ${keyword.iconBg} mb-4`}>
                <keyword.Icon className={`h-5 w-5 ${keyword.iconColor}`} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{keyword.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed mb-5">{keyword.desc}</p>
              {/* Keyword cloud */}
              <div className="flex flex-wrap gap-1.5">
                {['seo aracı', 'backlink', 'ai seo', 'geo', 'trafik'].map((kw) => (
                  <span key={kw} className="text-[9px] rounded-md px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/18 text-yellow-400/70">
                    {kw}
                  </span>
                ))}
              </div>
              <div className={`mt-4 inline-flex items-center gap-1 text-xs font-medium ${keyword.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                {t('explore')} <ArrowRight className="h-3 w-3" />
              </div>
              <div className={`absolute -bottom-6 -right-6 w-32 h-32 rounded-full ${keyword.glow} blur-2xl pointer-events-none`} />
            </Link>

            {/* Competitor — 2-col */}
            <Link
              href={localePath(`/ozellikler/${competitor.slug}`)}
              className={`group relative lg:col-span-2 rounded-2xl border ${competitor.border} bg-gradient-to-br ${competitor.gradient} p-8 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${competitor.shadow}`}
            >
              <div className={`inline-flex p-3 rounded-xl ${competitor.iconBg} mb-5`}>
                <competitor.Icon className={`h-6 w-6 ${competitor.iconColor}`} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{competitor.title}</h3>
              <p className="text-white/45 leading-relaxed mb-7 max-w-md">{competitor.desc}</p>

              {/* Competitor comparison bars */}
              <div className="rounded-xl border border-white/[0.07] bg-black/25 p-4 space-y-3">
                <div className="text-[10px] text-white/25 uppercase tracking-widest mb-3">{t('seoScoreComparison')}</div>
                {[
                  { label: t('yourSite'), score: 87, color: 'bg-emerald-500/70', textColor: 'text-emerald-400', isYou: true },
                  { label: 'Rakip A',    score: 65, color: 'bg-red-500/40',     textColor: 'text-white/30', isYou: false },
                  { label: 'Rakip B',    score: 52, color: 'bg-red-500/30',     textColor: 'text-white/25', isYou: false },
                  { label: 'Rakip C',    score: 71, color: 'bg-orange-500/40',  textColor: 'text-white/30', isYou: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className={`text-xs w-28 flex-shrink-0 ${item.textColor} ${item.isYou ? 'font-semibold' : ''}`}>{item.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                      <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${item.score}%` }} />
                    </div>
                    <span className={`text-xs font-mono w-8 text-right ${item.textColor}`}>{item.score}</span>
                  </div>
                ))}
              </div>

              <div className={`mt-6 inline-flex items-center gap-1.5 text-xs font-medium ${competitor.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                {t('more')} <ArrowRight className="h-3 w-3" />
              </div>
              <div className={`absolute -bottom-12 -right-12 w-56 h-56 rounded-full ${competitor.glow} blur-3xl pointer-events-none`} />
            </Link>
          </div>

          {/* Row 5: White Label + Multilang + (placeholder for balance) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* White Label */}
            <Link
              href={localePath(`/ozellikler/${whitelabel.slug}`)}
              className={`group relative rounded-2xl border ${whitelabel.border} bg-gradient-to-br ${whitelabel.gradient} p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${whitelabel.shadow}`}
            >
              <div className={`inline-flex p-2.5 rounded-xl ${whitelabel.iconBg} mb-4`}>
                <whitelabel.Icon className={`h-5 w-5 ${whitelabel.iconColor}`} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{whitelabel.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed mb-5">{whitelabel.desc}</p>
              {/* Report preview mockup */}
              <div className="rounded-lg border border-white/[0.07] bg-black/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0" />
                  <div className="text-[9px] text-white/30 truncate">Müşteri Adı — SEO Raporu</div>
                </div>
                <div className="h-px bg-white/[0.05] mb-2" />
                <div className="flex gap-2">
                  {['PDF', 'Excel', 'WhatsApp'].map((f) => (
                    <span key={f} className="text-[8px] rounded px-1.5 py-0.5 bg-teal-500/10 border border-teal-500/15 text-teal-400/60">{f}</span>
                  ))}
                </div>
              </div>
              <div className={`mt-4 inline-flex items-center gap-1 text-xs font-medium ${whitelabel.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                {t('explore')} <ArrowRight className="h-3 w-3" />
              </div>
              <div className={`absolute -bottom-6 -right-6 w-32 h-32 rounded-full ${whitelabel.glow} blur-2xl pointer-events-none`} />
            </Link>

            {/* Multilang */}
            <Link
              href={localePath(`/ozellikler/${multilang.slug}`)}
              className={`group relative rounded-2xl border ${multilang.border} bg-gradient-to-br ${multilang.gradient} p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${multilang.shadow}`}
            >
              <div className={`inline-flex p-2.5 rounded-xl ${multilang.iconBg} mb-4`}>
                <multilang.Icon className={`h-5 w-5 ${multilang.iconColor}`} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{multilang.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed mb-5">{multilang.desc}</p>
              {/* Language badges */}
              <div className="flex flex-wrap gap-1.5">
                {['🇹🇷 TR', '🇬🇧 EN', '🇩🇪 DE', '🇫🇷 FR', '🇪🇸 ES', '🇸🇦 AR', '🇷🇺 RU', '🇮🇳 HI'].map((lang) => (
                  <span key={lang} className="text-[9px] rounded-md px-2 py-0.5 bg-blue-500/10 border border-blue-500/15 text-blue-400/60">
                    {lang}
                  </span>
                ))}
              </div>
              <div className={`mt-4 inline-flex items-center gap-1 text-xs font-medium ${multilang.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                {t('explore')} <ArrowRight className="h-3 w-3" />
              </div>
              <div className={`absolute -bottom-6 -right-6 w-32 h-32 rounded-full ${multilang.glow} blur-2xl pointer-events-none`} />
            </Link>

            {/* Quick stats card */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-white/25 uppercase tracking-widest mb-5">{t('platformStats')}</div>
                <div className="space-y-4">
                  {[
                    { label: t('activeProjects'),  value: '500+',   color: 'text-indigo-400' },
                    { label: t('keywordTracking'),  value: '1M+',   color: 'text-emerald-400' },
                    { label: t('aiMentions'),       value: '4M+',    color: 'text-purple-400' },
                    { label: t('customerRating'),   value: '4.9/5', color: 'text-yellow-400' },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className="text-sm text-white/35">{s.label}</span>
                      <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 6: Autopilot — full width */}
          <Link
            href={localePath(`/ozellikler/${autopilot.slug}`)}
            className={`group relative rounded-2xl border ${autopilot.border} bg-gradient-to-r ${autopilot.gradient} p-8 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 ${autopilot.shadow} block`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
              <div className="flex-shrink-0">
                <div className={`inline-flex p-3 rounded-xl ${autopilot.iconBg} mb-4 lg:mb-0`}>
                  <autopilot.Icon className={`h-6 w-6 ${autopilot.iconColor}`} />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">{autopilot.title}</h3>
                <p className="text-white/40 leading-relaxed">{autopilot.desc}</p>
              </div>
              {/* Workflow visualization */}
              <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap flex-shrink-0">
                {[
                  { label: t('scan'),        color: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
                  { label: '→',              color: 'text-white/20 border-transparent bg-transparent text-sm font-bold' },
                  { label: t('aiAnalysis'),  color: 'border-purple-500/30 bg-purple-500/10 text-purple-300' },
                  { label: '→',              color: 'text-white/20 border-transparent bg-transparent text-sm font-bold' },
                  { label: t('contentStep'), color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
                  { label: '→',              color: 'text-white/20 border-transparent bg-transparent text-sm font-bold' },
                  { label: t('report'),      color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' },
                ].map((step, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${step.color}`}
                  >
                    {step.label}
                  </div>
                ))}
                <div className="ml-2 flex items-center gap-1 text-xs text-violet-400/60">
                  <ChevronUp className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">{t('automated')}</span>
                </div>
              </div>
              <div className={`flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold ${autopilot.iconColor}`}>
                {t('start')} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
            <div className={`absolute -bottom-12 right-20 w-64 h-64 rounded-full ${autopilot.glow} blur-3xl pointer-events-none`} />
          </Link>
        </div>
      </div>
    </section>
  );
}
