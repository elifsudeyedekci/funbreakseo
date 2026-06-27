'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type ColumnDef } from '@tanstack/react-table';
import { adminApi, admin } from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
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

const PlanSchema = z.object({
  name: z.string().min(2, 'En az 2 karakter'),
  monthlyPrice: z.coerce.number().min(0),
  yearlyPrice: z.coerce.number().min(0),
  currency: z.string().default('TRY'),
  isActive: z.coerce.boolean().default(true),
});
type PlanForm = z.infer<typeof PlanSchema>;

export default function PlansPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [couponModal, setCouponModal] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      try {
        const r = await adminApi.get('/admin/plans');
        return Array.isArray(r.data) ? r.data : (r.data?.data ?? r.data?.items ?? []);
      } catch { return []; }
    },
  });

  const { data: coupons, isLoading: couponsLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      try {
        const r = await adminApi.get('/admin/coupons');
        return Array.isArray(r.data) ? r.data : (r.data?.data ?? r.data?.items ?? []);
      } catch { return []; }
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlanForm }) => admin.updatePlan(id, data as Record<string, unknown>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); toast('Plan güncellendi', 'success'); setEditPlan(null); resetPlan(); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const { register: registerPlan, handleSubmit: handlePlanSubmit, formState: { errors: planErrors }, reset: resetPlan } = useForm<PlanForm>({
    resolver: zodResolver(PlanSchema),
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
      <Button size="xs" variant="ghost" icon={<Edit3 className="w-3 h-3" />}
        onClick={(e) => {
          e.stopPropagation();
          setEditPlan(row.original);
          resetPlan({ name: row.original.name, monthlyPrice: row.original.monthlyPrice, yearlyPrice: row.original.yearlyPrice, currency: row.original.currency, isActive: row.original.isActive });
        }}>
        Düzenle
      </Button>
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

  const planList = (plans ?? []) as Plan[];
  const couponList = (coupons ?? []) as Coupon[];
  const activePlanCount = planList.filter((p) => p.isActive).length;
  const activeCouponCount = couponList.filter((c) => c.isActive).length;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Planlar & Kuponlar</h1>
          <p>Abonelik planları ve indirim kuponları</p>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { label: 'Toplam Plan', value: planList.length, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
          { label: 'Aktif Plan', value: activePlanCount, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
          { label: 'Aktif Kupon', value: activeCouponCount, color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'block' }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{s.value}</p>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${s.color}80, transparent)`, borderRadius: '0 0 12px 12px' }} />
          </div>
        ))}
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Planlar</TabsTrigger>
          <TabsTrigger value="coupons">Kuponlar</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <div className="section-card" style={{ marginTop: 16 }}>
            <div className="section-card-header"><span className="section-card-title">Abonelik Planları</span></div>
            <DataTable columns={planCols} data={planList} searchPlaceholder="Plan ara..." emptyMessage="Plan bulunamadı." noBorder />
          </div>
        </TabsContent>

        <TabsContent value="coupons">
          <div className="section-card" style={{ marginTop: 16 }}>
            <div className="section-card-header">
              <span className="section-card-title">İndirim Kuponları</span>
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setCouponModal(true)}>
                Kupon Oluştur
              </Button>
            </div>
            {couponsLoading ? <PageSpinner /> : (
              <DataTable columns={couponCols} data={couponList} searchPlaceholder="Kupon kodu ara..." emptyMessage="Kupon bulunamadı." noBorder />
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Modal open={!!editPlan} onClose={() => { setEditPlan(null); resetPlan(); }} title="Plan Düzenle" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setEditPlan(null); resetPlan(); }}>Vazgeç</Button>
            <Button variant="primary" loading={updatePlanMutation.isPending}
              onClick={handlePlanSubmit((d) => editPlan && updatePlanMutation.mutate({ id: editPlan.id, data: d }))}>
              Kaydet
            </Button>
          </>
        }
      >
        <form className="space-y-3">
          <Input label="Plan Adı" placeholder="STARTER" {...registerPlan('name')} error={planErrors.name?.message} />
          <Input label="Aylık Fiyat (₺)" type="number" {...registerPlan('monthlyPrice')} error={planErrors.monthlyPrice?.message} />
          <Input label="Yıllık Fiyat (₺)" type="number" {...registerPlan('yearlyPrice')} error={planErrors.yearlyPrice?.message} />
          <Select label="Para Birimi" options={[{ value: 'TRY', label: 'TRY (₺)' }, { value: 'USD', label: 'USD ($)' }]} {...registerPlan('currency')} />
          <Select label="Durum" options={[{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Pasif' }]} {...registerPlan('isActive')} />
        </form>
      </Modal>

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
