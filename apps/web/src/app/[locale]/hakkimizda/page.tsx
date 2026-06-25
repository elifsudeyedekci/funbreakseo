import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SUPPORT_PHONE, SUPPORT_EMAIL, COMPANY_NAME } from '@funbreakseo/shared';
import { MapPin, Mail, Phone, Globe, Users, Target, Lightbulb, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hakkımızda | FunBreak SEO',
  description: 'FunBreak SEO ekibi hakkında bilgi edinin. Google ve yapay zeka aramalarında görünürlüğü artıran platformun arkasındaki hikaye, misyon ve ekip.',
};

const team = [
  {
    initial: 'K',
    name: 'Kurucu & CEO',
    role: 'Strateji & Vizyon',
    bio: 'Dijital pazarlama ve SEO alanında 10+ yıl deneyim. FunBreak SEO\'yu, GEO çağında markaların sadece Google\'da değil yapay zeka aramalarında da görünür kalmasını sağlamak amacıyla kurdu.',
    gradient: 'from-indigo-500 to-purple-600',
    skills: ['SEO Stratejisi', 'Ürün Geliştirme', 'GEO', 'Büyüme'],
  },
  {
    initial: 'Y',
    name: 'Yazılım Ekibi',
    role: 'Geliştirme & Mühendislik',
    bio: 'Yapay zeka teknolojileriyle donatılmış, modern web ve backend geliştirme konusunda uzmanlaşmış mühendis kadromuz; ölçeklenebilir, hızlı ve güvenilir sistemler inşa eder.',
    gradient: 'from-emerald-500 to-teal-600',
    skills: ['TypeScript', 'Python', 'Go', 'PHP', 'Java', 'Rust', 'Next.js', 'NestJS', 'PostgreSQL', 'Redis'],
  },
  {
    initial: 'İ',
    name: 'İçerik & SEO Ekibi',
    role: 'Strateji & İçerik',
    bio: 'Türkiye ve global pazarlar için SEO stratejisi, içerik optimizasyonu ve GEO uyumlu yayın süreçlerini yürüten uzman kadromuz.',
    gradient: 'from-orange-500 to-rose-500',
    skills: ['SEO Yazarlığı', 'GEO Stratejisi', 'Anahtar Kelime', 'E-E-A-T', 'Çok Dilli İçerik'],
  },
  {
    initial: 'V',
    name: 'Veri & AI Ekibi',
    role: 'Yapay Zeka & Analitik',
    bio: 'Büyük dil modelleri, veri pipeline\'ları ve SEO analitiği konusunda deneyimli araştırmacı ve mühendislerden oluşan ekibimiz platformun yapay zeka altyapısını tasarlar.',
    gradient: 'from-purple-500 to-indigo-600',
    skills: ['LLM', 'Python', 'TensorFlow', 'RAG', 'Veri Mühendisliği', 'NLP'],
  },
];

const milestones = [
  { year: '2024', title: 'Kuruluş', desc: "İstanbul'da kuruldu, ilk teknik altyapı inşa edildi." },
  { year: '2024', title: 'Beta Sürümü', desc: 'İlk 50 beta kullanıcısı ile SEO tarama ve GEO izleme modülleri yayına girdi.' },
  { year: '2025', title: 'AI İçerik Motoru', desc: 'GPT-4o entegrasyonu ve Autopilot özelliği lansmanı.' },
  { year: '2025', title: 'Büyüme', desc: '500+ aktif proje, 1M+ takip edilen anahtar kelime.' },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          {/* Hero */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm px-4 py-1.5 mb-5">
              <span className="text-xs font-medium text-white/50">İstanbul&apos;dan Dünyaya</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
              SEO ve GEO&apos;nun<br />
              <span className="gradient-text">Geleceğini İnşa Ediyoruz</span>
            </h1>
            <p className="text-xl text-white/45 max-w-2xl mx-auto leading-relaxed">
              FunBreak SEO, markaların Google ve yapay zeka aramalarında görünür kalmasını
              sağlamak için İstanbul&apos;dan dünyaya hizmet veren bir teknoloji şirketidir.
            </p>
          </div>

          {/* Mission / Vision / Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
            {[
              {
                Icon: Target,
                title: 'Misyonumuz',
                desc: 'Her ölçekteki işletmenin arama motoru ve yapay zeka ekosisteminde görünür, ölçülebilir ve sürdürülebilir büyüme elde etmesini sağlamak.',
                color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/18',
              },
              {
                Icon: Lightbulb,
                title: 'Vizyonumuz',
                desc: "GEO çağında markaların dijital kimliğini oluşturan, Google'dan ChatGPT'ye kadar her platformda söz sahibi olmalarını sağlayan lider platform olmak.",
                color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/18',
              },
              {
                Icon: Users,
                title: 'Değerlerimiz',
                desc: 'Şeffaflık, veriye dayalı karar alma, sürekli inovasyon ve müşteri başarısına odaklanma. Gizli ücret yok, sürpriz yok.',
                color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/18',
              },
            ].map((item) => (
              <div key={item.title} className={`rounded-2xl border ${item.border} ${item.bg} p-7`}>
                <item.Icon className={`h-6 w-6 ${item.color} mb-4`} />
                <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="mb-20">
            <h2 className="text-2xl font-bold text-white mb-10 text-center">Hikayemiz</h2>
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
            <h2 className="text-2xl font-bold text-white mb-3 text-center">Ekibimiz</h2>
            <p className="text-white/40 text-center mb-10 text-sm max-w-xl mx-auto">
              Yapay zeka teknolojileriyle donatılmış yazılım mühendisleri, SEO uzmanları ve veri bilimcilerinden oluşan dinamik kadromuz.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {team.map((member) => (
                <div key={member.name} className="rounded-2xl border border-white/10 bg-white/[0.025] p-7">
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${member.gradient} flex items-center justify-center text-lg font-bold text-white flex-shrink-0`}>
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
                      <span key={skill} className="text-[10px] rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-white/40">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Company info */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 mb-12">
            <h2 className="text-xl font-bold text-white mb-7">Şirket Bilgileri</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-white/35 uppercase tracking-widest mb-1.5">Şirket Ünvanı</p>
                <p className="text-white font-medium">{COMPANY_NAME}</p>
              </div>
              <div>
                <p className="text-xs text-white/35 uppercase tracking-widest mb-1.5">Kuruluş</p>
                <p className="text-white font-medium">2024, İstanbul</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-white/35 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> Adres
                </p>
                <p className="text-white font-medium">Armağanevler Mahallesi Ortanca Sokak 69/22 Ümraniye/İstanbul</p>
              </div>
              <div>
                <p className="text-xs text-white/35 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> Telefon
                </p>
                <a href={`tel:${SUPPORT_PHONE}`} className="text-white font-medium hover:text-indigo-300 transition-colors">
                  {SUPPORT_PHONE}
                </a>
              </div>
              <div>
                <p className="text-xs text-white/35 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> E-posta
                </p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-white font-medium hover:text-indigo-300 transition-colors">
                  {SUPPORT_EMAIL}
                </a>
              </div>
              <div>
                <p className="text-xs text-white/35 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Globe className="h-3 w-3" /> Hizmet Alanları
                </p>
                <p className="text-white font-medium">Türkiye, AB, MENA, Küresel</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center rounded-2xl border border-indigo-500/20 bg-indigo-900/15 p-10">
            <h2 className="text-2xl font-bold text-white mb-3">Birlikte büyüyelim</h2>
            <p className="text-white/40 mb-7 max-w-md mx-auto text-sm">
              14 gün ücretsiz deneyin, sitenizin SEO ve GEO potansiyelini keşfedin.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/kayit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all">
                Ücretsiz Dene <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/iletisim" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-all">
                Bizimle İletişime Geç
              </Link>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
