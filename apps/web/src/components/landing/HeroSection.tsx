'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

/* ─── SEO-themed trend line background ─── */
function SeoTrendBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1400 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="trendGrad1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
          <stop offset="30%" stopColor="#6366f1" stopOpacity="0.6" />
          <stop offset="70%" stopColor="#a855f7" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="trendGrad2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
          <stop offset="40%" stopColor="#22c55e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Main upward SEO trend curve */}
      <path
        d="M-50,520 C150,510 250,460 380,400 C480,352 560,290 680,230 C780,178 900,130 1050,90 C1150,62 1280,50 1450,45"
        stroke="url(#trendGrad1)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Secondary subtle trend */}
      <path
        d="M-50,560 C200,555 350,520 500,480 C620,448 720,410 870,360 C970,325 1100,300 1450,280"
        stroke="url(#trendGrad2)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        opacity="0.3"
      />

      {/* Data points on main trend */}
      {([[380,400],[680,230],[1050,90]] as [number,number][]).map(([x, y], i) => (
        <g key={i} filter="url(#glow)">
          <circle cx={x} cy={y} r="3.5" fill="#6366f1" opacity="0.7" />
          <circle cx={x} cy={y} r="7" fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
        </g>
      ))}

      {/* Subtle vertical grid lines */}
      {[200, 400, 600, 800, 1000, 1200].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="600"
          stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
      ))}
      {/* Horizontal grid lines */}
      {[150, 300, 450].map((y) => (
        <line key={y} x1="0" y1={y} x2="1400" y2={y}
          stroke="rgba(255,255,255,0.018)" strokeWidth="1" />
      ))}
    </svg>
  );
}

/* ─── Floating metric badge ─── */
interface MetricBadgeProps {
  className?: string;
  color: string;
  label: string;
  value: string;
  sub?: string;
  bars?: number[];
  delay?: string;
}
function MetricBadge({ className = '', color, label, value, sub, bars, delay = '0s' }: MetricBadgeProps) {
  const colorMap: Record<string, { border: string; bg: string; text: string; bar: string }> = {
    emerald: { border: 'border-emerald-500/25', bg: 'bg-emerald-950/60',  text: 'text-emerald-300', bar: 'bg-emerald-500/50' },
    indigo:  { border: 'border-indigo-500/25',  bg: 'bg-indigo-950/60',   text: 'text-indigo-300',  bar: 'bg-indigo-500/50'  },
    purple:  { border: 'border-purple-500/25',  bg: 'bg-purple-950/60',   text: 'text-purple-300',  bar: 'bg-purple-500/50'  },
  };
  const c = colorMap[color] ?? colorMap.indigo;

  return (
    <div
      className={`hidden xl:block absolute ${className} rounded-2xl border ${c.border} ${c.bg} backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/60 animate-badge-pop`}
      style={{ animationDelay: delay }}
    >
      <div className={`text-[9px] font-semibold uppercase tracking-widest mb-1 ${c.text} opacity-60`}>{label}</div>
      <div className={`text-base font-bold ${c.text}`}>{value}</div>
      {sub && <div className="text-[10px] text-white/25 mt-0.5">{sub}</div>}
      {bars && (
        <div className="mt-2 flex items-end gap-0.5 h-6">
          {bars.map((h, i) => (
            <div key={i} className={`flex-1 rounded-sm ${c.bar}`} style={{ height: `${h}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard mockup ─── */
function DashboardMockup() {
  return (
    <div className="relative mx-auto max-w-5xl mt-20 px-4 sm:px-6">
      {/* Halo glow */}
      <div className="absolute -inset-8 rounded-3xl bg-gradient-to-b from-indigo-600/18 via-purple-600/8 to-transparent blur-3xl pointer-events-none" />

      {/* Browser chrome */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-[#0c0c13] overflow-hidden shadow-[0_56px_100px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
        {/* Titlebar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]/80" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]/80" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]/80" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="rounded-lg bg-white/[0.05] border border-white/[0.08] px-4 py-1 text-[11px] text-white/22 flex items-center gap-2 w-72 justify-center">
              🔒 app.funbreakseo.com/dashboard
            </div>
          </div>
          <div className="w-14 flex-shrink-0" />
        </div>

        <div className="flex" style={{ height: 300 }}>
          {/* Sidebar */}
          <div className="w-44 border-r border-white/[0.04] p-3 flex-shrink-0 hidden sm:block">
            <div className="flex items-center gap-2 px-2 mb-5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 flex-shrink-0" />
              <span className="text-[9px] font-black text-white/30 tracking-widest uppercase">FunBreak</span>
            </div>
            {[
              { l: 'Dashboard',  a: true  },
              { l: 'SEO Tarama', a: false },
              { l: 'Kelimeler',  a: false },
              { l: 'İçerik AI',  a: false },
              { l: 'GEO & AI',   a: false },
              { l: 'Backlinks',  a: false },
            ].map((item) => (
              <div
                key={item.l}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 mb-0.5 text-[10px] ${
                  item.a ? 'bg-indigo-500/15 text-indigo-300' : 'text-white/18'
                }`}
              >
                <div className={`w-2 h-2 rounded-sm flex-shrink-0 ${item.a ? 'bg-indigo-400' : 'bg-white/8'}`} />
                {item.l}
              </div>
            ))}
          </div>

          {/* Main area */}
          <div className="flex-1 p-4 overflow-hidden">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
              {[
                { l: 'SEO Skoru',       v: '87',    s: '+12 bu ay',    dot: 'bg-indigo-400' },
                { l: 'Organik Trafik',  v: '12.4K', s: '+34% artış',   dot: 'bg-emerald-400' },
                { l: 'GEO Skoru',       v: '72',    s: '4 AI platform', dot: 'bg-purple-400' },
                { l: 'Sıralamalar',     v: '248',   s: '67 ilk sayfa',  dot: 'bg-blue-400' },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <div className="text-[9px] text-white/25 uppercase tracking-wide">{s.l}</div>
                  </div>
                  <div className="text-base font-bold text-white">{s.v}</div>
                  <div className="text-[9px] text-emerald-400 mt-0.5">{s.s}</div>
                </div>
              ))}
            </div>

            {/* Keywords + GEO */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <div className="text-[9px] font-bold text-white/20 mb-2.5 uppercase tracking-widest">Anahtar Kelimeler</div>
                <div className="space-y-2">
                  {[
                    { kw: 'seo aracı',        pos: 3, ch: '+5',  p: 88  },
                    { kw: 'ai görünürlük',     pos: 7, ch: '+12', p: 65  },
                    { kw: 'backlink analiz',   pos: 2, ch: '+8',  p: 94  },
                    { kw: 'geo optimizasyon',  pos: 5, ch: '+3',  p: 75  },
                  ].map((r) => (
                    <div key={r.kw} className="flex items-center gap-2">
                      <span className="text-[9px] text-white/22 w-24 truncate">{r.kw}</span>
                      <div className="flex-1 h-1 rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500/70 to-purple-500/50"
                          style={{ width: `${r.p}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-white/22">#{r.pos}</span>
                      <span className="text-[9px] text-emerald-400 w-7 text-right font-medium">{r.ch}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-purple-500/22 bg-purple-500/[0.06] p-3">
                <div className="text-[9px] text-purple-400/70 mb-1.5 uppercase tracking-widest font-bold">GEO</div>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-xl font-bold text-white">72</span>
                  <span className="text-[9px] text-white/18 mb-0.5">/100</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] mb-3">
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: '72%' }} />
                </div>
                {['ChatGPT ✓', 'Gemini ✓', 'Perplexity ✓', 'Claude ✓'].map((ai) => (
                  <div key={ai} className="flex items-center gap-1.5 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 flex-shrink-0" />
                    <span className="text-[9px] text-white/22">{ai}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -right-4 sm:-right-10 top-[28%] rounded-2xl border border-emerald-500/28 bg-[#061009]/90 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/60">
        <div className="text-[10px] text-emerald-400/55 mb-0.5 font-semibold">Organik trafik</div>
        <div className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" /> +180%
        </div>
      </div>
      <div className="absolute -left-4 sm:-left-10 bottom-[28%] rounded-2xl border border-purple-500/28 bg-[#0d0814]/90 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/60">
        <div className="text-[10px] text-purple-400/55 mb-0.5 font-semibold">AI Mentions</div>
        <div className="text-sm font-bold text-purple-300">247 tespit</div>
      </div>
    </div>
  );
}

/* ─── Hero section ─── */
export function HeroSection() {
  const t = useTranslations('hero');
  const locale = useLocale();
  const router = useRouter();
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);

  const localePath = (p: string) => (locale === 'tr' ? p : `/${locale}${p}`);

  async function handleAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    setLoading(true);
    router.push(`${localePath('/ucretsiz-analiz')}?domain=${encodeURIComponent(domain.trim())}`);
  }

  return (
    <section className="relative overflow-hidden pt-28 pb-0">
      {/* ── Background ── */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* SEO trend line SVG */}
        <SeoTrendBackground />

        {/* Line grid overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
        {/* Center-focus vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_60%_at_50%_-5%,transparent_35%,rgba(9,9,11,0.8)_75%)]" />

        {/* Main center orb */}
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[1200px] h-[750px] rounded-full bg-indigo-600/28 blur-[170px] animate-pulse-glow" />
        {/* Right purple orb */}
        <div className="absolute top-[10%] right-[-12%] w-[600px] h-[600px] rounded-full bg-purple-700/22 blur-[140px] animate-float" />
        {/* Left blue-teal orb */}
        <div className="absolute top-[20%] left-[-8%] w-[450px] h-[450px] rounded-full bg-blue-700/16 blur-[110px] animate-float-delayed" />
        {/* Bottom emerald glow — growth metaphor */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full bg-emerald-900/12 blur-[120px]" />

        {/* Bottom fade to page bg */}
        <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-[#09090b] to-transparent" />
      </div>

      {/* ── Floating metric badges (desktop only) ── */}
      <MetricBadge
        className="left-[3%] top-[28%] -rotate-3 animate-float-delayed"
        color="emerald"
        label="Organik Trafik"
        value="+180% ↑"
        sub="Son 3 ay"
        bars={[25,38,32,48,44,60,55,72,68,88]}
        delay="0.3s"
      />
      <MetricBadge
        className="right-[3%] top-[22%] rotate-2 animate-float"
        color="indigo"
        label="Sıralama"
        value="#1 Pozisyon"
        sub='"seo aracı" — Google TR'
        delay="0.5s"
      />
      <MetricBadge
        className="right-[4%] bottom-[22%] -rotate-1 animate-float-b"
        color="purple"
        label="AI Mentions"
        value="247 tespit"
        sub="ChatGPT · Gemini · Perplexity"
        delay="0.7s"
      />

      {/* ── Content ── */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-sm px-4 py-1.5 mb-8">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-xs font-medium text-indigo-300">{t('badge')}</span>
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-[5.25rem] font-bold tracking-tight leading-[1.04] mb-7">
          <span className="text-white">{t('title')} </span>
          <span className="gradient-text">{t('titleHighlight')}</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto max-w-2xl text-lg sm:text-xl text-white/40 mb-10 leading-relaxed">
          {t('subtitle')}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            href={localePath('/kayit')}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white transition-all duration-200 hover:bg-indigo-500 shadow-[0_0_32px_rgba(99,102,241,0.45)] hover:shadow-[0_0_56px_rgba(99,102,241,0.65)] hover:-translate-y-0.5"
          >
            {t('cta')}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href={localePath('/ucretsiz-analiz')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/14 bg-white/[0.05] px-8 py-3.5 text-base font-semibold text-white/60 backdrop-blur-sm hover:bg-white/[0.09] hover:text-white hover:border-white/25 transition-all duration-200"
          >
            {t('ctaSecondary')}
          </Link>
        </div>

        <p className="text-xs text-white/18 mb-10">{t('freeTrial')}</p>

        {/* Audit input — pill style */}
        <div className="mx-auto max-w-xl">
          <p className="text-[11px] font-bold text-white/22 mb-3 uppercase tracking-widest">{t('freeAudit')}</p>
          <form
            onSubmit={handleAudit}
            className="flex gap-2 p-1.5 rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(99,102,241,0.1)]"
          >
            <div className="flex-1 relative min-w-0">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/18 text-sm select-none pointer-events-none">
                https://
              </span>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder={t('freeAuditPlaceholder')}
                className="w-full bg-transparent pl-[68px] pr-3 py-2.5 text-sm text-white placeholder-white/16 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-[0_0_18px_rgba(99,102,241,0.35)]"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                t('freeAuditBtn')
              )}
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {[
            { stat: '500+',  label: 'Aktif proje'           },
            { stat: '1M+',   label: 'Takip edilen kelime'   },
            { stat: '50M+',  label: 'Analiz edilen sayfa'   },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              {i > 0 && <div className="hidden sm:block w-px h-6 bg-white/8" />}
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{item.stat}</div>
                <div className="text-xs text-white/22 mt-0.5">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard mockup */}
      <DashboardMockup />

      {/* Section fade */}
      <div className="relative z-10 h-40 bg-gradient-to-b from-transparent to-[#09090b]" />
    </section>
  );
}
