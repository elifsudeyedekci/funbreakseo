'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WHATSAPP_URL, SUPPORT_PHONE, SUPPORT_EMAIL } from '@funbreakseo/shared';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().min(20, 'Mesajınız en az 20 karakter olmalıdır'),
});

type ContactForm = z.infer<typeof schema>;

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContactForm>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: ContactForm) {
    await fetch('/api/contact', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
    setSent(true);
  }

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-white mb-4">İletişim</h1>
            <p className="text-white/50 text-lg">Size yardımcı olmaktan mutluluk duyarız</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact info */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-6">Bize Ulaşın</h2>
                <div className="space-y-4">
                  <a href={`tel:${SUPPORT_PHONE}`} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/2 hover:bg-white/5 transition-colors group">
                    <div className="p-2.5 rounded-lg bg-indigo-500/20">
                      <Phone className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-0.5">Telefon</p>
                      <p className="text-white font-medium group-hover:text-indigo-300 transition-colors">{SUPPORT_PHONE}</p>
                    </div>
                  </a>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/2 hover:bg-white/5 transition-colors group">
                    <div className="p-2.5 rounded-lg bg-purple-500/20">
                      <Mail className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-0.5">E-posta</p>
                      <p className="text-white font-medium group-hover:text-indigo-300 transition-colors">{SUPPORT_EMAIL}</p>
                    </div>
                  </a>
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/2">
                    <div className="p-2.5 rounded-lg bg-emerald-500/20">
                      <MapPin className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-0.5">Adres</p>
                      <p className="text-white text-sm">İstanbul</p>
                    </div>
                  </div>
                </div>
              </div>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl bg-green-500 px-5 py-4 text-white hover:bg-green-600 transition-colors font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp ile Anında Yardım — {SUPPORT_PHONE}
              </a>

              <div className="rounded-xl border border-white/10 bg-white/2 p-4 text-xs text-white/40">
                <p className="font-medium text-white/60 mb-1">Çalışma Saatleri</p>
                <p>Pazartesi – Cuma: 09:00 – 18:00</p>
                <p>Cumartesi: 10:00 – 14:00</p>
                <p>Pazar: Kapalı</p>
              </div>
            </div>

            {/* Form */}
            <div className="rounded-2xl border border-white/10 bg-white/2 p-8">
              {sent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Mesajınız İletildi!</h3>
                  <p className="text-white/50">En kısa sürede size geri döneceğiz.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <h2 className="text-xl font-semibold text-white mb-6">Mesaj Gönderin</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">Ad Soyad</label>
                      <input {...register('name')} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none" placeholder="Ad Soyad" />
                      {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">Şirket</label>
                      <input {...register('company')} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none" placeholder="Opsiyonel" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">E-posta</label>
                    <input {...register('email')} type="email" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none" placeholder="ornek@sirket.com" />
                    {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">Mesaj</label>
                    <textarea {...register('message')} rows={5} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:border-indigo-500/50 focus:outline-none" placeholder="Nasıl yardımcı olabiliriz?" />
                    {errors.message && <p className="mt-1 text-xs text-red-400">{errors.message.message}</p>}
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all">
                    {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
