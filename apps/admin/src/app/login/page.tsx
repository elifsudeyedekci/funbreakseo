'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAdminAuthStore } from '@/store/auth.store';

export default function AdminLoginPage() {
  const router = useRouter();
  const { setAuth } = useAdminAuthStore();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.post('/auth/login', { email, password });
      const payload = res.data.data;
      const { user, tokens } = payload as { user: { role: string }, tokens: { accessToken: string; refreshToken: string } };
      if (!['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(user.role)) {
        setError('Bu panele erişim yetkiniz yok.');
        return;
      }
      if (tokens.refreshToken) localStorage.setItem('admin_refresh_token', tokens.refreshToken);
      setAuth(user, tokens.accessToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Giriş başarısız. E-posta veya şifrenizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--accent)] mb-4">
            <span className="text-white font-bold text-xl">FB</span>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Admin Girişi</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">FunBreak SEO Yönetim Paneli</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-[var(--danger)]/10 border border-[var(--danger)]/20 p-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--text-primary)]">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full h-10 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
              placeholder="admin@funbreakseo.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--text-primary)]">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full h-10 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-md bg-[var(--accent)] text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
