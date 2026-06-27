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
      try { const r = await adminApi.get('/admin/customer-health'); return r.data?.data ?? []; }
      catch { return []; }
    },
  });

  const rows = (data ?? []) as HealthRow[];
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
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Müşteri Sağlığı</h1>
          <p>{rows.length} müşteri{high > 0 ? ` · ${high} yüksek churn riski` : ''}</p>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { label: 'Yüksek Risk', value: sorted.filter(r => r.churnRisk === 'HIGH').length, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
          { label: 'Orta Risk', value: sorted.filter(r => r.churnRisk === 'MEDIUM').length, color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
          { label: 'Düşük Risk', value: sorted.filter(r => r.churnRisk === 'LOW').length, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ width:32, height:32, borderRadius:8, background:s.bg, marginBottom:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:s.color, display:'block' }} />
            </div>
            <p style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-muted)', marginBottom:4 }}>{s.label}</p>
            <p style={{ fontSize:28, fontWeight:700, color:'var(--text-primary)', letterSpacing:'-0.02em', lineHeight:1.1 }}>{s.value}</p>
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${s.color}80,transparent)`, borderRadius:'0 0 12px 12px' }} />
          </div>
        ))}
      </div>

      <div className="section-card">
        <div className="section-card-header"><span className="section-card-title">Müşteri Listesi</span></div>
        <DataTable
          columns={columns}
          data={sorted}
          searchPlaceholder="Organizasyon, email ara..."
          emptyMessage="Sağlık verisi bulunamadı."
          noBorder
        />
      </div>
    </div>
  );
}
