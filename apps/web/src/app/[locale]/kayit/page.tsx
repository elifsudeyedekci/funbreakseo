'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Zap, ExternalLink } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Ad soyad en az 2 karakter olmalıdır'),
    companyName: z.string().optional(),
    email: z.string().email('Geçerli bir e-posta adresi girin'),
    password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
    confirmPassword: z.string(),
    consentTerms: z.boolean().refine((v) => v === true, 'Kullanım şartlarını kabul etmelisiniz'),
    consentKvkk: z.boolean().refine((v) => v === true, 'KVKK metnini kabul etmelisiniz'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const localePath = (path: string) => locale === 'tr' ? path : `/${locale}${path}`;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      consentTerms: false,
      consentKvkk: false,
    },
  });

  const consentTerms = watch('consentTerms');
  const consentKvkk = watch('consentKvkk');
  const canSubmit = consentTerms && consentKvkk;

  async function onSubmit(data: RegisterForm) {
    setServerError('');
    try {
      const res = await authApi.register({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        companyName: data.companyName,
        consents: [
          { type: 'TERMS', version: '1.0' },
          { type: 'KVKK', version: '1.0' },
        ],
      });
      const payload = res.data.data;

      if (payload.requiresEmailVerification) {
        setSuccess(true);
        return;
      }

      if (payload.tokens) {
        setAuth({
          user: payload.user,
          organization: payload.organization,
          subscription: payload.subscription,
          accessToken: payload.tokens.accessToken,
          refreshToken: payload.tokens.refreshToken,
        });
        router.push(localePath('/dashboard'));
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(e?.response?.data?.message || 'Kayıt işlemi başarısız. Lütfen tekrar deneyin.');
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{t('verifyEmailTitle')}</h1>
          <p className="text-white/60 leading-relaxed">{t('verifyEmailDesc')}</p>
          <Link href={localePath('/giris')} className="mt-6 inline-block text-sm text-indigo-400 hover:text-indigo-300 underline">
            Giriş sayfasına dön
          </Link>
        </div>
      </div>
    );
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
          <h1 className="text-2xl font-bold text-white">{t('register')}</h1>
          <p className="text-white/50 mt-1 text-sm">
            {t('hasAccount')}{' '}
            <Link href={localePath('/giris')} className="text-indigo-400 hover:text-indigo-300 underline">
              {t('loginNow')}
            </Link>
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">{t('fullName')}</label>
              <input
                {...register('fullName')}
                type="text"
                autoComplete="name"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="Ad Soyad"
              />
              {errors.fullName && <p className="mt-1.5 text-xs text-red-400">{errors.fullName.message}</p>}
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                {t('companyName')} <span className="text-white/30 text-xs">({t('optional') ?? 'opsiyonel'})</span>
              </label>
              <input
                {...register('companyName')}
                type="text"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="Şirket veya marka adı"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">{t('email')}</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="ornek@sirket.com"
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">{t('password')}</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  placeholder="En az 8 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">{t('confirmPassword')}</label>
              <input
                {...register('confirmPassword')}
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="Şifreyi tekrar girin"
              />
              {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword.message}</p>}
            </div>

            {/* Consent checkboxes — NOT pre-checked per requirement */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <ConsentCheckbox
                id="consentTerms"
                label={
                  <>
                    <Link href={localePath('/kullanim-sartlari')} target="_blank" className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-0.5">
                      Kullanım Şartları <ExternalLink className="h-3 w-3" />
                    </Link>
                    &apos;nı okudum ve kabul ediyorum
                  </>
                }
                {...register('consentTerms')}
                error={errors.consentTerms?.message}
              />
              <ConsentCheckbox
                id="consentKvkk"
                label={
                  <>
                    <Link href={localePath('/kvkk')} target="_blank" className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-0.5">
                      KVKK Aydınlatma Metni <ExternalLink className="h-3 w-3" />
                    </Link>
                    {' '}ve{' '}
                    <Link href={localePath('/gizlilik-politikasi')} target="_blank" className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-0.5">
                      Gizlilik Politikası <ExternalLink className="h-3 w-3" />
                    </Link>
                    &apos;nı okudum ve kabul ediyorum
                  </>
                }
                {...register('consentKvkk')}
                error={errors.consentKvkk?.message}
              />
            </div>

            {serverError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Hesap oluşturuluyor...
                </span>
              ) : (
                'Ücretsiz Hesap Oluştur'
              )}
            </button>

            <p className="text-center text-xs text-white/30">
              14 gün ücretsiz · Kredi kartı gerekmez
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function ConsentCheckbox({
  id,
  label,
  error,
  ...props
}: {
  id: string;
  label: React.ReactNode;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
        <input
          {...props}
          id={id}
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
        />
        <span className="text-xs text-white/60 leading-relaxed group-hover:text-white/80 transition-colors">
          {label}
        </span>
      </label>
      {error && <p className="mt-1 ml-7 text-xs text-red-400">{error}</p>}
    </div>
  );
}
