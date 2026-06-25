'use client';
import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';

const AVATAR_STYLES = [
  { grad: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/30' },
  { grad: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/30' },
  { grad: 'from-orange-500 to-rose-600', shadow: 'shadow-orange-500/30' },
];

export function TestimonialsSection() {
  const t = useTranslations('testimonials');
  const items = t.raw('items') as Array<{ name: string; role: string; company: string; text: string }>;

  return (
    <section className="relative py-28 px-4 sm:px-6 lg:px-8">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'AggregateRating',
            itemReviewed: { '@type': 'SoftwareApplication', name: 'FunBreak SEO' },
            ratingValue: '4.9',
            reviewCount: items.length.toString(),
            bestRating: '5',
            worstRating: '1',
          }),
        }}
      />

      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] rounded-full bg-white/[0.02] blur-[80px]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm px-4 py-1.5 mb-5">
            <span className="text-xs font-medium text-white/50">{t('badge')}</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            {t('title')}
          </h2>
          <div className="flex items-center justify-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="text-white/30 text-sm">{t('rating')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {items.map((item, i) => {
            const av = AVATAR_STYLES[i % AVATAR_STYLES.length];
            const initials = item.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <article
                key={i}
                className="relative rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-sm p-7 flex flex-col hover:border-white/12 hover:bg-white/[0.035] transition-all duration-300 group overflow-hidden"
                itemScope
                itemType="https://schema.org/Review"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                <div className="text-6xl font-serif text-white/6 leading-none mb-4 select-none" aria-hidden="true">&ldquo;</div>
                <div className="flex items-center gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-white/50 text-sm leading-relaxed flex-1 mb-7" itemProp="reviewBody">
                  {item.text}
                </p>
                <div className="flex items-center gap-3 pt-5 border-t border-white/[0.06]">
                  <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${av.grad} flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-lg ${av.shadow}`}>
                    {initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white" itemProp="author">{item.name}</div>
                    <div className="text-xs text-white/30">{item.role} · {item.company}</div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
