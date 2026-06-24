'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, ArrowLeft } from 'lucide-react';
import { authApi } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
});

type ForgotForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const localePath = (path: string) => locale === 'tr' ? path : `/${locale}${path}`;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({ resolver: zodResolver(schema) });

  async function onSubmit(data: ForgotForm) {
    setServerError('');
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch {
      setServerError('İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20">
            <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">E-posta Gönderildi</h1>
          <p className="text-white/60 leading-relaxed mb-6">
            Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.
          </p>
          <Link href={localePath('/giris')} className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Giriş sayfasına dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href={localePath('/')} className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">FunBreak SEO</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Şifre Sıfırla</h1>
          <p className="text-white/50 mt-1 text-sm">
            E-posta adresinize sıfırlama bağlantısı göndereceğiz
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">E-posta</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="ornek@sirket.com"
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            {serverError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
            </button>

            <Link
              href={localePath('/giris')}
              className="flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Giriş sayfasına dön
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
