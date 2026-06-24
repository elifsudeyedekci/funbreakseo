'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { CheckCircle, TrendingUp, Users, DollarSign } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  commissionRate: number;
  totalReferrals: number;
  pendingPayout: number;
  totalPaid: number;
  status: 'ACTIVE' | 'SUSPENDED';
  joinedAt: string;
}

interface AffiliatePayout {
  id: string;
  affiliateName: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID';
  requestedAt: string;
}

const MOCK_AFFILIATES: Affiliate[] = Array.from({ length: 10 }, (_, i) => ({
  id: `aff-${i}`,
  name: `Affiliate ${i + 1}`,
  email: `affiliate${i + 1}@example.com`,
  referralCode: `AFF${String(i + 1).padStart(3, '0')}`,
  commissionRate: [10, 15, 20][i % 3],
  totalReferrals: Math.floor(Math.random() * 50) + 1,
  pendingPayout: Math.floor(Math.random() * 500),
  totalPaid: Math.floor(Math.random() * 2000),
  status: i === 2 ? 'SUSPENDED' : 'ACTIVE',
  joinedAt: new Date(Date.now() - i * 86400000 * 30).toISOString(),
}));

const MOCK_PAYOUTS: AffiliatePayout[] = Array.from({ length: 8 }, (_, i) => ({
  id: `pay-${i}`,
  affiliateName: `Affiliate ${i + 1}`,
  amount: 50 + i * 30,
  status: ['PENDING', 'APPROVED', 'PAID'][i % 3] as AffiliatePayout['status'],
  requestedAt: new Date(Date.now() - i * 86400000 * 5).toISOString(),
}));

export default function AffiliatePage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: affiliates = MOCK_AFFILIATES, isLoading } = useQuery({
    queryKey: ['admin-affiliates'],
    queryFn: async () => {
      try { const r = await adminApi.get('/admin/affiliates'); return r.data?.data ?? MOCK_AFFILIATES; }
      catch { return MOCK_AFFILIATES; }
    },
  });

  const { data: payouts = MOCK_PAYOUTS } = useQuery({
    queryKey: ['admin-affiliate-payouts'],
    queryFn: async () => {
      try { const r = await adminApi.get('/admin/affiliates/payouts'); return r.data?.data ?? MOCK_PAYOUTS; }
      catch { return MOCK_PAYOUTS; }
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.post(`/admin/affiliates/payouts/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-affiliate-payouts'] }); toast('Ödeme onaylandı', 'success'); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const affList = affiliates as Affiliate[];
  const payList = payouts as AffiliatePayout[];

  const totalPending = payList.filter((p) => p.status === 'PENDING').reduce((a, p) => a + p.amount, 0);
  const totalReferrals = affList.reduce((a, a2) => a + a2.totalReferrals, 0);
  const totalPaid = affList.reduce((a, a2) => a + a2.totalPaid, 0);

  const affCols: ColumnDef<Affiliate>[] = [
    { header: 'Affiliate', accessorKey: 'name', cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-[var(--text-muted)]">{row.original.email}</p>
      </div>
    )},
    { header: 'Kod', accessorKey: 'referralCode', cell: ({ getValue }) => <code className="text-xs bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">{getValue() as string}</code> },
    { header: 'Komisyon', accessorKey: 'commissionRate', cell: ({ getValue }) => <span className="font-semibold">%{getValue() as number}</span> },
    { header: 'Yönlendirme', accessorKey: 'totalReferrals' },
    { header: 'Bekleyen ($)', accessorKey: 'pendingPayout', cell: ({ getValue }) => <span className="font-medium text-yellow-400">${getValue() as number}</span> },
    { header: 'Toplam Ödenen ($)', accessorKey: 'totalPaid', cell: ({ getValue }) => <span>${getValue() as number}</span> },
    { header: 'Durum', accessorKey: 'status', cell: ({ getValue }) => <Badge variant={(getValue() as string) === 'ACTIVE' ? 'success' : 'danger'}>{getValue() as string}</Badge> },
    { header: 'Katılım', accessorKey: 'joinedAt', cell: ({ getValue }) => <span className="text-xs text-[var(--text-muted)]">{format(new Date(getValue() as string), 'dd MMM yyyy', { locale: tr })}</span> },
  ];

  const payoutCols: ColumnDef<AffiliatePayout>[] = [
    { header: 'Affiliate', accessorKey: 'affiliateName' },
    { header: 'Tutar ($)', accessorKey: 'amount', cell: ({ getValue }) => <span className="font-semibold">${getValue() as number}</span> },
    { header: 'Durum', accessorKey: 'status', cell: ({ getValue }) => {
      const s = getValue() as string;
      return <Badge variant={s === 'PAID' ? 'success' : s === 'APPROVED' ? 'info' : 'warning'}>{s}</Badge>;
    }},
    { header: 'Talep Tarihi', accessorKey: 'requestedAt', cell: ({ getValue }) => <span className="text-xs text-[var(--text-muted)]">{formatDistanceToNow(new Date(getValue() as string), { addSuffix: true, locale: tr })}</span> },
    { header: '', id: 'actions', cell: ({ row }) => row.original.status === 'PENDING' ? (
      <Button size="xs" variant="success" icon={<CheckCircle className="w-3 h-3" />}
        onClick={(e) => { e.stopPropagation(); approveMutation.mutate(row.original.id); }}>
        Onayla
      </Button>
    ) : null },
  ];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Affiliate Programı</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">{affList.length} aktif affiliate</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/15"><Users className="w-4 h-4 text-indigo-400" /></div>
          <div><p className="text-xs text-[var(--text-muted)]">Toplam Yönlendirme</p><p className="text-xl font-bold">{totalReferrals}</p></div>
        </Card>
        <Card className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/15"><DollarSign className="w-4 h-4 text-yellow-400" /></div>
          <div><p className="text-xs text-[var(--text-muted)]">Bekleyen Ödemeler</p><p className="text-xl font-bold">${totalPending}</p></div>
        </Card>
        <Card className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/15"><TrendingUp className="w-4 h-4 text-emerald-400" /></div>
          <div><p className="text-xs text-[var(--text-muted)]">Toplam Ödenen</p><p className="text-xl font-bold">${totalPaid.toLocaleString()}</p></div>
        </Card>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Affiliateler</h2>
          <DataTable columns={affCols} data={affList} searchPlaceholder="Ad, email, kod ara..." emptyMessage="Affiliate bulunamadı." />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Ödeme Talepleri</h2>
          <DataTable columns={payoutCols} data={payList} searchPlaceholder="Affiliate ara..." emptyMessage="Ödeme talebi bulunamadı." />
        </div>
      </div>
    </div>
  );
}
