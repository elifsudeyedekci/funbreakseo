'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Heart, AlertTriangle } from 'lucide-react';

interface Customer {
  id: string;
  fullName: string;
  email: string;
  company?: string;
  plan: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
  healthScore?: number;
  churnRisk?: string;
}

const MOCK_CUSTOMERS: Customer[] = Array.from({ length: 25 }, (_, i) => ({
  id: `cust-${i + 1}`,
  fullName: `Müşteri ${i + 1}`,
  email: `musteri${i + 1}@example.com`,
  company: i % 3 === 0 ? `Şirket ${i + 1}` : undefined,
  plan: ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'][i % 4],
  status: ['ACTIVE', 'ACTIVE', 'ACTIVE', 'SUSPENDED', 'TRIALING'][i % 5],
  createdAt: new Date(Date.now() - i * 86400000 * 7).toISOString(),
  lastLoginAt: new Date(Date.now() - i * 3600000 * 2).toISOString(),
  healthScore: Math.floor(50 + Math.random() * 50),
  churnRisk: ['LOW', 'MEDIUM', 'HIGH'][i % 3],
}));

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  ACTIVE: 'success', TRIALING: 'info', SUSPENDED: 'danger', PAST_DUE: 'warning', CANCELED: 'default',
};

export default function CustomersPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      try {
        const r = await adminApi.get('/admin/customers', { params: { limit: 100 } });
        const orgs = Array.isArray(r.data) ? r.data : (r.data?.data ?? r.data?.items ?? []);
        return orgs.map((org: Record<string, unknown>) => ({
          id: org.id,
          fullName: (org.users as Array<{fullName?: string}>)?.[0]?.fullName ?? (org.name as string) ?? 'Bilinmiyor',
          email: (org.users as Array<{email?: string}>)?.[0]?.email ?? '',
          company: (org.name as string) ?? '',
          plan: ((org.subscription as {plan?: {name?: string}})?.plan?.name) ?? 'FREE',
          status: ((org.subscription as {status?: string})?.status) ?? 'ACTIVE',
          createdAt: org.createdAt as string,
          lastLoginAt: (org.users as Array<{lastLoginAt?: string}>)?.[0]?.lastLoginAt ?? null,
          healthScore: (org.healthScore as number) ?? 50,
          churnRisk: (org.churnRisk as string) ?? 'LOW',
        })) as Customer[];
      }
      catch { return [] as Customer[]; }
    },
  });

  const customers = (data ?? []) as Customer[];
  const highRisk = customers.filter((c) => c.churnRisk === 'HIGH').length;

  const columns: ColumnDef<Customer>[] = [
    {
      header: 'Ad Soyad',
      accessorKey: 'fullName',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[var(--text-primary)]">{row.original.fullName}</p>
          <p className="text-xs text-[var(--text-muted)]">{row.original.email}</p>
        </div>
      ),
    },
    {
      header: 'Şirket',
      accessorKey: 'company',
      cell: ({ getValue }) => <span className="text-[var(--text-secondary)]">{(getValue() as string) || '—'}</span>,
    },
    {
      header: 'Plan',
      accessorKey: 'plan',
      cell: ({ getValue }) => <Badge variant="info">{getValue() as string}</Badge>,
    },
    {
      header: 'Durum',
      accessorKey: 'status',
      cell: ({ getValue }) => {
        const s = getValue() as string;
        return <Badge variant={statusVariant[s] ?? 'default'}>{s}</Badge>;
      },
    },
    {
      header: 'Sağlık',
      accessorKey: 'healthScore',
      cell: ({ getValue }) => {
        const score = (getValue() as number) ?? 0;
        const color = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400';
        return (
          <span className={`flex items-center gap-1 font-semibold ${color}`}>
            <Heart className="w-3.5 h-3.5" />
            {score}
          </span>
        );
      },
    },
    {
      header: 'Churn Riski',
      accessorKey: 'churnRisk',
      cell: ({ getValue }) => {
        const r = getValue() as string;
        const v = r === 'LOW' ? 'success' : r === 'MEDIUM' ? 'warning' : 'danger';
        return r ? <Badge variant={v as 'success' | 'warning' | 'danger'}>{r}</Badge> : null;
      },
    },
    {
      header: 'Kayıt',
      accessorKey: 'createdAt',
      cell: ({ getValue }) => (
        <span className="text-xs text-[var(--text-muted)]">
          {formatDistanceToNow(new Date(getValue() as string), { addSuffix: true, locale: tr })}
        </span>
      ),
    },
  ];

  if (isLoading) return <PageSpinner />;

  const activeCount = customers.filter((c) => c.status === 'ACTIVE').length;
  const trialCount = customers.filter((c) => c.status === 'TRIALING').length;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Müşteriler</h1>
          <p>Toplam {customers.length} kayıtlı kullanıcı</p>
        </div>
      </div>

      <div className="kpi-grid">
        {[
          { label: 'Toplam',      value: customers.length, color: '#6C8EF5', bg: 'rgba(108,142,245,0.1)' },
          { label: 'Aktif',       value: activeCount,       color: '#3DD68C', bg: 'rgba(61,214,140,0.1)' },
          { label: 'Deneme',      value: trialCount,        color: '#F5A524', bg: 'rgba(245,165,36,0.1)' },
          { label: 'Yüksek Risk', value: highRisk,          color: '#F54A3A', bg: 'rgba(245,74,58,0.1)' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ width: 32, height: 32, borderRadius: 8, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.bg }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'block' }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{s.value}</p>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${s.color}60, transparent)`, borderRadius: '0 0 12px 12px' }} />
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={customers}
        searchPlaceholder="Ad, email, şirket ara..."
        onRowClick={(row) => router.push(`/customers/${(row as Customer).id}`)}
        emptyMessage="Müşteri bulunamadı."
      />
    </div>
  );
}
