'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAdminAuthStore } from '@/store/auth.store';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { setAuth } = useAdminAuthStore();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPass, setShowPass] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.post('/auth/login', { email, password });
      const payload = res.data.data;
      const { user, tokens } = payload as {
        user: { id: string; email: string; fullName: string; role: string };
        tokens: { accessToken: string; refreshToken: string };
      };
      if (!['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(user.role)) {
        setError('Bu panele erişim yetkiniz yok.');
        return;
      }
      if (tokens.refreshToken) localStorage.setItem('admin_refresh_token', tokens.refreshToken);
      document.cookie = `admin_token=${tokens.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, var(--geo-accent) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-[380px] relative z-10">
        {/* Logo block */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--geo-accent))' }}>
            <span className="text-white font-black text-xl tracking-tight">FB</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Admin Paneli
          </h1>
          <p className="text-sm mt-1.5 flex items-center justify-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <Shield className="w-3.5 h-3.5" />
            FunBreak SEO — Yönetici Girişi
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 shadow-2xl"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 0 0 1px rgba(96,137,240,0.08), 0 20px 60px rgba(0,0,0,0.4)',
          }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg p-3 text-sm flex items-start gap-2"
                style={{ background: 'var(--danger-dim)', border: '1px solid rgba(248,81,73,0.2)', color: 'var(--danger)' }}>
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                placeholder="admin@funbreakseo.com"
                className="w-full h-10 rounded-lg px-3 text-sm transition-all duration-150"
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full h-10 rounded-lg px-3 pr-10 text-sm transition-all duration-150"
                  style={{
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg text-[13px] font-semibold text-white transition-all duration-150 flex items-center justify-center gap-2 mt-2"
              style={{
                background: loading ? 'var(--accent-hover)' : 'var(--accent)',
                opacity: loading ? 0.8 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-hover)'; }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'; }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : 'Giriş Yap'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] mt-6" style={{ color: 'var(--text-muted)' }}>
          FunBreak SEO Admin — Sadece yetkili personel
        </p>
      </div>
    </div>
  );
}
