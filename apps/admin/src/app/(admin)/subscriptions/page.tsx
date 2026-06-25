'use client';
export const dynamic = 'force-dynamic';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { PieChart } from '@/components/charts/PieChart';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useToast } from '@/components/ui/Toaster';
import { AlertTriangle, Gift } from 'lucide-react';

interface Subscription {
  id: string;
  organizationName: string;
  plan: string;
  status: string;
  cycle: string;
  currentPeriodEnd: string;
  paymentRef?: string;
  isComplimentary?: boolean;
  pastDueDays?: number;
}

const MOCK_SUBS: Subscription[] = Array.from({ length: 20 }, (_, i) => ({
  id: `sub-${i}`, organizationName: `Org ${i + 1}`,
  plan: ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'][i % 4],
  status: ['ACTIVE', 'ACTIVE', 'PAST_DUE', 'TRIALING', 'CANCELED'][i % 5],
  cycle: i % 2 === 0 ? 'MONTHLY' : 'YEARLY',
  currentPeriodEnd: new Date(Date.now() + (i - 5) * 86400000 * 15).toISOString(),
  paymentRef: `PAY-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
  isComplimentary: i === 3 || i === 9,
  pastDueDays: i % 5 === 2 ? Math.floor(Math.random() * 30) + 1 : undefined,
}));

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      try { const r = await adminApi.get('/admin/subscriptions', { params: { limit: 100 } }); return r.data?.data ?? MOCK_SUBS; }
      catch { return MOCK_SUBS; }
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.post(`/admin/subscriptions/${id}/suspend`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-subscriptions'] }); toast('Abonelik askıya alındı', 'success'); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const subs = (data ?? MOCK_SUBS) as Subscription[];
  const pastDue = subs.filter((s) => s.status === 'PAST_DUE');
  const planCounts = ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'].map((p, i) => ({
    name: p, value: subs.filter((s) => s.plan === p).length, color: PIE_COLORS[i],
  }));

  const columns: ColumnDef<Subscription>[] = [
    {
      header: 'Organizasyon',
      accessorKey: 'organizationName',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.isComplimentary && <span title="Complimentary"><Gift className="w-3.5 h-3.5 text-purple-400" /></span>}
          <span className="font-medium">{row.original.organizationName}</span>
        </div>
      ),
    },
    { header: 'Plan', accessorKey: 'plan', cell: ({ getValue }) => <Badge variant="info">{getValue() as string}</Badge> },
    {
      header: 'Durum', accessorKey: 'status',
      cell: ({ row }) => {
        const s = row.original;
        const variant = s.status === 'ACTIVE' ? 'success' : s.status === 'PAST_DUE' ? 'danger' : s.status === 'TRIALING' ? 'info' : 'default';
        return (
          <div className="flex items-center gap-2">
            <Badge variant={variant as 'success' | 'danger' | 'info' | 'default'}>{s.status}</Badge>
            {s.pastDueDays && <span className="text-xs text-red-400 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />{s.pastDueDays}g</span>}
          </div>
        );
      },
    },
    { header: 'Dönem', accessorKey: 'cycle', cell: ({ getValue }) => <Badge variant="default">{getValue() as string}</Badge> },
    {
      header: 'Dönem Sonu', accessorKey: 'currentPeriodEnd',
      cell: ({ getValue }) => {
        const d = new Date(getValue() as string);
        return <span className={d < new Date() ? 'text-red-400 text-xs' : 'text-xs text-[var(--text-muted)]'}>{format(d, 'dd MMM yyyy', { locale: tr })}</span>;
      },
    },
    { header: 'Ödeme Ref', accessorKey: 'paymentRef', cell: ({ getValue }) => <span className="font-mono text-xs text-[var(--text-muted)]">{getValue() as string}</span> },
    {
      header: '', id: 'actions',
      cell: ({ row }) => row.original.status === 'PAST_DUE' ? (
        <div className="flex gap-1">
          <Button size="xs" variant="danger" onClick={(e) => { e.stopPropagation(); suspendMutation.mutate(row.original.id); }}>Askıya Al</Button>
          <Button size="xs" variant="secondary">Hatırlat</Button>
        </div>
      ) : null,
    },
  ];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Abonelikler</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">{subs.length} toplam{pastDue.length > 0 && <span className="text-red-400 ml-2">{pastDue.length} gecikmiş</span>}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DataTable columns={columns} data={subs} searchPlaceholder="Organizasyon ara..." emptyMessage="Abonelik bulunamadı." />
        </div>
        <Card>
          <CardHeader><CardTitle className="text-sm">Plan Dağılımı</CardTitle></CardHeader>
          <CardContent><PieChart data={planCounts} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
