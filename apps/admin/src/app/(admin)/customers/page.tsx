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
      try { const r = await adminApi.get('/admin/customers', { params: { limit: 100 } }); return r.data?.data ?? MOCK_CUSTOMERS; }
      catch { return MOCK_CUSTOMERS; }
    },
  });

  const customers = (data ?? MOCK_CUSTOMERS) as Customer[];
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

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Müşteriler</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Toplam {customers.length} müşteri
          {highRisk > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />{highRisk} yüksek risk
            </span>
          )}
        </p>
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
