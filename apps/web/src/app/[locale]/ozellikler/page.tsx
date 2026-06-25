import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ArrowRight, Search, Brain, FileText, Link2, Mail, BarChart2, Hash, Users, Download, Globe2, Bot } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Tüm Özellikler | FunBreak SEO',
  description: 'FunBreak SEO platformunun tüm özellikleri — teknik SEO, GEO/AI görünürlük, içerik üretimi, backlink, outreach, sıralama takibi ve daha fazlası.',
};

const categories = [
  {
    label: 'SEO & Analiz',
    color: 'text-indigo-400',
    borderColor: 'border-indigo-500/20',
    features: [
      {
        slug: 'seo-tarama',
        Icon: Search,
        title: 'SEO Tarama',
        desc: '150+ teknik kontrol, Core Web Vitals, crawl hataları ve hız analizi tek tıkla. Her sorun için önceliklendirilmiş düzeltme rehberi.',
        tags: ['150+ Kural', 'Core Web Vitals', 'Otomatik'],
        iconColor: 'text-indigo-400',
        iconBg: 'bg-indigo-500/12',
      },
      {
        slug: 'siralama-takibi',
        Icon: BarChart2,
        title: 'Sıralama Takibi',
        desc: "Google ve Bing'deki anahtar kelime pozisyonlarını günlük izleyin. Rakip karşılaştırması, trend grafikleri ve anlık uyarılar.",
        tags: ['Günlük Güncelleme', 'Rakip Analizi', 'Lokasyon'],
        iconColor: 'text-indigo-400',
        iconBg: 'bg-indigo-500/12',
      },
      {
        slug: 'anahtar-kelime',
        Icon: Hash,
        title: 'Anahtar Kelime Araştırması',
        desc: 'Arama hacmi, zorluk skoru ve rakip analizi ile en değerli anahtar kelimeleri keşfedin. Kümeleme ve önceliklendirme dahil.',
        tags: ['Hacim & CPC', 'Zorluk Skoru', 'Kümeleme'],
        iconColor: 'text-yellow-400',
        iconBg: 'bg-yellow-500/12',
      },
      {
        slug: 'rakip-analizi',
        Icon: Users,
        title: 'Rakip Analizi',
        desc: 'Rakiplerinizin organik trafik kaynakları, sıralama kazanımları ve backlink profilleri. Otomatik uyarılarla hiçbir hareketi kaçırmayın.',
        tags: ['Trafik Analizi', 'İçerik Boşluğu', 'Uyarılar'],
        iconColor: 'text-red-400',
        iconBg: 'bg-red-500/12',
      },
    ],
  },
  {
    label: 'GEO & Yapay Zeka',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/20',
    features: [
      {
        slug: 'geo-ai-gorunurluk',
        Icon: Brain,
        title: 'GEO / AI Görünürlük',
        desc: 'ChatGPT, Gemini, Perplexity, Claude ve Google AI Mode\'da markanızın anılma ve citation oranını izleyin. GEO stratejinizi veriye dayalı şekillendirin.',
        tags: ['6 AI Platformu', 'Mention Takibi', 'GEO Raporu'],
        iconColor: 'text-purple-400',
        iconBg: 'bg-purple-500/12',
      },
      {
        slug: 'autopilot',
        Icon: Bot,
        title: 'Autopilot',
        desc: 'Tarama, AI içerik üretimi, backlink tespiti ve rapor gönderimini tek akışta otomatikleştirin. Siz büyümeye odaklanın, platform halleder.',
        tags: ['Tam Otomasyon', 'İş Akışı', 'Zamanlama'],
        iconColor: 'text-violet-400',
        iconBg: 'bg-violet-500/12',
      },
    ],
  },
  {
    label: 'İçerik & Üretim',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    features: [
      {
        slug: 'icerik-motoru',
        Icon: FileText,
        title: 'AI İçerik Motoru',
        desc: 'GPT-4o destekli SEO uyumlu blog yazıları, meta taglar, ürün açıklamaları ve landing page metinleri. E-E-A-T uyumlu, 8 dil destekli.',
        tags: ['GPT-4o', 'E-E-A-T', '8 Dil'],
        iconColor: 'text-emerald-400',
        iconBg: 'bg-emerald-500/12',
      },
      {
        slug: 'cok-dilli-seo',
        Icon: Globe2,
        title: 'Çok Dilli SEO',
        desc: '8 dilde hreflang doğrulama, otomatik çeviri önerileri ve ülke bazlı sıralama takibi. Küresel pazara açılın.',
        tags: ['8 Dil', 'Hreflang', 'Ülke Bazlı'],
        iconColor: 'text-blue-400',
        iconBg: 'bg-blue-500/12',
      },
    ],
  },
  {
    label: 'Backlink & Outreach',
    color: 'text-orange-400',
    borderColor: 'border-orange-500/20',
    features: [
      {
        slug: 'backlink-market',
        Icon: Link2,
        title: 'Backlink Market',
        desc: 'DR/DA ve tematik uyum filtresi ile Türkiye\'nin en büyük backlink pazarında kaliteli link bulun ve sipariş edin. Manuel onay güvencesi.',
        tags: ['DR/DA Filtre', 'Manuel Onay', 'Tematik Uyum'],
        iconColor: 'text-orange-400',
        iconBg: 'bg-orange-500/12',
      },
      {
        slug: 'outreach',
        Icon: Mail,
        title: 'Outreach Kampanya',
        desc: 'AI ile kişiselleştirilmiş e-posta şablonları, otomatik takip dizileri ve yanıt yönetimi. Konuk yazarlık ve link kampanyaları için hazır şablonlar.',
        tags: ['AI Şablon', 'Oto Takip', 'CRM Entegrasyonu'],
        iconColor: 'text-rose-400',
        iconBg: 'bg-rose-500/12',
      },
    ],
  },
  {
    label: 'Raporlama & Ajans',
    color: 'text-teal-400',
    borderColor: 'border-teal-500/20',
    features: [
      {
        slug: 'white-label',
        Icon: Download,
        title: 'White Label Raporlar',
        desc: 'Kendi logonuz ve renk paletinizle markalı PDF, Excel ve interaktif müşteri portalı raporları oluşturun. Ajans büyütmek için ideal.',
        tags: ['Kendi Marka', 'PDF & Excel', 'Müşteri Portali'],
        iconColor: 'text-teal-400',
        iconBg: 'bg-teal-500/12',
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">

          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm px-4 py-1.5 mb-5">
              <span className="text-xs font-medium text-white/50">11 Güçlü Araç</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5 tracking-tight">
              SEO ve GEO için<br />
              <span className="gradient-text">tek platform</span>
            </h1>
            <p className="text-lg text-white/40 max-w-2xl mx-auto leading-relaxed">
              Geleneksel SEO araçlarının ötesine geçin. Teknik analiz, AI içerik, backlink, outreach
              ve yapay zeka görünürlüğü — ayrı abonelik gerekmez.
            </p>
          </div>

          {/* Feature categories */}
          <div className="space-y-14">
            {categories.map((cat) => (
              <div key={cat.label}>
                <div className="flex items-center gap-3 mb-6">
                  <span className={`text-xs font-semibold uppercase tracking-widest ${cat.color}`}>{cat.label}</span>
                  <div className={`flex-1 h-px bg-gradient-to-r from-current to-transparent opacity-20 ${cat.color}`} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                  {cat.features.map((f) => (
                    <Link
                      key={f.slug}
                      href={`/ozellikler/${f.slug}`}
                      className={`group relative rounded-2xl border ${cat.borderColor} bg-white/[0.025] hover:bg-white/[0.045] p-6 transition-all duration-200 hover:-translate-y-0.5`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 inline-flex p-2.5 rounded-xl ${f.iconBg}`}>
                          <f.Icon className={`h-5 w-5 ${f.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h2 className="text-base font-semibold text-white group-hover:text-white">{f.title}</h2>
                            <ArrowRight className={`h-4 w-4 ${f.iconColor} opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0`} />
                          </div>
                          <p className="text-sm text-white/40 leading-relaxed mb-4">{f.desc}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {f.tags.map((tag) => (
                              <span key={tag} className="text-[10px] rounded-full border border-white/8 bg-white/5 px-2.5 py-0.5 text-white/35">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-20 text-center rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-900/20 to-transparent p-12">
            <h2 className="text-2xl font-bold text-white mb-3">Tüm özellikleri 14 gün ücretsiz deneyin</h2>
            <p className="text-white/40 mb-8 max-w-md mx-auto">Kredi kartı gerekmez. Anında kurulum. İstediğiniz zaman iptal.</p>
            <Link
              href="/kayit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white hover:bg-indigo-500 transition-all shadow-[0_0_32px_rgba(99,102,241,0.4)]"
            >
              Ücretsiz Başla <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
