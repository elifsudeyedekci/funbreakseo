'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi, api } from '@/lib/api';

type Tab = 'profile' | 'organization' | 'notifications' | 'security' | 'data';

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
];

const CURRENCIES = ['USD', 'EUR', 'TRY', 'GBP'];

export default function SettingsPage() {
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

  // Sync form when data arrives
  useState(() => {
    if (me) {
      setName(me.name ?? '');
      setEmail(me.email ?? '');
      setLocale(me.locale ?? 'en');
      setCurrency(me.currency ?? 'USD');
    }
  });

  const profileMutation = useMutation({
    mutationFn: (data: any) => api.patch('/auth/profile', data),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: any) => api.patch('/auth/password', data),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'organization', label: 'Organization' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'security', label: 'Security' },
    { key: 'data', label: 'Data' },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Manage your account preferences and security.
        </p>
      </div>

      <div className="flex gap-1 p-1 rounded-lg w-fit flex-wrap" style={{ background: 'var(--bg-surface)' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-md text-sm font-medium transition"
            style={{
              background: tab === t.key ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="max-w-lg space-y-5 rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold">Profile Information</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: 'var(--accent)' }}>
              {(me?.name ?? 'U').charAt(0).toUpperCase()}
            </div>
            <button className="px-3 py-1.5 rounded-lg text-xs transition hover:bg-white/10" style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Change Avatar
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Full Name', value: name, setter: setName, type: 'text', placeholder: 'Your name' },
                { label: 'Email Address', value: email, setter: setEmail, type: 'email', placeholder: 'your@email.com' },
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
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Language</label>
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
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Currency</label>
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
                <p className="text-xs text-green-400">Profile updated successfully.</p>
              )}

              <button
                onClick={() => profileMutation.mutate({ name, email, locale, currency })}
                disabled={profileMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition hover:opacity-90"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {profileMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Organization Tab */}
      {tab === 'organization' && (
        <div className="max-w-lg rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold">Organization</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your organization name and team members.</p>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Organization Name</label>
            <input
              placeholder="Your company or project name"
              className="w-full px-4 py-2 rounded-lg outline-none text-sm"
              style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
            />
          </div>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Save
          </button>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="max-w-lg rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold">Notification Preferences</h2>
          {[
            { label: 'Rank changes', desc: 'Get notified when keyword rankings change significantly.' },
            { label: 'Crawl complete', desc: 'Notify when a site crawl finishes.' },
            { label: 'Content ready', desc: 'Notify when AI-generated content is ready for review.' },
            { label: 'Campaign replies', desc: 'Notify on outreach email replies.' },
            { label: 'Billing alerts', desc: 'Notify on payment issues or plan renewals.' },
          ].map((n) => (
            <label key={n.label} className="flex items-start gap-3 cursor-pointer">
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
            Save Preferences
          </button>
        </div>
      )}

      {/* Security Tab */}
      {tab === 'security' && (
        <div className="max-w-lg space-y-5">
          {/* Change Password */}
          <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold">Change Password</h2>
            {[
              { label: 'Current Password', value: currentPassword, setter: setCurrentPassword },
              { label: 'New Password', value: newPassword, setter: setNewPassword },
              { label: 'Confirm New Password', value: confirmPassword, setter: setConfirmPassword },
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
            {passwordMutation.isSuccess && <p className="text-xs text-green-400">Password updated successfully.</p>}
            {passwordMutation.isError && <p className="text-xs text-red-400">Failed to update password.</p>}
            <button
              onClick={() => passwordMutation.mutate({ currentPassword, newPassword })}
              disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || passwordMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {passwordMutation.isPending ? 'Updating…' : 'Update Password'}
            </button>
          </div>

          {/* 2FA */}
          <div className="rounded-xl p-6 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold">Two-Factor Authentication</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Add an extra layer of security to your account with 2FA.
            </p>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
              style={{ background: me?.twoFactorEnabled ? '#ef4444' : 'var(--accent)', color: '#fff' }}
            >
              {me?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>
        </div>
      )}

      {/* Data Tab */}
      {tab === 'data' && (
        <div className="max-w-lg space-y-5">
          <div className="rounded-xl p-6 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold">Export Data</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Download a copy of all your keywords, content, crawl results, and settings.
            </p>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Export My Data (JSON)
            </button>
          </div>

          <div className="rounded-xl p-6 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <h2 className="text-sm font-semibold text-red-400">Delete Account</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
              style={{ background: '#ef4444', color: '#fff' }}
            >
              Delete My Account
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <h2 className="text-lg font-semibold text-red-400">Delete Account</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              This will permanently delete your account and all data. Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full px-4 py-2 rounded-lg outline-none text-sm"
              style={{ background: 'var(--bg-base)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button
                disabled={deleteConfirmText !== 'DELETE'}
                className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
