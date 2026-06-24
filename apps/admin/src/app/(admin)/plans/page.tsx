'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { Plus, Edit3, Trash2 } from 'lucide-react';

interface Plan { id: string; name: string; monthlyPrice: number; yearlyPrice: number; currency: string; limits: Record<string, unknown>; isActive: boolean; }
interface Coupon { id: string; code: string; type: string; value: number; usageCount: number; maxUsage?: number; expiresAt?: string; isActive: boolean; }

const MOCK_PLANS: Plan[] = [
  { id: 'p1', name: 'STARTER', monthlyPrice: 99, yearlyPrice: 79 * 12, currency: 'TRY', limits: { projects: 1, keywords: 50, monthlyCrawls: 2 }, isActive: true },
  { id: 'p2', name: 'GROWTH', monthlyPrice: 299, yearlyPrice: 249 * 12, currency: 'TRY', limits: { projects: 3, keywords: 200, monthlyCrawls: 10 }, isActive: true },
  { id: 'p3', name: 'PRO', monthlyPrice: 599, yearlyPrice: 499 * 12, currency: 'TRY', limits: { projects: 10, keywords: 1000, monthlyCrawls: 50 }, isActive: true },
  { id: 'p4', name: 'ENTERPRISE', monthlyPrice: 1499, yearlyPrice: 1199 * 12, currency: 'TRY', limits: { projects: -1, keywords: -1, monthlyCrawls: -1 }, isActive: true },
];

const MOCK_COUPONS: Coupon[] = [
  { id: 'c1', code: 'WELCOME20', type: 'PERCENT', value: 20, usageCount: 45, maxUsage: 100, isActive: true },
  { id: 'c2', code: 'FLAT50', type: 'FIXED', value: 50, usageCount: 12, isActive: true },
  { id: 'c3', code: 'ILKAYUCRETSIZ', type: 'FIRST_MONTH_FREE', value: 0, usageCount: 8, isActive: true },
];

const CouponSchema = z.object({
  code: z.string().min(3, 'Kod en az 3 karakter').toUpperCase(),
  type: z.enum(['PERCENT', 'FIXED', 'FIRST_MONTH_FREE']),
  value: z.coerce.number().min(0),
  maxUsage: z.coerce.number().optional(),
  expiresAt: z.string().optional(),
});

type CouponForm = z.infer<typeof CouponSchema>;

export default function PlansPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [couponModal, setCouponModal] = useState(false);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/plans'); return r.data?.data ?? MOCK_PLANS; } catch { return MOCK_PLANS; } },
  });

  const { data: coupons, isLoading: couponsLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/coupons'); return r.data?.data ?? MOCK_COUPONS; } catch { return MOCK_COUPONS; } },
  });

  const createCouponMutation = useMutation({
    mutationFn: (d: CouponForm) => adminApi.post('/admin/coupons', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); toast('Kupon oluşturuldu', 'success'); setCouponModal(false); resetCoupon(); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/coupons/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); toast('Kupon silindi', 'warning'); },
  });

  const { register: registerCoupon, handleSubmit: handleCouponSubmit, formState: { errors: couponErrors }, reset: resetCoupon } = useForm<CouponForm>({
    resolver: zodResolver(CouponSchema),
    defaultValues: { type: 'PERCENT' },
  });

  const planCols: ColumnDef<Plan>[] = [
    { header: 'Plan', accessorKey: 'name', cell: ({ getValue }) => <span className="font-bold text-[var(--text-primary)]">{getValue() as string}</span> },
    { header: 'Aylık', accessorKey: 'monthlyPrice', cell: ({ row }) => <span>₺{row.original.monthlyPrice}/ay</span> },
    { header: 'Yıllık', accessorKey: 'yearlyPrice', cell: ({ row }) => <span>₺{(row.original.yearlyPrice / 12).toFixed(0)}/ay</span> },
    { header: 'Durum', accessorKey: 'isActive', cell: ({ getValue }) => <Badge variant={getValue() ? 'success' : 'default'}>{getValue() ? 'Aktif' : 'Pasif'}</Badge> },
    { header: 'Limitler', accessorKey: 'limits', cell: ({ getValue }) => (
      <span className="text-xs text-[var(--text-muted)] font-mono max-w-[200px] truncate block">
        {JSON.stringify(getValue())}
      </span>
    )},
    { header: '', id: 'actions', cell: ({ row }) => (
      <Button size="xs" variant="ghost" icon={<Edit3 className="w-3 h-3" />}>Düzenle</Button>
    )},
  ];

  const couponCols: ColumnDef<Coupon>[] = [
    { header: 'Kod', accessorKey: 'code', cell: ({ getValue }) => <code className="font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-xs">{getValue() as string}</code> },
    { header: 'Tip', accessorKey: 'type', cell: ({ getValue }) => {
      const t = getValue() as string;
      return <Badge variant={t === 'PERCENT' ? 'info' : t === 'FIXED' ? 'success' : 'purple'}>{t}</Badge>;
    }},
    { header: 'Değer', accessorKey: 'value', cell: ({ row }) => {
      const c = row.original;
      if (c.type === 'PERCENT') return <span>{c.value}%</span>;
      if (c.type === 'FIXED') return <span>₺{c.value}</span>;
      return <span>İlk Ay Bedava</span>;
    }},
    { header: 'Kullanım', id: 'usage', cell: ({ row }) => (
      <span>{row.original.usageCount}{row.original.maxUsage ? ` / ${row.original.maxUsage}` : ''}</span>
    )},
    { header: 'Durum', accessorKey: 'isActive', cell: ({ getValue }) => <Badge variant={getValue() ? 'success' : 'default'}>{getValue() ? 'Aktif' : 'Pasif'}</Badge> },
    { header: '', id: 'actions', cell: ({ row }) => (
      <Button size="xs" variant="danger" icon={<Trash2 className="w-3 h-3" />}
        onClick={(e) => { e.stopPropagation(); deleteCouponMutation.mutate(row.original.id); }}>
        Sil
      </Button>
    )},
  ];

  if (plansLoading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Planlar & Kuponlar</h1>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Planlar</TabsTrigger>
          <TabsTrigger value="coupons">Kuponlar</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <DataTable columns={planCols} data={(plans ?? MOCK_PLANS) as Plan[]} searchPlaceholder="Plan ara..." emptyMessage="Plan bulunamadı." />
        </TabsContent>

        <TabsContent value="coupons">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setCouponModal(true)}>
                Kupon Oluştur
              </Button>
            </div>
            {couponsLoading ? <PageSpinner /> : (
              <DataTable columns={couponCols} data={(coupons ?? MOCK_COUPONS) as Coupon[]} searchPlaceholder="Kupon kodu ara..." emptyMessage="Kupon bulunamadı." />
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Modal open={couponModal} onClose={() => { setCouponModal(false); resetCoupon(); }} title="Kupon Oluştur" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCouponModal(false); resetCoupon(); }}>Vazgeç</Button>
            <Button variant="primary" loading={createCouponMutation.isPending}
              onClick={handleCouponSubmit((d) => createCouponMutation.mutate(d))}>
              Oluştur
            </Button>
          </>
        }
      >
        <form className="space-y-3">
          <Input label="Kupon Kodu" placeholder="WELCOME20" {...registerCoupon('code')} error={couponErrors.code?.message} />
          <Select label="Tip" options={[
            { value: 'PERCENT', label: 'Yüzde İndirim' },
            { value: 'FIXED', label: 'Sabit İndirim (₺)' },
            { value: 'FIRST_MONTH_FREE', label: 'İlk Ay Bedava' },
          ]} {...registerCoupon('type')} />
          <Input label="Değer (% veya ₺)" type="number" {...registerCoupon('value')} error={couponErrors.value?.message} />
          <Input label="Maks. Kullanım" type="number" {...registerCoupon('maxUsage')} />
          <Input label="Geçerlilik Tarihi" type="datetime-local" {...registerCoupon('expiresAt')} />
        </form>
      </Modal>
    </div>
  );
}
