'use client';
export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart3, Users, Globe, TrendingUp, Eye, MousePointer } from 'lucide-react';

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

  const kpis = [
    { label: 'Toplam Kullanıcı', value: d.summary.totalUsers.toLocaleString('tr-TR'), icon: Users, color: 'indigo' },
    { label: 'Aktif Kullanıcı', value: d.summary.activeUsers.toLocaleString('tr-TR'), icon: Eye, color: 'emerald' },
    { label: 'Bu Ay Yeni', value: `+${d.summary.newUsersThisMonth}`, icon: TrendingUp, color: 'blue' },
    { label: 'Sayfa Görüntüleme', value: d.summary.pageViews.toLocaleString('tr-TR'), icon: Globe, color: 'purple' },
    { label: 'Ort. Oturum Süresi', value: d.summary.avgSessionDuration, icon: MousePointer, color: 'amber' },
    { label: 'Hemen Çıkma', value: d.summary.bounceRate, icon: BarChart3, color: 'red' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Platform Analitiği</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Kullanıcı trafiği ve platform kullanım istatistikleri</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-3">
            <div className={`w-7 h-7 rounded-lg bg-${k.color}-500/15 flex items-center justify-center mb-2`}>
              <k.icon className={`w-3.5 h-3.5 text-${k.color}-400`} />
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mb-0.5">{k.label}</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Traffic trend */}
      <Card>
        <CardHeader><CardTitle>Trafik Trendi (6 Ay)</CardTitle></CardHeader>
        <CardContent>
          <LineChart
            data={d.trafficTrend}
            lines={[
              { key: 'users', color: '#6366f1', label: 'Kullanıcı' },
              { key: 'pageViews', color: '#10b981', label: 'Sayfa Görüntüleme' },
            ]}
            xKey="date"
            yFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top pages */}
        <Card>
          <CardHeader><CardTitle>En Çok Ziyaret Edilen Sayfalar</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {d.topPages.map((p, i) => (
                <div key={p.path} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[var(--text-muted)] w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">{p.label}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{p.path}</p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{p.views.toLocaleString('tr-TR')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Traffic sources */}
        <Card>
          <CardHeader><CardTitle>Trafik Kaynakları</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {d.trafficSources.map((s) => (
                <div key={s.source}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--text-secondary)]">{s.source}</span>
                    <span className="font-medium text-[var(--text-primary)]">{s.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] rounded-full transition-all"
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
