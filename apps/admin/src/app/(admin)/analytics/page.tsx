'use client';
export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { PageSpinner } from '@/components/ui/Spinner';

interface ProviderUsage { provider: string; _sum: { costUsd: string | null; tokens: number | null }; _count: { id: number } }
interface CustomerUsage { organizationId: string; _sum: { costUsd: string | null; tokens: number | null }; _count: { id: number } }
interface ApiUsageData { totalCost: number; byProvider: ProviderUsage[]; byCustomer: CustomerUsage[] }

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      try {
        const r = await adminApi.get('/admin/api-usage');
        const raw = r.data?.data ?? r.data;
        if (raw && typeof raw === 'object' && 'byProvider' in raw) return raw as ApiUsageData;
        return { totalCost: 0, byProvider: [], byCustomer: [] } as ApiUsageData;
      } catch {
        return { totalCost: 0, byProvider: [], byCustomer: [] } as ApiUsageData;
      }
    },
  });

  if (isLoading) return <PageSpinner />;
  const d = data ?? { totalCost: 0, byProvider: [], byCustomer: [] };

  const PROVIDER_COLORS: Record<string, string> = {
    dataforseo: '#6366f1', claude: '#a855f7', openai: '#22c55e', crawler: '#3DD68C',
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Platform Analitiği</h1>
          <p>Bu ay API harcamaları ve kullanım istatistikleri</p>
        </div>
      </div>

      {/* Total cost KPI */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { label: 'Bu Ay Toplam Maliyet', value: `$${Number(d.totalCost ?? 0).toFixed(2)}`, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
          { label: 'Toplam İstek', value: d.byProvider.reduce((s, p) => s + (p._count?.id ?? 0), 0).toLocaleString('tr-TR'), color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
          { label: 'Aktif Sağlayıcı', value: d.byProvider.length, color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
        ].map((k) => (
          <div key={k.label} className="stat-card">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: k.bg, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: k.color, display: 'block' }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>{k.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{k.value}</p>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${k.color}80, transparent)`, borderRadius: '0 0 12px 12px' }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* By provider */}
        <div className="section-card">
          <div className="section-card-header"><span className="section-card-title">Sağlayıcıya Göre Maliyet</span></div>
          <div style={{ padding: 20 }}>
            {d.byProvider.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Bu ay veri yok</p>
            ) : d.byProvider.map((p) => {
              const cost = Number(p._sum?.costUsd ?? 0);
              const total = Number(d.totalCost) || 1;
              const pct = Math.round((cost / total) * 100);
              const color = PROVIDER_COLORS[p.provider?.toLowerCase()] ?? '#6C8EF5';
              return (
                <div key={p.provider} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{p.provider}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>${cost.toFixed(2)} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{p._count?.id ?? 0} istek · {((p._sum?.tokens ?? 0) as number).toLocaleString('tr-TR')} token</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top customers by cost */}
        <div className="section-card">
          <div className="section-card-header"><span className="section-card-title">En Yüksek Harcayan Müşteriler</span></div>
          <div style={{ padding: 20 }}>
            {d.byCustomer.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Bu ay veri yok</p>
            ) : d.byCustomer.slice(0, 10).map((c, i) => {
              const cost = Number(c._sum?.costUsd ?? 0);
              return (
                <div key={c.organizationId} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', width: 18, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.organizationId.slice(0, 8)}...
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c._count?.id ?? 0} istek</p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#6366f1', flexShrink: 0 }}>${cost.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
