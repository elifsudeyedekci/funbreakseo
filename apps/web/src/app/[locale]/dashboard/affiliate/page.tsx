'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface AffiliateMe {
  referralCode: string;
  referralCount: number;
  conversions: number;
  totalCommission: number;
  paidOut: number;
  pending: number;
}

interface Referral {
  id: string;
  email: string;
  status: 'SIGNED_UP' | 'CONVERTED' | 'CHURNED';
  commission: number;
  joinedAt: string;
}

const referralStatusStyles: Record<string, string> = {
  SIGNED_UP: 'bg-blue-400/10 text-blue-400',
  CONVERTED: 'bg-green-400/10 text-green-400',
  CHURNED: 'bg-white/10 text-[var(--text-muted)]',
};

export default function AffiliatePage() {
  const [copied, setCopied] = useState(false);

  const { data: me, isLoading: meLoading } = useQuery<AffiliateMe>({
    queryKey: ['affiliate-me'],
    queryFn: () => api.get('/affiliate/me').then((r: any) => r.data?.data ?? r.data),
  });

  const { data: referrals, isLoading: refLoading } = useQuery<Referral[]>({
    queryKey: ['affiliate-referrals'],
    queryFn: () => api.get('/affiliate/referrals').then((r: any) => r.data?.data ?? r.data ?? []),
  });

  const referralLink = me?.referralCode
    ? `https://funbreakseo.com/?ref=${me.referralCode}`
    : '';

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const stats = [
    { label: 'Referrals', value: me?.referralCount ?? 0, format: (v: number) => v.toLocaleString() },
    { label: 'Conversions', value: me?.conversions ?? 0, format: (v: number) => v.toLocaleString() },
    { label: 'Total Commission', value: me?.totalCommission ?? 0, format: (v: number) => `$${v.toFixed(2)}` },
    { label: 'Paid Out', value: me?.paidOut ?? 0, format: (v: number) => `$${v.toFixed(2)}` },
    { label: 'Pending', value: me?.pending ?? 0, format: (v: number) => `$${v.toFixed(2)}` },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Affiliate Program</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Earn commission by referring new users to FunBreakSEO.
        </p>
      </div>

      {/* Referral Link */}
      <div className="rounded-xl p-6 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 className="text-sm font-semibold">Your Referral Link</h2>
        {meLoading ? (
          <div className="h-10 rounded-lg bg-white/5 animate-pulse" />
        ) : (
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={referralLink}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-mono outline-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
            />
            <button
              onClick={handleCopy}
              disabled={!referralLink}
              className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90 disabled:opacity-40 whitespace-nowrap"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        )}
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Share this link to earn commission on every conversion. Commission is paid out monthly.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            {meLoading ? (
              <div className="h-7 w-16 rounded bg-white/5 animate-pulse" />
            ) : (
              <p className="text-xl font-bold" style={{ color: s.label.includes('Commission') || s.label === 'Pending' ? 'var(--accent)' : 'var(--text-primary)' }}>
                {s.format(s.value)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Referrals Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold">Referrals</h2>
        </div>
        {refLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Email', 'Status', 'Commission', 'Joined'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(referrals ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No referrals yet. Share your link to get started.
                  </td>
                </tr>
              )}
              {(referrals ?? []).map((ref) => (
                <tr key={ref.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 font-medium">{ref.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${referralStatusStyles[ref.status] ?? ''}`}>
                      {ref.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--accent)' }}>
                    ${(ref.commission ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                    {ref.joinedAt ? new Date(ref.joinedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
