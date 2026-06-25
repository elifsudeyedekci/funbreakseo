'use client';
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { admin } from '@/lib/api';
import { Users, CreditCard, TrendingUp, AlertCircle, Activity, DollarSign, ArrowUp } from 'lucide-react';

const STAT_CARDS: Array<{ key: string; label: string; icon: React.ElementType; color: string; bg: string; isCurrency?: boolean }> = [
  { key: 'totalCustomers',      label: 'Toplam Müşteri', icon: Users,       color: '#6C8EF5', bg: 'rgba(108,142,245,0.1)' },
  { key: 'activeSubscriptions', label: 'Aktif Abonelik', icon: CreditCard,  color: '#3DD68C', bg: 'rgba(61,214,140,0.1)' },
  { key: 'mrr',                 label: 'Bu Ay MRR',      icon: DollarSign,  color: '#6C8EF5', bg: 'rgba(108,142,245,0.1)', isCurrency: true },
  { key: 'pastDueOrgs',         label: 'Gecikmiş Ödeme', icon: AlertCircle, color: '#F54A3A', bg: 'rgba(245,74,58,0.1)' },
];

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => admin.dashboard().then((r) => r.data?.data ?? {}),
    refetchInterval: 60_000,
  });

  const { data: health } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => admin.systemHealth().then((r) => r.data?.data ?? null),
    refetchInterval: 30_000,
  });

  const stats = (data ?? {}) as Record<string, unknown>;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Platform genelinde anlık istatistikler</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '6px 12px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
          Canlı
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg, isCurrency }) => {
          const value = stats[key];
          const display: React.ReactNode = isLoading
            ? null
            : isCurrency
              ? (value ? `₺${Number(value).toLocaleString('tr-TR')}` : '—')
              : (typeof value === 'string' || typeof value === 'number' ? value : '—');
          return (
            <div key={key} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ borderRadius: 10, padding: 10, background: bg, flexShrink: 0 }}>
                  <Icon style={{ width: 20, height: 20, color }} />
                </div>
                {!isLoading && typeof value === 'number' && value > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600, color: 'var(--success)' }}>
                    <ArrowUp style={{ width: 12, height: 12 }} />
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {isLoading
                  ? <span style={{ display: 'inline-block', width: 64, height: 32, background: 'var(--bg-elevated)', borderRadius: 6 }} />
                  : display}
              </p>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}60, transparent)`, borderRadius: '0 0 12px 12px' }} />
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 16 }}>Son 7 Gün — Yeni Kayıt</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div style={{ width: 64, height: 12, background: 'var(--bg-elevated)', borderRadius: 4 }} />
                  <div style={{ flex: 1, height: 8, background: 'var(--bg-elevated)', borderRadius: 4 }} />
                  <div style={{ width: 24, height: 12, background: 'var(--bg-elevated)', borderRadius: 4 }} />
                </div>
              ))}
            </div>
          ) : !(stats.newUsersByDay as unknown[])?.length ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, fontSize: 14, color: 'var(--text-muted)' }}>Henüz veri yok</div>
          ) : (
            <div className="space-y-3">
              {(stats.newUsersByDay as { date: string; count: number }[]).map((d) => (
                <div key={d.date} className="flex items-center gap-3">
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 80, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{d.date}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--bg-elevated)' }}>
                    <div style={{
                      height: '100%', borderRadius: 999,
                      width: `${Math.min((d.count / (Number(stats.maxDailyUsers) || 1)) * 100, 100)}%`,
                      background: 'linear-gradient(90deg, #6C8EF5, #B06EF5)'
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 16 }}>Sistem Sağlığı</h2>
          {!health ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-muted)', padding: '16px 0' }}>
              <Activity style={{ width: 16, height: 16 }} />
              <span>Yükleniyor...</span>
            </div>
          ) : (
            <div>
              {Object.entries(health as Record<string, { status: string; latency?: number }>).map(([key, val], i, arr) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'capitalize' }}>{key}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {val.latency !== undefined && (
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{val.latency}ms</span>
                    )}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 999, border: '1px solid',
                      ...(val.status === 'ok'
                        ? { background: 'rgba(61,214,140,0.1)', color: '#3DD68C', borderColor: 'rgba(61,214,140,0.25)' }
                        : { background: 'rgba(245,74,58,0.1)', color: '#F54A3A', borderColor: 'rgba(245,74,58,0.25)' })
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: val.status === 'ok' ? '#3DD68C' : '#F54A3A' }} />
                      {val.status === 'ok' ? 'Sağlıklı' : 'Hata'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* API Usage */}
      <div className="card p-6">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Bu Ay API Harcamaları</h2>
          <TrendingUp style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'DataForSEO SERP',   key: 'dataforseoSerp',    color: '#6C8EF5' },
            { label: 'DataForSEO Kelime', key: 'dataforseoKeyword', color: '#60A5FA' },
            { label: 'LLM (Claude/GPT)',  key: 'llm',               color: '#B06EF5' },
            { label: 'Crawler',           key: 'crawler',           color: '#3DD68C' },
          ].map((item) => {
            const usage = stats.apiUsage as Record<string, number> | undefined;
            return (
              <div key={item.key} style={{ borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', padding: '14px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{item.label}</p>
                <p style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: item.color }}>
                  {usage?.[item.key] !== undefined ? `$${usage[item.key].toFixed(2)}` : '—'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
