'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { LineChart } from '@/components/charts/LineChart';
import {
  TrendingUp, Users, UserPlus, UserMinus,
  DollarSign, Clock, CheckCircle, XCircle, Activity, CreditCard,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

const MOCK_DASHBOARD = {
  mrr: 48250,
  mrrGrowth: 12.4,
  activeSubscriptions: 312,
  trialCount: 47,
  newThisMonth: 38,
  churnCount: 5,
  apiCostThisMonth: { dataForSeo: 820, llm: 1240 },
  netProfit: 46190,
  queues: { pending: 14, processed: 2834, failed: 3 },
  pending: { content: 7, outreach: 4, publisherOffer: 2, dispute: 1 },
  recentRegistrations: [
    { id: '1', name: 'Ahmet Yılmaz', email: 'ahmet@example.com', plan: 'GROWTH', registeredAt: new Date(Date.now() - 3600000).toISOString() },
    { id: '2', name: 'Sara Çelik', email: 'sara@example.com', plan: 'STARTER', registeredAt: new Date(Date.now() - 7200000).toISOString() },
    { id: '3', name: 'Mehmet Kaya', email: 'mkaya@example.com', plan: 'PRO', registeredAt: new Date(Date.now() - 86400000).toISOString() },
  ],
  recentPayments: [
    { id: 'p1', customer: 'Ahmet Yılmaz', amount: 299, status: 'PAID', date: new Date(Date.now() - 1800000).toISOString() },
    { id: 'p2', customer: 'TechCo Ltd.', amount: 799, status: 'PAID', date: new Date(Date.now() - 5400000).toISOString() },
    { id: 'p3', customer: 'Elif Demir', amount: 99, status: 'FAILED', date: new Date(Date.now() - 86400000).toISOString() },
  ],
  mrrTrend: [
    { month: 'Oca', mrr: 31000 }, { month: 'Şub', mrr: 33500 }, { month: 'Mar', mrr: 36000 },
    { month: 'Nis', mrr: 38200 }, { month: 'May', mrr: 40100 }, { month: 'Haz', mrr: 41800 },
    { month: 'Tem', mrr: 43200 }, { month: 'Ağu', mrr: 44100 }, { month: 'Eyl', mrr: 45500 },
    { month: 'Eki', mrr: 46200 }, { month: 'Kas', mrr: 47400 }, { month: 'Ara', mrr: 48250 },
  ],
};

function StatCard({ title, value, sub, icon: Icon, trend, colorClass = 'bg-indigo-500/15 text-indigo-400' }: {
  title: string; value: string | number; sub?: string; icon: React.ElementType; trend?: number; colorClass?: string;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${colorClass}`}><Icon className="w-4 h-4" /></div>
        {trend !== undefined && <Badge variant={trend >= 0 ? 'success' : 'danger'}>{trend >= 0 ? '+' : ''}{trend}%</Badge>}
      </div>
      <div>
        <p className="text-xs text-[var(--text-muted)]">{title}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">{value}</p>
        {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      try { const r = await adminApi.get('/admin/dashboard'); return r.data?.data ?? MOCK_DASHBOARD; }
      catch { return MOCK_DASHBOARD; }
    },
  });

  const d = (data ?? MOCK_DASHBOARD) as typeof MOCK_DASHBOARD;
  if (isLoading) return <PageSpinner />;

  const totalApiCost = (d.apiCostThisMonth?.dataForSeo ?? 0) + (d.apiCostThisMonth?.llm ?? 0);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">FunBreak SEO genel durum özeti</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="MRR" value={`₺${d.mrr?.toLocaleString('tr-TR') ?? 0}`} sub="Bu ay" icon={TrendingUp} trend={d.mrrGrowth} colorClass="bg-indigo-500/15 text-indigo-400" />
        <StatCard title="Aktif Abonelik" value={d.activeSubscriptions ?? 0} sub={`${d.trialCount ?? 0} trial`} icon={Users} colorClass="bg-emerald-500/15 text-emerald-400" />
        <StatCard title="Yeni Kayıt" value={d.newThisMonth ?? 0} sub="Bu ay" icon={UserPlus} colorClass="bg-blue-500/15 text-blue-400" />
        <StatCard title="Churn" value={d.churnCount ?? 0} sub="Bu ay" icon={UserMinus} colorClass="bg-red-500/15 text-red-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="DataForSEO" value={`$${d.apiCostThisMonth?.dataForSeo ?? 0}`} sub="Bu ay" icon={Activity} colorClass="bg-yellow-500/15 text-yellow-400" />
        <StatCard title="LLM Maliyet" value={`$${d.apiCostThisMonth?.llm ?? 0}`} sub="Bu ay" icon={DollarSign} colorClass="bg-yellow-500/15 text-yellow-400" />
        <StatCard title="Toplam API" value={`$${totalApiCost}`} sub="Bu ay" icon={CreditCard} colorClass="bg-yellow-500/15 text-yellow-400" />
        <StatCard title="Net Kâr" value={`₺${(d.netProfit ?? 0).toLocaleString('tr-TR')}`} sub="Tahmin" icon={TrendingUp} colorClass="bg-emerald-500/15 text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>MRR Trendi (Son 12 Ay)</CardTitle></CardHeader>
          <CardContent>
            <LineChart data={d.mrrTrend ?? []} lines={[{ key: 'mrr', color: '#5B8DEF', label: 'MRR (₺)' }]} xKey="month" yFormatter={(v) => `₺${(v / 1000).toFixed(0)}K`} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Activity className="w-4 h-4 text-[var(--text-muted)]" />Kuyruk Sağlığı</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Bekleyen', value: d.queues?.pending ?? 0, variant: 'warning' as const },
                { label: 'İşlenen', value: d.queues?.processed ?? 0, variant: 'success' as const },
                { label: 'Hatalı', value: d.queues?.failed ?? 0, variant: 'danger' as const },
              ].map((q) => (
                <div key={q.label} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{q.label}</span>
                  <Badge variant={q.variant}>{q.value.toLocaleString()}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-[var(--text-muted)]" />Onay Bekleyenler</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'İçerik', value: d.pending?.content ?? 0, href: '/content-review' },
                { label: 'Outreach Cevap', value: d.pending?.outreach ?? 0, href: '/outreach-review' },
                { label: 'Yayıncı Teklifi', value: d.pending?.publisherOffer ?? 0, href: '/market' },
                { label: 'Anlaşmazlık', value: d.pending?.dispute ?? 0, href: '/market' },
              ].map((p) => (
                <Link key={p.label} href={p.href} className="flex items-center justify-between text-sm group">
                  <span className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">{p.label}</span>
                  <Badge variant={p.value > 0 ? 'warning' : 'default'}>{p.value}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><UserPlus className="w-4 h-4 text-[var(--text-muted)]" />Son Kayıtlar</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-[var(--border-subtle)]">
              {d.recentRegistrations.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[var(--accent)]">{r.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{r.name}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{r.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant="info">{r.plan}</Badge>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{formatDistanceToNow(new Date(r.registeredAt), { addSuffix: true, locale: tr })}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><CreditCard className="w-4 h-4 text-[var(--text-muted)]" />Son Ödemeler</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-[var(--border-subtle)]">
              {d.recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {p.status === 'PAID' ? <CheckCircle className="w-4 h-4 text-[var(--success)] flex-shrink-0" /> : <XCircle className="w-4 h-4 text-[var(--danger)] flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm text-[var(--text-primary)] truncate">{p.customer}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{formatDistanceToNow(new Date(p.date), { addSuffix: true, locale: tr })}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold">₺{p.amount}</p>
                    <Badge variant={p.status === 'PAID' ? 'success' : 'danger'} className="text-[10px]">{p.status}</Badge>
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
