'use client';
export const dynamic = 'force-dynamic';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { CheckCircle } from 'lucide-react';
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

  const { data: affiliates = [], isLoading } = useQuery({
    queryKey: ['admin-affiliates'],
    queryFn: async () => {
      try { const r = await adminApi.get('/admin/affiliates'); return r.data?.data ?? []; }
      catch { return []; }
    },
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['admin-affiliate-payouts'],
    queryFn: async () => {
      try { const r = await adminApi.get('/admin/affiliates/payouts'); return r.data?.data ?? []; }
      catch { return []; }
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
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Affiliate Programı</h1>
          <p>{affList.length} affiliate · ${totalPending.toLocaleString()} bekleyen ödeme</p>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { label: 'Toplam Affiliate', value: affList.length, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
          { label: 'Toplam Yönlendirme', value: totalReferrals, color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
          { label: 'Bekleyen Ödeme', value: `$${totalPending.toLocaleString()}`, color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
          { label: 'Toplam Ödenen', value: `$${totalPaid.toLocaleString()}`, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'block' }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: typeof s.value === 'string' ? 20 : 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{s.value}</p>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${s.color}80, transparent)`, borderRadius: '0 0 12px 12px' }} />
          </div>
        ))}
      </div>

      <div className="section-card">
        <div className="section-card-header"><span className="section-card-title">Affiliateler</span></div>
        <DataTable columns={affCols} data={affList} searchPlaceholder="Ad, email, kod ara..." emptyMessage="Affiliate bulunamadı." noBorder />
      </div>

      <div className="section-card">
        <div className="section-card-header"><span className="section-card-title">Ödeme Talepleri</span></div>
        <DataTable columns={payoutCols} data={payList} searchPlaceholder="Affiliate ara..." emptyMessage="Ödeme talebi bulunamadı." noBorder />
      </div>
    </div>
  );
}
