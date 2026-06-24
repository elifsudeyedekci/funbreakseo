'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { Heart, AlertTriangle, Mail, Phone } from 'lucide-react';

interface HealthRow {
  id: string;
  organizationName: string;
  email: string;
  healthScore: number;
  churnRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  signalSummary: string;
  plan: string;
}

const MOCK_HEALTH: HealthRow[] = Array.from({ length: 20 }, (_, i) => ({
  id: `cust-${i}`,
  organizationName: `Org ${i + 1}`,
  email: `org${i + 1}@example.com`,
  healthScore: Math.max(10, 90 - i * 4),
  churnRisk: i < 3 ? 'HIGH' : i < 8 ? 'MEDIUM' : 'LOW',
  signalSummary: i < 3 ? '3 gündür giriş yok, kota düşük' : i < 8 ? 'Son 7 günde az aktif' : 'Sağlıklı kullanım',
  plan: ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'][i % 4],
}));

export default function CustomerHealthPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-health-list'],
    queryFn: async () => {
      try { const r = await adminApi.get('/admin/customer-health'); return r.data?.data ?? MOCK_HEALTH; }
      catch { return MOCK_HEALTH; }
    },
  });

  const rows = (data ?? MOCK_HEALTH) as HealthRow[];
  const sorted = [...rows].sort((a, b) => {
    const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return riskOrder[a.churnRisk] - riskOrder[b.churnRisk] || a.healthScore - b.healthScore;
  });

  const high = sorted.filter((r) => r.churnRisk === 'HIGH').length;

  const columns: ColumnDef<HealthRow>[] = [
    {
      header: 'Organizasyon',
      accessorKey: 'organizationName',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.organizationName}</p>
          <p className="text-xs text-[var(--text-muted)]">{row.original.email}</p>
        </div>
      ),
    },
    {
      header: 'Sağlık Skoru',
      accessorKey: 'healthScore',
      cell: ({ getValue }) => {
        const s = getValue() as number;
        const color = s >= 70 ? 'text-emerald-400' : s >= 40 ? 'text-yellow-400' : 'text-red-400';
        return (
          <span className={`flex items-center gap-1 font-bold ${color}`}>
            <Heart className="w-3.5 h-3.5" />
            {s}
          </span>
        );
      },
    },
    {
      header: 'Churn Riski',
      accessorKey: 'churnRisk',
      cell: ({ getValue }) => {
        const r = getValue() as string;
        return (
          <div className="flex items-center gap-1.5">
            {r === 'HIGH' && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
            <Badge variant={r === 'HIGH' ? 'danger' : r === 'MEDIUM' ? 'warning' : 'success'}>{r}</Badge>
          </div>
        );
      },
    },
    {
      header: 'Plan',
      accessorKey: 'plan',
      cell: ({ getValue }) => <Badge variant="info">{getValue() as string}</Badge>,
    },
    {
      header: 'Sinyal Özeti',
      accessorKey: 'signalSummary',
      cell: ({ getValue }) => <span className="text-xs text-[var(--text-muted)] max-w-[200px] block truncate">{getValue() as string}</span>,
    },
    {
      header: 'Aksiyon',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="xs" variant="secondary" icon={<Mail className="w-3 h-3" />}>
            Mail
          </Button>
          <Button size="xs" variant="ghost" icon={<Phone className="w-3 h-3" />}>
            Ara
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Müşteri Sağlığı</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          {rows.length} müşteri •{' '}
          {high > 0 && (
            <span className="text-red-400 inline-flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />{high} yüksek churn riski
            </span>
          )}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={sorted}
        searchPlaceholder="Organizasyon, email ara..."
        emptyMessage="Sağlık verisi bulunamadı."
      />
    </div>
  );
}
