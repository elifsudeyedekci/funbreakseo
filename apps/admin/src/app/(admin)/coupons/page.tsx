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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { Plus, Trash2, Tag, Percent, DollarSign, Gift } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  usageCount: number;
  maxUsage?: number;
  expiresAt?: string;
  isActive: boolean;
}

const MOCK_COUPONS: Coupon[] = [
  { id: 'c1', code: 'WELCOME20', type: 'PERCENT', value: 20, usageCount: 45, maxUsage: 100, isActive: true },
  { id: 'c2', code: 'FLAT50TL', type: 'FIXED', value: 50, usageCount: 12, isActive: true },
  { id: 'c3', code: 'ILKAYUCRETSIZ', type: 'FIRST_MONTH_FREE', value: 0, usageCount: 8, isActive: true },
  { id: 'c4', code: 'SEO30', type: 'PERCENT', value: 30, usageCount: 3, maxUsage: 50, expiresAt: '2026-12-31', isActive: false },
];

const CouponSchema = z.object({
  code: z.string().min(3, 'Kod en az 3 karakter'),
  type: z.enum(['PERCENT', 'FIXED', 'FIRST_MONTH_FREE']),
  value: z.coerce.number().min(0),
  maxUsage: z.coerce.number().optional(),
  expiresAt: z.string().optional(),
});
type CouponForm = z.infer<typeof CouponSchema>;

const typeLabels: Record<string, string> = {
  PERCENT: 'Yüzde İndirim',
  FIXED: 'Sabit İndirim',
  FIRST_MONTH_FREE: 'İlk Ay Ücretsiz',
};

const typeIcons: Record<string, typeof Tag> = {
  PERCENT: Percent,
  FIXED: DollarSign,
  FIRST_MONTH_FREE: Gift,
};

export default function CouponsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      try {
        const r = await adminApi.get('/admin/coupons');
        return (r.data?.data ?? MOCK_COUPONS) as Coupon[];
      } catch {
        return MOCK_COUPONS;
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: CouponForm) => adminApi.post('/admin/coupons', { ...d, code: d.code.toUpperCase() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); toast('Kupon oluşturuldu', 'success'); setModal(false); reset(); },
    onError: () => toast('Kupon oluşturulamadı', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/coupons/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); toast('Kupon silindi', 'success'); },
    onError: () => toast('Kupon silinemedi', 'error'),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CouponForm>({
    resolver: zodResolver(CouponSchema),
    defaultValues: { type: 'PERCENT', value: 20 },
  });

  const columns: ColumnDef<Coupon>[] = [
    {
      header: 'Kod',
      accessorKey: 'code',
      cell: ({ row }) => {
        const Icon = typeIcons[row.original.type] ?? Tag;
        return (
          <div className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="font-mono font-semibold text-[var(--text-primary)]">{row.original.code}</span>
          </div>
        );
      },
    },
    {
      header: 'Tür',
      accessorKey: 'type',
      cell: ({ row }) => <Badge variant="secondary">{typeLabels[row.original.type] ?? row.original.type}</Badge>,
    },
    {
      header: 'Değer',
      accessorKey: 'value',
      cell: ({ row }) => {
        const { type, value } = row.original;
        if (type === 'FIRST_MONTH_FREE') return <span className="text-emerald-400 font-medium">İlk ay ücretsiz</span>;
        return <span className="font-semibold">{type === 'PERCENT' ? `%${value}` : `₺${value}`}</span>;
      },
    },
    {
      header: 'Kullanım',
      cell: ({ row }) => {
        const { usageCount, maxUsage } = row.original;
        return (
          <span className="text-[var(--text-secondary)]">
            {usageCount}{maxUsage ? ` / ${maxUsage}` : ''}
          </span>
        );
      },
    },
    {
      header: 'Son Geçerlilik',
      accessorKey: 'expiresAt',
      cell: ({ row }) => row.original.expiresAt
        ? <span className="text-[var(--text-secondary)]">{new Date(row.original.expiresAt).toLocaleDateString('tr-TR')}</span>
        : <span className="text-[var(--text-muted)]">Sınırsız</span>,
    },
    {
      header: 'Durum',
      accessorKey: 'isActive',
      cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'danger'}>{row.original.isActive ? 'Aktif' : 'Pasif'}</Badge>,
    },
    {
      header: '',
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 className="w-3.5 h-3.5" />}
          className="text-[var(--danger)] hover:bg-[var(--danger-dim)]"
          loading={deleteMutation.isPending}
          onClick={() => deleteMutation.mutate(row.original.id)}
        />
      ),
    },
  ];

  if (isLoading) return <PageSpinner />;

  const active = coupons?.filter((c) => c.isActive).length ?? 0;
  const totalUsage = coupons?.reduce((s, c) => s + c.usageCount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Kupon Yönetimi</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">İndirim kuponları oluştur ve yönet</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModal(true)}>
          Yeni Kupon
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-xs text-[var(--text-muted)]">Toplam Kupon</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{coupons?.length ?? 0}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-[var(--text-muted)]">Aktif Kupon</p>
          <p className="text-2xl font-bold text-emerald-400">{active}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-[var(--text-muted)]">Toplam Kullanım</p>
          <p className="text-2xl font-bold text-[var(--accent)]">{totalUsage}</p>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Kuponlar</CardTitle></CardHeader>
        <CardContent className="p-0">
          <DataTable columns={columns} data={coupons ?? []} />
        </CardContent>
      </Card>

      {/* Create modal */}
      <Modal open={modal} onClose={() => { setModal(false); reset(); }} title="Yeni Kupon Oluştur">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <Input
            label="Kupon Kodu"
            placeholder="ORNEK20"
            {...register('code')}
            error={errors.code?.message}
          />
          <Select
            label="Tür"
            {...register('type')}
            options={[
              { value: 'PERCENT', label: 'Yüzde İndirim' },
              { value: 'FIXED', label: 'Sabit İndirim (₺)' },
              { value: 'FIRST_MONTH_FREE', label: 'İlk Ay Ücretsiz' },
            ]}
          />
          <Input
            label="Değer (% veya ₺)"
            type="number"
            min={0}
            {...register('value')}
            error={errors.value?.message}
          />
          <Input
            label="Maksimum Kullanım (opsiyonel)"
            type="number"
            min={1}
            placeholder="Sınırsız bırakmak için boş"
            {...register('maxUsage')}
          />
          <Input
            label="Son Geçerlilik (opsiyonel)"
            type="date"
            {...register('expiresAt')}
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" loading={createMutation.isPending} className="flex-1">
              Oluştur
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setModal(false); reset(); }}>
              İptal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
