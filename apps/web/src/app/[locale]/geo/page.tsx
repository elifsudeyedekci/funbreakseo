import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const platforms = [
  { name: 'ChatGPT', company: 'OpenAI', share: '65%', color: 'emerald' },
  { name: 'Gemini', company: 'Google', share: '20%', color: 'blue' },
  { name: 'Perplexity', company: 'Perplexity AI', share: '8%', color: 'purple' },
  { name: 'Claude', company: 'Anthropic', share: '4%', color: 'orange' },
  { name: 'Google AI Overview', company: 'Google', share: '2%', color: 'yellow' },
  { name: 'Google AI Mode', company: 'Google', share: '1%', color: 'indigo' },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'geoLandingPage' });
  return {
    title: `GEO - ${t('titleHighlight')} | FunBreak SEO`,
    description: t('subtitle'),
  };
}

export default async function GeoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'geoLandingPage' });

  const howItems = t.raw('howItems') as Array<{ title: string; desc: string }>;

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-400 mb-4">
              {t('badge')}
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              {t('title')}<br />
              <span style={{ background: 'linear-gradient(135deg, #A371F7, #5B8DEF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('titleHighlight')}
              </span>
            </h1>
            <p className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
              {t('subtitle')}
            </p>
          </div>

          {/* Pillar content */}
          <article className="prose prose-invert max-w-none mb-12">
            <h2>{t('whatTitle')}</h2>
            <p>{t('whatBody')}</p>
            <h2>{t('whyTitle')}</h2>
            <p>{t('whyBody')}</p>
            <h2>{t('howTitle')}</h2>
            <p>{t('howBody')}</p>
            <ul>
              {howItems.map((item, i) => (
                <li key={i}><strong>{item.title}</strong> {item.desc}</li>
              ))}
            </ul>
          </article>

          {/* Platforms */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">{t('platformsTitle')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {platforms.map((p) => (
                <div key={p.name} className="rounded-2xl border border-white/10 bg-white/2 p-4 text-center">
                  <div className="text-lg font-bold text-white mb-1">{p.name}</div>
                  <div className="text-xs text-white/40 mb-2">{p.company}</div>
                  <div className={`text-sm font-semibold text-${p.color}-400`}>{t('marketShare')}: {p.share}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Link href="/kayit" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white hover:opacity-90 transition-all">
              {t('cta')}
            </Link>
            <p className="text-xs text-white/30 mt-3">{t('ctaNote')}</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
