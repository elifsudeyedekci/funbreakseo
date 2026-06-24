export function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Sitenizi Ekleyin',
      desc: 'Domain adresinizi girin, ülke ve hedef dil seçin. Otomatik teknik tarama 5 dakikada tamamlanır.',
    },
    {
      num: '02',
      title: 'Yapay Zeka Analiz Eder',
      desc: '150+ kural ile SEO sorunlarını tespit eder, GEO görünürlüğünüzü ölçer, rakiplerinizi izler.',
    },
    {
      num: '03',
      title: 'Büyüyün',
      desc: 'AI içerik önerileri, backlink fırsatları ve outreach kampanyaları ile organik büyümenizi hızlandırın.',
    },
  ];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 border-y border-white/5">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Nasıl Çalışır?</h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">Üç adımda platformu kullanmaya başlayın</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

          {steps.map((step, i) => (
            <div key={i} className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/20 mb-6 text-2xl font-bold gradient-text">
                {step.num}
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-white/50 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
