'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { LineChart } from '@/components/charts/LineChart';
import { useToast } from '@/components/ui/Toaster';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Save } from 'lucide-react';

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

  const f = (data ?? MOCK_FINANCE) as typeof MOCK_FINANCE;

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Finans & Bildirim</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Net kâr görünümü ve finansal bildirim ayarları</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Toplam Kazanç', value: `₺${f.revenue.toLocaleString('tr-TR')}`, icon: TrendingUp, color: 'emerald' },
          { label: 'Toplam Gider', value: `$${f.expenses.toLocaleString()}`, icon: TrendingDown, color: 'red' },
          { label: 'Net Kâr', value: `₺${f.netProfit.toLocaleString('tr-TR')}`, icon: DollarSign, color: 'indigo' },
          { label: 'MRR', value: `₺${f.mrr.toLocaleString('tr-TR')}`, icon: CreditCard, color: 'blue' },
          { label: 'Kâr Marjı', value: `%${f.profitMargin.toFixed(1)}`, icon: TrendingUp, color: 'emerald' },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-3">
            <div className={`p-1.5 rounded-lg bg-${kpi.color}-500/15 w-fit mb-2`}>
              <kpi.icon className={`w-4 h-4 text-${kpi.color}-400`} />
            </div>
            <p className="text-xs text-[var(--text-muted)]">{kpi.label}</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* Breakdown + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Gelir/Gider Trendi</CardTitle></CardHeader>
          <CardContent>
            <LineChart
              data={f.trend}
              lines={[
                { key: 'revenue', color: '#10b981', label: 'Gelir (₺)' },
                { key: 'expenses', color: '#ef4444', label: 'Gider ($)' },
                { key: 'profit', color: '#6366f1', label: 'Net Kâr (₺)' },
              ]}
              xKey="month"
              yFormatter={(v) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Gelir Dağılımı</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              {Object.entries(f.revenueBreakdown).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[var(--text-muted)] capitalize">{k}</span>
                  <span className="font-medium">₺{v.toLocaleString('tr-TR')}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Gider Dağılımı</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              {Object.entries(f.expenseBreakdown).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[var(--text-muted)] capitalize">{k}</span>
                  <span className="font-medium text-red-400">${v.toLocaleString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Finansal Bildirim Ayarları
            {!editingNotif && (
              <Button size="sm" variant="secondary" onClick={() => setEditingNotif(true)}>Düzenle</Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingNotif ? (
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={notifValues.enableWeeklyDigest}
                  onChange={(e) => setNotifValues((p) => ({ ...p, enableWeeklyDigest: e.target.checked }))}
                  className="accent-indigo-500" />
                <span className="text-sm text-[var(--text-primary)]">Haftalık özet e-postası gönder</span>
              </label>
              <Input label="Haftalık Özet E-postası" type="email" value={notifValues.weeklyDigestEmail}
                onChange={(e) => setNotifValues((p) => ({ ...p, weeklyDigestEmail: e.target.value }))} />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={notifValues.enableSaleNotification}
                  onChange={(e) => setNotifValues((p) => ({ ...p, enableSaleNotification: e.target.checked }))}
                  className="accent-indigo-500" />
                <span className="text-sm text-[var(--text-primary)]">Her satışta anlık bildirim</span>
              </label>
              <Input label="Satış Bildirim E-postası" type="email" value={notifValues.saleNotificationEmail}
                onChange={(e) => setNotifValues((p) => ({ ...p, saleNotificationEmail: e.target.value }))} />
              <div className="flex gap-2">
                <Button variant="primary" icon={<Save className="w-4 h-4" />} loading={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ notificationSettings: notifValues })}>
                  Kaydet
                </Button>
                <Button variant="ghost" onClick={() => setEditingNotif(false)}>İptal</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${f.notificationSettings.enableWeeklyDigest ? 'bg-emerald-400' : 'bg-[var(--border-default)]'}`} />
                <span className="text-[var(--text-secondary)]">Haftalık özet: </span>
                <span className="font-medium">{f.notificationSettings.weeklyDigestEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${f.notificationSettings.enableSaleNotification ? 'bg-emerald-400' : 'bg-[var(--border-default)]'}`} />
                <span className="text-[var(--text-secondary)]">Satış bildirimi: </span>
                <span className="font-medium">{f.notificationSettings.saleNotificationEmail}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
