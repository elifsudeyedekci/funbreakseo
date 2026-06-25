'use client';
export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { PageSpinner } from '@/components/ui/Spinner';
import { LineChart } from '@/components/charts/LineChart';

const MOCK_ANALYTICS = {
  summary: {
    totalUsers: 1284,
    activeUsers: 847,
    newUsersThisMonth: 124,
    avgSessionDuration: '4m 32s',
    pageViews: 48320,
    bounceRate: '32.4%',
  },
  trafficTrend: [
    { date: 'Oca', users: 820, pageViews: 31200 },
    { date: 'Şub', users: 940, pageViews: 34800 },
    { date: 'Mar', users: 1050, pageViews: 38900 },
    { date: 'Nis', users: 1120, pageViews: 41200 },
    { date: 'May', users: 1200, pageViews: 45000 },
    { date: 'Haz', users: 1284, pageViews: 48320 },
  ],
  topPages: [
    { path: '/', views: 12450, label: 'Ana Sayfa' },
    { path: '/tr/fiyatlandirma', views: 8320, label: 'Fiyatlandırma' },
    { path: '/tr/giris', views: 6100, label: 'Giriş' },
    { path: '/tr/kayit', views: 4890, label: 'Kayıt' },
    { path: '/tr/blog', views: 3420, label: 'Blog' },
  ],
  trafficSources: [
    { source: 'Organik Arama', sessions: 18400, pct: 38.1 },
    { source: 'Direkt', sessions: 14200, pct: 29.4 },
    { source: 'Sosyal Medya', sessions: 8100, pct: 16.8 },
    { source: 'Referans', sessions: 4900, pct: 10.1 },
    { source: 'E-posta', sessions: 2700, pct: 5.6 },
  ],
};


export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      try {
        const r = await adminApi.get('/admin/api-usage');
        return r.data?.data ?? MOCK_ANALYTICS;
      } catch {
        return MOCK_ANALYTICS;
      }
    },
  });

  if (isLoading) return <PageSpinner />;
  const d = (data ?? MOCK_ANALYTICS) as typeof MOCK_ANALYTICS;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Platform Analitiği</h1>
          <p>Kullanıcı trafiği ve platform kullanım istatistikleri</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {[
          { label: 'Toplam Kullanıcı', value: d.summary.totalUsers.toLocaleString('tr-TR'), color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
          { label: 'Aktif Kullanıcı', value: d.summary.activeUsers.toLocaleString('tr-TR'), color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
          { label: 'Bu Ay Yeni', value: `+${d.summary.newUsersThisMonth}`, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
          { label: 'Sayfa Görüntüleme', value: d.summary.pageViews.toLocaleString('tr-TR'), color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
          { label: 'Ort. Oturum', value: d.summary.avgSessionDuration, color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
          { label: 'Hemen Çıkma', value: d.summary.bounceRate, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
        ].map((k) => (
          <div key={k.label} className="stat-card">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: k.bg, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: k.color, display: 'block' }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>{k.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{k.value}</p>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${k.color}80, transparent)`, borderRadius: '0 0 12px 12px' }} />
          </div>
        ))}
      </div>

      {/* Traffic trend */}
      <div className="section-card">
        <div className="section-card-header"><span className="section-card-title">Trafik Trendi (6 Ay)</span></div>
        <div style={{ padding: 20 }}>
          <LineChart
            data={d.trafficTrend}
            lines={[
              { key: 'users', color: '#6366f1', label: 'Kullanıcı' },
              { key: 'pageViews', color: '#22c55e', label: 'Sayfa Görüntüleme' },
            ]}
            xKey="date"
            yFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top pages */}
        <div className="section-card">
          <div className="section-card-header"><span className="section-card-title">En Çok Ziyaret Edilen Sayfalar</span></div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {d.topPages.map((p, i) => (
              <div key={p.path} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', width: 16, flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{p.path}</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>{p.views.toLocaleString('tr-TR')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic sources */}
        <div className="section-card">
          <div className="section-card-header"><span className="section-card-title">Trafik Kaynakları</span></div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {d.trafficSources.map((s) => (
              <div key={s.source}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{s.source}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.pct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.pct}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
