import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Ahmet Yılmaz',
    role: 'Dijital Pazarlama Müdürü',
    company: 'TechStart A.Ş.',
    text: 'FunBreak SEO sayesinde 3 ayda organik trafiğimiz %180 arttı. GEO özelliği sayesinde ChatGPT\'de rakiplerimizin önüne geçtik. Tek platform olması büyük avantaj.',
    rating: 5,
    avatar: 'AY',
  },
  {
    name: 'Selin Kaya',
    role: 'Kurucu',
    company: 'SEO Ajans Kaya',
    text: 'Ajans olarak 20+ müşteri yönetiyoruz. White-label raporlar ve multi-proje yönetimi mükemmel. AI içerik motoru zaman tasarrufunu inanılmaz artırdı.',
    rating: 5,
    avatar: 'SK',
  },
  {
    name: 'Murat Demir',
    role: 'E-ticaret Yöneticisi',
    company: 'Moda Butik',
    text: 'Backlink market ve outreach özellikleri çok değerli. Eskiden ayrı araçlar için 3x para ödüyorduk, şimdi hepsi tek yerde ve çok daha ucuz.',
    rating: 5,
    avatar: 'MD',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white/2">
      {/* JSON-LD schema for reviews */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'AggregateRating',
            itemReviewed: {
              '@type': 'SoftwareApplication',
              name: 'FunBreak SEO',
            },
            ratingValue: '4.9',
            reviewCount: testimonials.length.toString(),
            bestRating: '5',
            worstRating: '1',
          }),
        }}
      />

      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Müşterilerimiz Ne Diyor?
          </h2>
          <div className="flex items-center justify-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="text-white/50">4.9/5 ortalama puan, 200+ değerlendirme</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <article
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
              itemScope
              itemType="https://schema.org/Review"
            >
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p
                className="text-white/70 text-sm leading-relaxed mb-6"
                itemProp="reviewBody"
              >
                &quot;{t.text}&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white" itemProp="author">
                    {t.name}
                  </div>
                  <div className="text-xs text-white/40">
                    {t.role}, {t.company}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
