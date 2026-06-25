'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { LineChart } from '@/components/charts/LineChart';
import { useToast } from '@/components/ui/Toaster';
import { Save } from 'lucide-react';

const MOCK_FINANCE = {
  revenue: 48250,
  expenses: 2515,
  netProfit: 45735,
  mrr: 48250,
  profitMargin: 94.8,
  revenueBreakdown: { subscriptions: 42000, renewals: 4500, backlinkMarket: 1500, walletTopups: 250 },
  expenseBreakdown: { dataForSeo: 820, llm: 1240, autopilot: 320, server: 135 },
  trend: [
    { month: 'Oca', revenue: 38000, expenses: 2100, profit: 35900 },
    { month: 'Şub', revenue: 40500, expenses: 2200, profit: 38300 },
    { month: 'Mar', revenue: 42000, expenses: 2300, profit: 39700 },
    { month: 'Nis', revenue: 43500, expenses: 2350, profit: 41150 },
    { month: 'May', revenue: 45000, expenses: 2420, profit: 42580 },
    { month: 'Haz', revenue: 48250, expenses: 2515, profit: 45735 },
  ],
  notificationSettings: {
    weeklyDigestEmail: 'doganizzetcan@gmail.com',
    enableWeeklyDigest: true,
    enableSaleNotification: true,
    saleNotificationEmail: 'doganizzetcan@gmail.com',
  },
};

export default function FinancePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editingNotif, setEditingNotif] = useState(false);
  const [notifValues, setNotifValues] = useState({
    weeklyDigestEmail: MOCK_FINANCE.notificationSettings.weeklyDigestEmail,
    enableWeeklyDigest: MOCK_FINANCE.notificationSettings.enableWeeklyDigest,
    enableSaleNotification: MOCK_FINANCE.notificationSettings.enableSaleNotification,
    saleNotificationEmail: MOCK_FINANCE.notificationSettings.saleNotificationEmail,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-finance'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/revenue'); return r.data; } catch { return MOCK_FINANCE; } },
  });

  const updateMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => adminApi.put('/admin/finance/settings', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-finance'] }); toast('Bildirim ayarları güncellendi', 'success'); setEditingNotif(false); },
    onError: () => toast('Güncelleme başarısız', 'error'),
  });

  const rawData = (data ?? {}) as Partial<typeof MOCK_FINANCE>;
  const f: typeof MOCK_FINANCE = {
    ...MOCK_FINANCE,
    ...rawData,
    notificationSettings: rawData.notificationSettings ?? MOCK_FINANCE.notificationSettings,
    revenueBreakdown: rawData.revenueBreakdown ?? MOCK_FINANCE.revenueBreakdown,
    expenseBreakdown: rawData.expenseBreakdown ?? MOCK_FINANCE.expenseBreakdown,
    trend: rawData.trend ?? MOCK_FINANCE.trend,
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Finans</h1>
          <p>Net kâr görünümü ve finansal bildirim ayarları</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {[
          { label: 'Toplam Kazanç', value: `₺${f.revenue.toLocaleString('tr-TR')}`, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
          { label: 'Toplam Gider', value: `$${f.expenses.toLocaleString()}`, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
          { label: 'Net Kâr', value: `₺${f.netProfit.toLocaleString('tr-TR')}`, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
          { label: 'MRR', value: `₺${f.mrr.toLocaleString('tr-TR')}`, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
          { label: 'Kâr Marjı', value: `%${f.profitMargin.toFixed(1)}`, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
        ].map((kpi) => (
          <div key={kpi.label} className="stat-card">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: kpi.bg, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: kpi.color, display: 'block' }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>{kpi.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{kpi.value}</p>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${kpi.color}80, transparent)`, borderRadius: '0 0 12px 12px' }} />
          </div>
        ))}
      </div>

      {/* Trend + Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="section-card">
          <div className="section-card-header"><span className="section-card-title">Gelir/Gider Trendi</span></div>
          <div style={{ padding: 20 }}>
            <LineChart
              data={f.trend}
              lines={[
                { key: 'revenue', color: '#22c55e', label: 'Gelir (₺)' },
                { key: 'expenses', color: '#ef4444', label: 'Gider ($)' },
                { key: 'profit', color: '#6366f1', label: 'Net Kâr (₺)' },
              ]}
              xKey="month"
              yFormatter={(v) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="section-card">
            <div className="section-card-header"><span className="section-card-title">Gelir Dağılımı</span></div>
            <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(f.revenueBreakdown).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₺{v.toLocaleString('tr-TR')}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="section-card">
            <div className="section-card-header"><span className="section-card-title">Gider Dağılımı</span></div>
            <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(f.expenseBreakdown).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k}</span>
                  <span style={{ fontWeight: 600, color: '#ef4444' }}>${v.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title">Finansal Bildirim Ayarları</span>
          {!editingNotif && (
            <Button size="sm" variant="secondary" onClick={() => setEditingNotif(true)}>Düzenle</Button>
          )}
        </div>
        <div style={{ padding: 20 }}>
          {editingNotif ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={notifValues.enableWeeklyDigest}
                  onChange={(e) => setNotifValues((p) => ({ ...p, enableWeeklyDigest: e.target.checked }))}
                  style={{ accentColor: '#6366f1' }} />
                <span style={{ color: 'var(--text-primary)' }}>Haftalık özet e-postası gönder</span>
              </label>
              <Input label="Haftalık Özet E-postası" type="email" value={notifValues.weeklyDigestEmail}
                onChange={(e) => setNotifValues((p) => ({ ...p, weeklyDigestEmail: e.target.value }))} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={notifValues.enableSaleNotification}
                  onChange={(e) => setNotifValues((p) => ({ ...p, enableSaleNotification: e.target.checked }))}
                  style={{ accentColor: '#6366f1' }} />
                <span style={{ color: 'var(--text-primary)' }}>Her satışta anlık bildirim</span>
              </label>
              <Input label="Satış Bildirim E-postası" type="email" value={notifValues.saleNotificationEmail}
                onChange={(e) => setNotifValues((p) => ({ ...p, saleNotificationEmail: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="primary" icon={<Save className="w-4 h-4" />} loading={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ notificationSettings: notifValues })}>Kaydet</Button>
                <Button variant="ghost" onClick={() => setEditingNotif(false)}>İptal</Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.notificationSettings.enableWeeklyDigest ? '#22c55e' : 'var(--border-default)', display: 'block', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)' }}>Haftalık özet: </span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{f.notificationSettings.weeklyDigestEmail}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.notificationSettings.enableSaleNotification ? '#22c55e' : 'var(--border-default)', display: 'block', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)' }}>Satış bildirimi: </span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{f.notificationSettings.saleNotificationEmail}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
