'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { authApi, api } from '@/lib/api';

type Tab = 'profile' | 'organization' | 'notifications' | 'security' | 'data';

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'ar', label: 'العربية' },
  { value: 'ru', label: 'Русский' },
  { value: 'hi', label: 'हिन्दी' },
];

const CURRENCIES = ['USD', 'EUR', 'TRY', 'GBP'];

export default function SettingsPage() {
  const t = useTranslations('settingsPage');
  const [tab, setTab] = useState<Tab>('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: me, isLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => authApi.me().then((r: any) => r.data?.data ?? r.data),
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [locale, setLocale] = useState('en');
  const [currency, setCurrency] = useState('USD');
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    if (me) {
      setName((me as any).fullName ?? (me as any).name ?? '');
      setEmail((me as any).email ?? '');
      setLocale((me as any).locale ?? 'en');
      setCurrency((me as any).currency ?? 'USD');
      setOrgName((me as any).organization?.name ?? '');
    }
  }, [me]);

  const profileMutation = useMutation({
    mutationFn: (data: any) => api.patch('/account/me', { fullName: data.name, email: data.email, locale: data.locale, currency: data.currency }),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: any) => api.post('/account/change-password', { currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
  });

  const orgMutation = useMutation({
    mutationFn: (orgNameVal: string) => api.patch('/account/organization', { name: orgNameVal }),
  });

  const twoFaMutation = useMutation({
    mutationFn: () => (me as any)?.twoFactorEnabled ? api.post('/account/2fa/disable', {}) : api.post('/account/2fa/enable'),
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: t('tabProfile') },
    { key: 'organization', label: t('tabOrg') },
    { key: 'notifications', label: t('tabNotifications') },
    { key: 'security', label: t('tabSecurity') },
    { key: 'data', label: t('tabData') },
  ];

  const notifItems = [
    { key: 'rank', label: t('notifRankLabel'), desc: t('notifRankDesc') },
    { key: 'crawl', label: t('notifCrawlLabel'), desc: t('notifCrawlDesc') },
    { key: 'content', label: t('notifContentLabel'), desc: t('notifContentDesc') },
    { key: 'outreach', label: t('notifOutreachLabel'), desc: t('notifOutreachDesc') },
    { key: 'billing', label: t('notifBillingLabel'), desc: t('notifBillingDesc') },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {t('subtitle')}
        </p>
      </div>

      <div className="flex gap-1 p-1 rounded-lg w-fit flex-wrap" style={{ background: 'var(--bg-surface)' }}>
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className="px-4 py-2 rounded-md text-sm font-medium transition"
            style={{
              background: tab === item.key ? 'var(--bg-elevated)' : 'transparent',
              color: tab === item.key ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="max-w-lg space-y-5 rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold">{t('profileTitle')}</h2>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: 'var(--accent)' }}>
              {(me?.name ?? 'U').charAt(0).toUpperCase()}
            </div>
            <button className="px-3 py-1.5 rounded-lg text-xs transition hover:bg-white/10" style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {t('changeAvatar')}
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              {[
                { label: t('labelFullName'), value: name, setter: setName, type: 'text', placeholder: 'Your name' },
                { label: t('labelEmail'), value: email, setter: setEmail, type: 'email', placeholder: 'your@email.com' },
              ].map((field) => (
                <div key={field.label}>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2 rounded-lg outline-none text-sm"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('labelLanguage')}</label>
                  <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg outline-none text-sm"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
                  >
                    {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('labelCurrency')}</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg outline-none text-sm"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {profileMutation.isSuccess && (
                <p className="text-xs text-green-400">{t('profileSaved')}</p>
              )}

              <button
                onClick={() => profileMutation.mutate({ name, email, locale, currency })}
                disabled={profileMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition hover:opacity-90"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {profileMutation.isPending ? t('savingBtn') : t('saveBtn')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Organization Tab */}
      {tab === 'organization' && (
        <div className="max-w-lg rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold">{t('orgTitle')}</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('orgDesc')}</p>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{t('orgNameLabel')}</label>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder={t('orgNamePlaceholder')}
              className="w-full px-4 py-2 rounded-lg outline-none text-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
            />
          </div>
          {orgMutation.isSuccess && <p className="text-xs text-green-400">{t('profileSaved')}</p>}
          <button
            onClick={() => orgMutation.mutate(orgName)}
            disabled={orgMutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {orgMutation.isPending ? t('savingBtn') : t('saveOrgBtn')}
          </button>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="max-w-lg rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold">{t('notifTitle')}</h2>
          {notifItems.map((n) => (
            <label key={n.key} className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="mt-0.5 accent-[var(--accent)]" />
              <div>
                <p className="text-sm font-medium">{n.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{n.desc}</p>
              </div>
            </label>
          ))}
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {t('notifSaveBtn')}
          </button>
        </div>
      )}

      {/* Security Tab */}
      {tab === 'security' && (
        <div className="max-w-lg space-y-5">
          <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold">{t('secTitle')}</h2>
            {[
              { label: t('secCurrentPass'), value: currentPassword, setter: setCurrentPassword },
              { label: t('secNewPass'), value: newPassword, setter: setNewPassword },
              { label: t('secConfirmPass'), value: confirmPassword, setter: setConfirmPassword },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                <input
                  type="password"
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg outline-none text-sm"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
                />
              </div>
            ))}
            {passwordMutation.isSuccess && <p className="text-xs text-green-400">{t('secSaved')}</p>}
            {passwordMutation.isError && <p className="text-xs text-red-400">{t('secError')}</p>}
            <button
              onClick={() => passwordMutation.mutate({ currentPassword, newPassword })}
              disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || passwordMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {passwordMutation.isPending ? t('savingBtn') : t('secUpdateBtn')}
            </button>
          </div>

          <div className="rounded-xl p-6 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold">{t('twoFaTitle')}</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('twoFaDesc')}</p>
            <button
              onClick={() => twoFaMutation.mutate()}
              disabled={twoFaMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90 disabled:opacity-50"
              style={{ background: (me as any)?.twoFactorEnabled ? '#ef4444' : 'var(--accent)', color: '#fff' }}
            >
              {twoFaMutation.isPending ? '...' : ((me as any)?.twoFactorEnabled ? t('twoFaDisableBtn') : t('twoFaEnableBtn'))}
            </button>
          </div>
        </div>
      )}

      {/* Data Tab */}
      {tab === 'data' && (
        <div className="max-w-lg space-y-5">
          <div className="rounded-xl p-6 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold">{t('exportTitle')}</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('exportDesc')}</p>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {t('exportBtn')}
            </button>
          </div>

          <div className="rounded-xl p-6 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <h2 className="text-sm font-semibold text-red-400">{t('deleteTitle')}</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('deleteDesc')}</p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
              style={{ background: '#ef4444', color: '#fff' }}
            >
              {t('deleteBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <h2 className="text-lg font-semibold text-red-400">{t('deleteDialogTitle')}</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('deleteDialogDesc')}</p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={t('deleteConfirmPlaceholder')}
              className="w-full px-4 py-2 rounded-lg outline-none text-sm"
              style={{ background: 'var(--bg-base)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                {t('cancelBtn')}
              </button>
              <button
                disabled={deleteConfirmText !== 'DELETE'}
                className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                {t('deleteConfirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
