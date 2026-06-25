'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { FileText, RefreshCw } from 'lucide-react';

interface Invoice {
  id: string;
  customerName: string;
  amount: number;
  status: 'PAID' | 'UNPAID' | 'REFUNDED' | 'PARTIAL_REFUND';
  parasutStatus?: string;
  pdfUrl?: string;
  createdAt: string;
}

const MOCK_INVOICES: Invoice[] = Array.from({ length: 30 }, (_, i) => ({
  id: `inv-${i}`,
  customerName: `Müşteri ${i + 1}`,
  amount: [99, 199, 299, 799][i % 4],
  status: ['PAID', 'PAID', 'UNPAID', 'REFUNDED'][i % 4] as Invoice['status'],
  parasutStatus: ['SENT', 'APPROVED', 'PENDING'][i % 3],
  pdfUrl: i % 3 === 0 ? '#' : undefined,
  createdAt: new Date(Date.now() - i * 86400000 * 5).toISOString(),
}));

const RefundSchema = z.object({
  amount: z.coerce.number().positive('Tutar gerekli'),
  type: z.enum(['full', 'partial']),
});

export default function InvoicesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [refundInv, setRefundInv] = useState<Invoice | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: async () => {
      try { const r = await adminApi.get('/admin/invoices', { params: { limit: 100 } }); return r.data?.data ?? MOCK_INVOICES; }
      catch { return MOCK_INVOICES; }
    },
  });

  const refundMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { amount: number; type: 'full' | 'partial' } }) =>
      adminApi.post(`/admin/invoices/${id}/refund`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-invoices'] });
      toast('İade işlemi başlatıldı', 'success');
      setRefundInv(null);
    },
    onError: () => toast('İade başarısız', 'error'),
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<{ amount: number; type: 'full' | 'partial' }>({
    resolver: zodResolver(RefundSchema),
    defaultValues: { type: 'full' },
  });

  const invoices = (data ?? MOCK_INVOICES) as Invoice[];

  const columns: ColumnDef<Invoice>[] = [
    {
      header: 'Fatura No',
      accessorKey: 'id',
      cell: ({ getValue }) => <span className="font-mono text-xs text-[var(--text-muted)]">{(getValue() as string).slice(0, 12)}</span>,
    },
    {
      header: 'Müşteri',
      accessorKey: 'customerName',
      cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
    },
    {
      header: 'Tutar',
      accessorKey: 'amount',
      cell: ({ getValue }) => <span className="font-semibold">₺{(getValue() as number).toLocaleString('tr-TR')}</span>,
    },
    {
      header: 'Durum',
      accessorKey: 'status',
      cell: ({ getValue }) => {
        const s = getValue() as string;
        const v = s === 'PAID' ? 'success' : s === 'REFUNDED' ? 'info' : s === 'UNPAID' ? 'danger' : 'warning';
        return <Badge variant={v as 'success' | 'info' | 'danger' | 'warning'}>{s}</Badge>;
      },
    },
    {
      header: 'Paraşüt',
      accessorKey: 'parasutStatus',
      cell: ({ getValue }) => {
        const s = getValue() as string | undefined;
        return s ? <Badge variant="default">{s}</Badge> : <span className="text-[var(--text-muted)]">—</span>;
      },
    },
    {
      header: 'Tarih',
      accessorKey: 'createdAt',
      cell: ({ getValue }) => <span className="text-xs text-[var(--text-muted)]">{format(new Date(getValue() as string), 'dd MMM yyyy', { locale: tr })}</span>,
    },
    {
      header: '',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.pdfUrl && (
            <a href={row.original.pdfUrl} target="_blank" rel="noreferrer">
              <Button size="xs" variant="ghost" icon={<FileText className="w-3 h-3" />}>PDF</Button>
            </a>
          )}
          {row.original.status === 'PAID' && (
            <Button size="xs" variant="danger" icon={<RefreshCw className="w-3 h-3" />}
              onClick={(e) => { e.stopPropagation(); setRefundInv(row.original); reset(); }}>
              İade
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) return <PageSpinner />;

  const paidCount = invoices.filter((i) => i.status === 'PAID').length;
  const unpaidCount = invoices.filter((i) => i.status === 'UNPAID').length;
  const refundedCount = invoices.filter((i) => i.status === 'REFUNDED' || i.status === 'PARTIAL_REFUND').length;
  const totalRevenue = invoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Faturalar</h1>
          <p>Tüm fatura ve ödemeler — {invoices.length} kayıt</p>
        </div>
      </div>

      <div className="kpi-grid">
        {[
          { label: 'Toplam', value: invoices.length, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
          { label: 'Ödendi', value: paidCount, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
          { label: 'Bekliyor', value: unpaidCount, color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
          { label: 'Bu Ay Gelir', value: `₺${totalRevenue.toLocaleString('tr-TR')}`, color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'block' }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: typeof s.value === 'string' ? 22 : 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{s.value}</p>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${s.color}80, transparent)`, borderRadius: '0 0 12px 12px' }} />
          </div>
        ))}
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title">Fatura Listesi</span>
        </div>
        <DataTable columns={columns} data={invoices} searchPlaceholder="Müşteri, fatura ara..." emptyMessage="Fatura bulunamadı." noBorder />
      </div>

      {/* Refund Modal */}
      <Modal
        open={!!refundInv}
        onClose={() => setRefundInv(null)}
        title={`İade — ${refundInv?.customerName}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRefundInv(null)}>Vazgeç</Button>
            <Button
              variant="danger"
              loading={refundMutation.isPending}
              onClick={handleSubmit((d) => {
                if (refundInv) refundMutation.mutate({ id: refundInv.id, data: d as { amount: number; type: 'full' | 'partial' } });
              })}
            >
              İade Et
            </Button>
          </>
        }
      >
        <form className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Fatura: <strong>₺{refundInv?.amount.toLocaleString('tr-TR')}</strong>
          </p>
          <Select label="İade Tipi" options={[{ value: 'full', label: 'Tam İade' }, { value: 'partial', label: 'Kısmi İade' }]}
            {...register('type')} error={errors.type?.message} />
          <Input label="İade Tutarı (₺)" type="number" step="0.01" {...register('amount')} error={errors.amount?.message} />
        </form>
      </Modal>
    </div>
  );
}
