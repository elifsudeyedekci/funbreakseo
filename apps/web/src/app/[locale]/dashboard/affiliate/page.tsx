'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { affiliateApi } from '@/lib/api';

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
  const t = useTranslations('affiliatePage');
  const [copied, setCopied] = useState(false);

  const { data: me, isLoading: meLoading } = useQuery<AffiliateMe>({
    queryKey: ['affiliate-me'],
    queryFn: () => affiliateApi.me().then((r) => r.data?.data ?? r.data),
  });

  const { data: referrals, isLoading: refLoading } = useQuery<Referral[]>({
    queryKey: ['affiliate-referrals'],
    queryFn: () => affiliateApi.referrals().then((r) => r.data?.data ?? r.data ?? []),
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

  const referralStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      SIGNED_UP: t('statusSignedUp'),
      CONVERTED: t('statusConverted'),
      CHURNED: t('statusChurned'),
    };
    return map[status] ?? status;
  };

  const stats = [
    { label: t('labelReferrals'), value: me?.referralCount ?? 0, format: (v: number) => v.toLocaleString() },
    { label: t('labelConversions'), value: me?.conversions ?? 0, format: (v: number) => v.toLocaleString() },
    { label: t('labelTotalCommission'), value: me?.totalCommission ?? 0, format: (v: number) => `$${v.toFixed(2)}`, accent: true },
    { label: t('labelPaidOut'), value: me?.paidOut ?? 0, format: (v: number) => `$${v.toFixed(2)}` },
    { label: t('labelPending'), value: me?.pending ?? 0, format: (v: number) => `$${v.toFixed(2)}`, accent: true },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {t('subtitle')}
        </p>
      </div>

      {/* Referral Link */}
      <div className="rounded-xl p-6 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 className="text-sm font-semibold">{t('yourLink')}</h2>
        {meLoading ? (
          <div className="h-10 rounded-lg bg-white/5 animate-pulse" />
        ) : (
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={referralLink}
              placeholder={t('noLink')}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-mono outline-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}
            />
            <button
              onClick={handleCopy}
              disabled={!referralLink}
              className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90 disabled:opacity-40 whitespace-nowrap"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {copied ? t('copied') : t('copyBtn')}
            </button>
          </div>
        )}
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {t('commissionInfo')}
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
              <p className="text-xl font-bold" style={{ color: s.accent ? 'var(--accent)' : 'var(--text-primary)' }}>
                {s.format(s.value)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Referrals Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="text-sm font-semibold">{t('referralsTitle')}</h2>
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
                {[t('colEmail'), t('colStatus'), t('colCommission'), t('colJoined')].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(referrals ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    {t('empty')}
                  </td>
                </tr>
              )}
              {(referrals ?? []).map((ref) => (
                <tr key={ref.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 font-medium">{ref.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${referralStatusStyles[ref.status] ?? ''}`}>
                      {referralStatusLabel(ref.status)}
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
