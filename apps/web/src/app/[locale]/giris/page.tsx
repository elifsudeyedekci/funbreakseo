'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(1, 'Şifre zorunludur'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const { setAuth } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);

  const localePath = (path: string) => locale === 'tr' ? path : `/${locale}${path}`;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginForm) {
    setServerError('');
    try {
      const res = await authApi.login(data.email, data.password);
      const payload = res.data.data;

      if (payload.requiresTwoFactor) {
        setNeeds2FA(true);
        return;
      }

      setAuth({
        user: payload.user,
        organization: payload.organization,
        subscription: payload.subscription,
        accessToken: payload.tokens.accessToken,
        refreshToken: payload.tokens.refreshToken,
        pendingConsents: payload.pendingConsents || [],
      });

      router.push(redirect || localePath('/dashboard'));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(e?.response?.data?.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
    }
  }

  async function submit2FA() {
    try {
      const res = await authApi.verify2fa(twoFaCode);
      const payload = res.data.data;
      setAuth({
        user: payload.user,
        organization: payload.organization,
        subscription: payload.subscription,
        accessToken: payload.tokens.accessToken,
        refreshToken: payload.tokens.refreshToken,
      });
      router.push(redirect || localePath('/dashboard'));
    } catch {
      setServerError('Doğrulama kodu hatalı.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={localePath('/')} className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">FunBreak SEO</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('login')}</h1>
          <p className="text-white/50 mt-1 text-sm">
            {t('noAccount')}{' '}
            <Link href={localePath('/kayit')} className="text-indigo-400 hover:text-indigo-300 underline">
              {t('createFree')}
            </Link>
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          {!needs2FA ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">{t('email')}</label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  placeholder="ornek@sirket.com"
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-white/80">{t('password')}</label>
                  <Link
                    href={localePath('/sifremi-unuttum')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {t('forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    aria-label={showPw ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              {serverError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Giriş yapılıyor...
                  </span>
                ) : (
                  t('login')
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white mb-1">{t('2fa')}</h2>
                <p className="text-sm text-white/50">Authenticator uygulamanızdaki 6 haneli kodu girin</p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl tracking-widest text-white focus:border-indigo-500/50 focus:outline-none"
                placeholder="000000"
              />
              {serverError && (
                <p className="text-xs text-red-400 text-center">{serverError}</p>
              )}
              <button
                onClick={submit2FA}
                disabled={twoFaCode.length !== 6}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
              >
                Doğrula
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
