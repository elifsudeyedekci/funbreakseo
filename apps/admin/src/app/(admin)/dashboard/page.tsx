'use client';
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { admin } from '@/lib/api';
import { Users, CreditCard, TrendingUp, AlertCircle, Activity, DollarSign } from 'lucide-react';

function StatCard({ title, value, icon: Icon, change, color = 'accent' }: {
  title: string; value: string | number; icon: typeof Users;
  change?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    accent: 'bg-[var(--accent)]/10 text-[var(--accent)]',
    success: 'bg-[var(--success)]/10 text-[var(--success)]',
    warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
    danger: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  };
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">{title}</p>
        <div className={`rounded-lg p-2 ${colorMap[color]}`}><Icon className="h-4 w-4" /></div>
      </div>
      <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      {change && <p className="mt-1 text-xs text-[var(--text-muted)]">{change}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => admin.dashboard().then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  const { data: health } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => admin.systemHealth().then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = data ?? {};

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Genel platform istatistikleri</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Toplam Müşteri" value={stats.totalCustomers ?? '—'} icon={Users} color="accent" />
        <StatCard title="Aktif Abonelik" value={stats.activeSubscriptions ?? '—'} icon={CreditCard} color="success" />
        <StatCard title="Bu Ay MRR" value={stats.mrr ? `₺${stats.mrr.toLocaleString('tr-TR')}` : '—'} icon={DollarSign} color="accent" />
        <StatCard title="PAST_DUE Org" value={stats.pastDueOrgs ?? '—'} icon={AlertCircle} color="danger" />
      </div>

      {/* Revenue & New Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Son 7 Gün Yeni Kayıt</h2>
          <div className="space-y-2">
            {(stats.newUsersByDay ?? []).map((d: { date: string; count: number }) => (
              <div key={d.date} className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-muted)] w-20">{d.date}</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--border-subtle)]">
                  <div className="h-2 rounded-full bg-[var(--accent)] transition-all" style={{ width: `${Math.min((d.count / (stats.maxDailyUsers || 1)) * 100, 100)}%` }} />
                </div>
                <span className="text-xs font-medium text-[var(--text-primary)] w-8 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Sistem Sağlığı</h2>
          {health ? (
            <div className="space-y-3">
              {Object.entries(health as Record<string, { status: string; latency?: number }>).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)] capitalize">{key}</span>
                  <div className="flex items-center gap-2">
                    {val.latency !== undefined && <span className="text-xs text-[var(--text-muted)]">{val.latency}ms</span>}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${val.status === 'ok' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>
                      {val.status === 'ok' ? '✓ Sağlıklı' : '✗ Hata'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Activity className="h-4 w-4" />
              <span>Sağlık verileri yükleniyor...</span>
            </div>
          )}
        </div>
      </div>

      {/* API Usage */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Bu Ay API Harcamaları</h2>
          <TrendingUp className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'DataForSEO SERP', key: 'dataforseoSerp' },
            { label: 'DataForSEO Kelime', key: 'dataforseoKeyword' },
            { label: 'LLM (Claude/GPT)', key: 'llm' },
            { label: 'Crawler', key: 'crawler' },
          ].map((item) => (
            <div key={item.key} className="text-center">
              <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
              <p className="text-lg font-bold text-[var(--text-primary)] mt-1">
                {stats.apiUsage?.[item.key] !== undefined ? `$${stats.apiUsage[item.key].toFixed(2)}` : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
