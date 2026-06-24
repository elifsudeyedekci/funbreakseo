import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SUPPORT_PHONE, SUPPORT_EMAIL, COMPANY_NAME } from '@funbreakseo/shared';

export const metadata: Metadata = {
  title: 'Hakkımızda | FunBreak SEO',
  description: 'FunBreak SEO ekibi hakkında bilgi edinin. Google ve yapay zeka aramalarında görünürlüğü artıran platformun arkasındaki hikaye.',
};

const team = [
  { name: 'İzzetcan Doğan', role: 'Kurucu & CEO', bio: 'Dijital pazarlama ve SEO alanında 10+ yıl deneyim. FunBreak SEO\'yu GEO çağında markaların görünür kalmasına yardımcı olmak için kurdu.' },
  { name: 'Yazılım Ekibi', role: 'Geliştirme', bio: 'Next.js, NestJS ve yapay zeka teknolojilerinde uzman geliştirici ekibi.' },
  { name: 'İçerik Ekibi', role: 'SEO & İçerik', bio: 'Türkiye ve global pazarlar için SEO stratejisi ve içerik optimizasyonu.' },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-20">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              SEO ve GEO&apos;nun<br />
              <span className="gradient-text">Geleceğini İnşa Ediyoruz</span>
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
              FunBreak SEO, markaların Google ve yapay zeka aramalarında görünür kalmasını
              sağlamak için İstanbul&apos;dan dünyaya hizmet veren bir teknoloji şirketidir.
            </p>
          </div>

          {/* Mission */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            {[
              { title: 'Misyonumuz', desc: 'Her ölçekteki işletmenin arama motoru ve yapay zeka ekosisteminde görünür, ölçülebilir ve sürdürülebilir büyüme elde etmesini sağlamak.' },
              { title: 'Vizyonumuz', desc: 'GEO çağında markaların dijital kimliğini oluşturan, Google\'dan ChatGPT\'ye kadar her platformda söz sahibi olmalarını sağlayan lider platform olmak.' },
              { title: 'Değerlerimiz', desc: 'Şeffaflık, veriye dayalı karar alma, sürekli inovasyon ve müşteri başarısına odaklanma. Gizli ücret yok, sürpriz yok.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/2 p-6">
                <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Company info - EEAT signals */}
          <div className="rounded-2xl border border-white/10 bg-white/2 p-8 mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Şirket Bilgileri</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-white/40 mb-1">Şirket Ünvanı</p>
                <p className="text-white font-medium">{COMPANY_NAME}</p>
              </div>
              <div>
                <p className="text-white/40 mb-1">Kuruluş</p>
                <p className="text-white font-medium">2024, İstanbul</p>
              </div>
              <div>
                <p className="text-white/40 mb-1">Adres</p>
                <p className="text-white font-medium">Çifte Havuzlar Mah. Eski Londra Asfaltı Cad. Kuluçka Merkezi B2 Blok No:151/1C İç Kapı No:2B Esenler/İstanbul</p>
              </div>
              <div>
                <p className="text-white/40 mb-1">Telefon</p>
                <a href={`tel:${SUPPORT_PHONE}`} className="text-white font-medium hover:text-indigo-300 transition-colors">{SUPPORT_PHONE}</a>
              </div>
              <div>
                <p className="text-white/40 mb-1">E-posta</p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-white font-medium hover:text-indigo-300 transition-colors">{SUPPORT_EMAIL}</a>
              </div>
              <div>
                <p className="text-white/40 mb-1">Hizmet Alanları</p>
                <p className="text-white font-medium">Türkiye, AB, MENA, Küresel</p>
              </div>
            </div>
          </div>

          {/* Team */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-8 text-center">Ekip</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {team.map((member) => (
                <div key={member.name} className="rounded-2xl border border-white/10 bg-white/2 p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
                    {member.name[0]}
                  </div>
                  <h3 className="font-semibold text-white mb-1">{member.name}</h3>
                  <p className="text-xs text-indigo-400 mb-3">{member.role}</p>
                  <p className="text-xs text-white/50 leading-relaxed">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
