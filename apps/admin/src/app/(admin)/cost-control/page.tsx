'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { BarChart } from '@/components/charts/BarChart';
import { AlertTriangle, Zap, DollarSign } from 'lucide-react';

interface CostItem {
  id: string;
  name: string;
  label: string;
  spentThisMonth: number;
  monthlyLimit: number;
  behavior: 'STOP' | 'WARN' | 'CONTINUE';
  currency: string;
}

interface KillSwitch {
  totalMonthlyBudget: number;
  currentSpend: number;
  threshold: number;
  behavior: 'STOP' | 'WARN';
  isActive: boolean;
}

const MOCK_COSTS: CostItem[] = [
  { id: 'llm', name: 'LLM', label: 'LLM (OpenAI / Claude)', spentThisMonth: 1240, monthlyLimit: 2000, behavior: 'WARN', currency: 'USD' },
  { id: 'dataforseo-serp', name: 'DATAFORSEO_SERP', label: 'DataForSEO SERP', spentThisMonth: 420, monthlyLimit: 800, behavior: 'STOP', currency: 'USD' },
  { id: 'dataforseo-keyword', name: 'DATAFORSEO_KEYWORD', label: 'DataForSEO Kelime', spentThisMonth: 180, monthlyLimit: 400, behavior: 'WARN', currency: 'USD' },
  { id: 'dataforseo-backlink', name: 'DATAFORSEO_BACKLINK', label: 'DataForSEO Backlink', spentThisMonth: 150, monthlyLimit: 300, behavior: 'STOP', currency: 'USD' },
  { id: 'dataforseo-geo', name: 'DATAFORSEO_GEO', label: 'DataForSEO GEO', spentThisMonth: 70, monthlyLimit: 200, currency: 'USD', behavior: 'WARN' },
  { id: 'autopilot', name: 'AUTOPILOT', label: 'Autopilot İçerik', spentThisMonth: 320, monthlyLimit: 600, behavior: 'STOP', currency: 'USD' },
  { id: 'outreach-mail', name: 'OUTREACH_MAIL', label: 'Outreach Mail (SMTP)', spentThisMonth: 45, monthlyLimit: 100, behavior: 'CONTINUE', currency: 'USD' },
  { id: 'crawler', name: 'CRAWLER', label: 'Web Crawler', spentThisMonth: 90, monthlyLimit: 200, behavior: 'WARN', currency: 'USD' },
];

const MOCK_KILL_SWITCH: KillSwitch = {
  totalMonthlyBudget: 5000,
  currentSpend: 2515,
  threshold: 90,
  behavior: 'STOP',
  isActive: true,
};

const MOCK_CUSTOMER_COSTS = [
  { customer: 'Müşteri 1', llm: 120, dataForSeo: 80, total: 200 },
  { customer: 'Müşteri 2', llm: 240, dataForSeo: 160, total: 400 },
  { customer: 'Müşteri 3', llm: 60, dataForSeo: 40, total: 100 },
  { customer: 'Müşteri 4', llm: 180, dataForSeo: 120, total: 300 },
  { customer: 'Müşteri 5', llm: 90, dataForSeo: 60, total: 150 },
];

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500';
  return (
    <div className="w-full h-1.5 bg-[var(--bg-overlay)] rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CostControlPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-cost-control'],
    queryFn: async () => {
      try { const r = await adminApi.get('/admin/cost-control'); return r.data; }
      catch { return { items: MOCK_COSTS, killSwitch: MOCK_KILL_SWITCH }; }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, limit, behavior }: { id: string; limit: number; behavior: string }) =>
      adminApi.patch(`/admin/cost-control/${id}`, { limit, behavior }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-cost-control'] }); toast('Limit güncellendi', 'success'); },
    onError: () => toast('Güncelleme başarısız', 'error'),
  });

  const killSwitchMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => adminApi.put('/admin/cost-control/kill-switch', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-cost-control'] }); toast('Kill-switch güncellendi', 'success'); },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, { limit: string; behavior: string }>>({});

  const items = (data?.items ?? MOCK_COSTS) as CostItem[];
  const ks = (data?.killSwitch ?? MOCK_KILL_SWITCH) as KillSwitch;

  const totalSpend = items.reduce((a, i) => a + i.spentThisMonth, 0);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Maliyet Kontrol Merkezi</h1>
          <p>Bu ay toplam: ${totalSpend.toLocaleString()}</p>
        </div>
      </div>

      {/* Global Kill Switch */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            <Zap className="w-4 h-4" />
            Global Kill-Switch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Aylık Toplam Bütçe ($)</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">${ks.totalMonthlyBudget.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Mevcut Harcama</p>
              <p className="text-2xl font-bold">${ks.currentSpend.toLocaleString()}</p>
              <ProgressBar value={ks.currentSpend} max={ks.totalMonthlyBudget} />
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{Math.round((ks.currentSpend / ks.totalMonthlyBudget) * 100)}% kullanıldı</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Eşik (%)</p>
              <p className="text-2xl font-bold">{ks.threshold}%</p>
            </div>
            <div className="flex gap-2">
              <Badge variant={ks.behavior === 'STOP' ? 'danger' : 'warning'}>{ks.behavior}</Badge>
              <Badge variant={ks.isActive ? 'success' : 'default'}>{ks.isActive ? 'Aktif' : 'Pasif'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-item cost controls */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">API Kalemleri</h2>
        {items.map((item) => {
          const pct = Math.round((item.spentThisMonth / item.monthlyLimit) * 100);
          const remaining = item.monthlyLimit - item.spentThisMonth;
          const isEditing = editingId === item.id;
          const ev = editValues[item.id] ?? { limit: String(item.monthlyLimit), behavior: item.behavior };

          return (
            <Card key={item.id} className="p-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[var(--text-muted)]">
                      ${item.spentThisMonth} / ${item.monthlyLimit} — ${remaining} kalan
                    </span>
                    <Badge variant={pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'success'}>{pct}%</Badge>
                  </div>
                  <ProgressBar value={item.spentThisMonth} max={item.monthlyLimit} />
                </div>

                {isEditing ? (
                  <div className="flex items-end gap-2 flex-wrap">
                    <Input label="Limit ($)" type="number" value={ev.limit}
                      onChange={(e) => setEditValues((p) => ({ ...p, [item.id]: { ...ev, limit: e.target.value } }))}
                      className="w-28" />
                    <Select label="Davranış" options={[
                      { value: 'STOP', label: 'Durdur' },
                      { value: 'WARN', label: 'Uyar' },
                      { value: 'CONTINUE', label: 'Devam' },
                    ]} value={ev.behavior}
                      onChange={(e) => setEditValues((p) => ({ ...p, [item.id]: { ...ev, behavior: e.target.value } }))} />
                    <Button size="sm" variant="success"
                      onClick={() => {
                        updateMutation.mutate({ id: item.id, limit: Number(ev.limit), behavior: ev.behavior });
                        setEditingId(null);
                      }}
                      loading={updateMutation.isPending}>Kaydet</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>İptal</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant={item.behavior === 'STOP' ? 'danger' : item.behavior === 'WARN' ? 'warning' : 'success'}>
                      {item.behavior}
                    </Badge>
                    <Button size="xs" variant="ghost"
                      onClick={() => { setEditingId(item.id); setEditValues((p) => ({ ...p, [item.id]: { limit: String(item.monthlyLimit), behavior: item.behavior } })); }}>
                      Düzenle
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Customer cost table */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> Müşteri Bazlı Maliyet</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-left py-2 px-3 text-xs text-[var(--text-muted)] uppercase">Müşteri</th>
                  <th className="text-right py-2 px-3 text-xs text-[var(--text-muted)] uppercase">LLM ($)</th>
                  <th className="text-right py-2 px-3 text-xs text-[var(--text-muted)] uppercase">DataForSEO ($)</th>
                  <th className="text-right py-2 px-3 text-xs text-[var(--text-muted)] uppercase">Toplam ($)</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_CUSTOMER_COSTS.map((r) => (
                  <tr key={r.customer} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]">
                    <td className="py-2 px-3 font-medium">{r.customer}</td>
                    <td className="py-2 px-3 text-right">${r.llm}</td>
                    <td className="py-2 px-3 text-right">${r.dataForSeo}</td>
                    <td className="py-2 px-3 text-right font-bold">${r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Trend chart */}
      <Card>
        <CardHeader><CardTitle>Aylık Maliyet Trendi</CardTitle></CardHeader>
        <CardContent>
          <BarChart
            data={[
              { month: 'Oca', llm: 800, dataForSeo: 600 },
              { month: 'Şub', llm: 950, dataForSeo: 700 },
              { month: 'Mar', llm: 1100, dataForSeo: 750 },
              { month: 'Nis', llm: 1050, dataForSeo: 800 },
              { month: 'May', llm: 1200, dataForSeo: 820 },
              { month: 'Haz', llm: 1240, dataForSeo: 820 },
            ]}
            bars={[
              { key: 'llm', color: '#6366f1', label: 'LLM ($)' },
              { key: 'dataForSeo', color: '#10b981', label: 'DataForSEO ($)' },
            ]}
            xKey="month"
            stacked
          />
        </CardContent>
      </Card>
    </div>
  );
}
