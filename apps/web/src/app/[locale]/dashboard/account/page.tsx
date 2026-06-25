'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { User, Building2, Shield, Link2 } from 'lucide-react';
import { accountApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const profileSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  locale: z.string(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

export default function AccountPage() {
  const t = useTranslations('accountPage');
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'profile' | 'org' | 'security' | 'integrations'>('profile');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: '',
      locale: user?.locale || 'tr',
    },
  });

  const { register: regPwd, handleSubmit: handlePwd, reset: resetPwd, formState: { errors: pwdErrors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProfileForm) => accountApi.update(data as Record<string, unknown>),
    onSuccess: (_, vars) => updateUser({ fullName: vars.fullName, locale: vars.locale }),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      accountApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => resetPwd(),
  });

  const twoFaMutation = useMutation({
    mutationFn: () => (user?.twoFactorEnabled ? accountApi.disable2fa({}) : accountApi.enable2fa()),
    onSuccess: () => {
      updateUser({ twoFactorEnabled: !user?.twoFactorEnabled });
      qc.invalidateQueries({ queryKey: ['account-me'] });
    },
  });

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['account-org'],
    queryFn: () => accountApi.organization().then((r) => r.data?.data ?? r.data),
    enabled: tab === 'org',
  });

  const { register: regOrg, handleSubmit: handleOrg } = useForm<{ name: string }>({
    values: org ? { name: (org as { name?: string }).name ?? '' } : { name: '' },
  });

  const updateOrgMutation = useMutation({
    mutationFn: (data: { name: string }) => accountApi.updateOrganization(data as Record<string, unknown>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account-org'] }),
  });

  const tabs = [
    { id: 'profile', label: t('tabProfile'), icon: User },
    { id: 'org', label: t('tabOrg'), icon: Building2 },
    { id: 'security', label: t('tabSecurity'), icon: Shield },
    { id: 'integrations', label: t('tabIntegrations'), icon: Link2 },
  ] as const;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">{t('title')}</h1>

      <div className="flex gap-1 border-b border-white/10 mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === id ? 'border-indigo-500 text-white' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">{t('labelFullName')}</label>
            <input
              {...register('fullName')}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-400">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">{t('labelEmail')}</label>
            <input
              {...register('email')}
              type="email"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">{t('labelLanguage')}</label>
            <select
              {...register('locale')}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
            >
              <option value="tr">{t('langTR')}</option>
              <option value="en">{t('langEN')}</option>
              <option value="de">{t('langDE')}</option>
              <option value="fr">{t('langFR')}</option>
              <option value="es">{t('langES')}</option>
              <option value="ar">{t('langAR')}</option>
              <option value="ru">{t('langRU')}</option>
              <option value="hi">{t('langHI')}</option>
            </select>
          </div>
          {updateMutation.isSuccess && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
              {t('saved')}
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
          >
            {updateMutation.isPending ? t('savingBtn') : t('saveBtn')}
          </button>
        </form>
      )}

      {tab === 'org' && (
        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-white">{t('orgTitle')}</h2>
          {orgLoading ? (
            <div className="rounded-2xl border border-white/10 h-20 animate-pulse" />
          ) : (
            <form onSubmit={handleOrg((d) => updateOrgMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">{t('orgName')}</label>
                <input
                  {...regOrg('name')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
              {updateOrgMutation.isSuccess && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
                  {t('saved')}
                </div>
              )}
              <button
                type="submit"
                disabled={updateOrgMutation.isPending}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
              >
                {updateOrgMutation.isPending ? t('savingBtn') : t('saveBtn')}
              </button>
            </form>
          )}
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">{t('secTitle')}</h3>
            <form onSubmit={handlePwd((d) => passwordMutation.mutate(d))} className="space-y-3">
              <input
                {...regPwd('currentPassword')}
                type="password"
                placeholder={t('secCurrentPass')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none"
              />
              {pwdErrors.currentPassword && <p className="text-xs text-red-400">{pwdErrors.currentPassword.message}</p>}
              <input
                {...regPwd('newPassword')}
                type="password"
                placeholder={t('secNewPass')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none"
              />
              {pwdErrors.newPassword && <p className="text-xs text-red-400">{pwdErrors.newPassword.message}</p>}
              <input
                {...regPwd('confirmPassword')}
                type="password"
                placeholder={t('secNewPassConfirm')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none"
              />
              {pwdErrors.confirmPassword && <p className="text-xs text-red-400">{pwdErrors.confirmPassword.message}</p>}
              {passwordMutation.isSuccess && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
                  {t('saved')}
                </div>
              )}
              <button
                type="submit"
                disabled={passwordMutation.isPending}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
              >
                {t('secUpdateBtn')}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">{t('twoFaTitle')}</h3>
                <p className="text-xs text-white/40 mt-1">
                  {user?.twoFactorEnabled ? t('twoFaActive') : t('twoFaInactive')}
                </p>
              </div>
              <button
                onClick={() => twoFaMutation.mutate()}
                disabled={twoFaMutation.isPending}
                className={`rounded-xl px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                  user?.twoFactorEnabled
                    ? 'border border-red-500/30 text-red-400 hover:bg-red-500/10'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }`}
              >
                {user?.twoFactorEnabled ? t('twoFaDisableBtn') : t('twoFaEnableBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'integrations' && (
        <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none">
                  <path
                    d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">{t('gscTitle')}</p>
                <p className="text-xs text-white/40">{t('gscDesc')}</p>
              </div>
            </div>
            <button className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all">
              {t('gscConnectBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
