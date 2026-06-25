'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminApi } from '@/lib/api';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { Plus, Edit3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  status: string;
  createdAt: string;
  lastLoginAt?: string;
  permissions?: string[];
}

const MOCK_STAFF: StaffMember[] = [
  { id: 's1', fullName: 'Super Admin', email: 'super@funbreakseo.com', role: 'ADMIN', status: 'ACTIVE', createdAt: new Date(Date.now() - 86400000 * 365).toISOString(), lastLoginAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 's2', fullName: 'Destek Sorumlusu', email: 'destek@funbreakseo.com', role: 'STAFF', status: 'ACTIVE', createdAt: new Date(Date.now() - 86400000 * 90).toISOString(), permissions: ['SUPPORT', 'VIEW_CUSTOMERS'] },
  { id: 's3', fullName: 'İçerik Editörü', email: 'editor@funbreakseo.com', role: 'STAFF', status: 'ACTIVE', createdAt: new Date(Date.now() - 86400000 * 60).toISOString(), permissions: ['CONTENT_REVIEW', 'BLOG'] },
];

const StaffSchema = z.object({
  fullName: z.string().min(2, 'Ad soyad gerekli'),
  email: z.string().email('Geçerli e-posta girin'),
  role: z.enum(['ADMIN', 'STAFF']),
  password: z.string().min(8, 'Şifre en az 8 karakter').optional(),
  permissions: z.array(z.string()).optional(),
});

type StaffForm = z.infer<typeof StaffSchema>;

const PERMISSION_OPTIONS = [
  { value: 'SUPPORT', label: 'Destek Yönetimi' },
  { value: 'CONTENT_REVIEW', label: 'İçerik İnceleme' },
  { value: 'VIEW_CUSTOMERS', label: 'Müşterileri Görüntüle' },
  { value: 'BLOG', label: 'Blog Yönetimi' },
  { value: 'MARKET', label: 'Market Yönetimi' },
  { value: 'FINANCE', label: 'Finans Görüntüleme' },
];

export default function StaffPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: async () => {
      try { const r = await adminApi.get('/admin/staff'); return r.data?.data ?? MOCK_STAFF; }
      catch { return MOCK_STAFF; }
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: StaffForm) => adminApi.post('/admin/staff', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-staff'] }); toast('Staff üyesi eklendi', 'success'); setModal(false); reset(); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffForm> }) => adminApi.put(`/admin/staff/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-staff'] }); toast('Staff üyesi güncellendi', 'success'); setEditingStaff(null); reset(); },
    onError: () => toast('Güncelleme başarısız', 'error'),
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<StaffForm>({
    resolver: zodResolver(StaffSchema),
    defaultValues: { role: 'STAFF', permissions: [] },
  });

  const selectedPerms = watch('permissions') ?? [];

  const openEdit = (s: StaffMember) => {
    setEditingStaff(s);
    setValue('fullName', s.fullName);
    setValue('email', s.email);
    setValue('role', s.role);
    setValue('permissions', s.permissions ?? []);
  };

  const staff = (data ?? MOCK_STAFF) as StaffMember[];
  const isEditing = !!editingStaff;
  const isModalOpen = modal || isEditing;
  const closeModal = () => { setModal(false); setEditingStaff(null); reset(); };
  const onSubmit = handleSubmit((d) => {
    if (isEditing && editingStaff) { updateMutation.mutate({ id: editingStaff.id, data: d }); }
    else { createMutation.mutate(d); }
  });

  const columns: ColumnDef<StaffMember>[] = [
    {
      header: 'Ad Soyad',
      accessorKey: 'fullName',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.fullName}</p>
          <p className="text-xs text-[var(--text-muted)]">{row.original.email}</p>
        </div>
      ),
    },
    {
      header: 'Rol',
      accessorKey: 'role',
      cell: ({ getValue }) => <Badge variant={(getValue() as string) === 'ADMIN' ? 'danger' : 'info'}>{getValue() as string}</Badge>,
    },
    {
      header: 'Durum',
      accessorKey: 'status',
      cell: ({ getValue }) => <Badge variant={(getValue() as string) === 'ACTIVE' ? 'success' : 'default'}>{getValue() as string}</Badge>,
    },
    {
      header: 'Yetkiler',
      accessorKey: 'permissions',
      cell: ({ getValue }) => {
        const perms = getValue() as string[] | undefined;
        return perms?.length ? (
          <div className="flex flex-wrap gap-1">
            {perms.slice(0, 2).map((p) => <Badge key={p} variant="default" className="text-[10px]">{p}</Badge>)}
            {perms.length > 2 && <Badge variant="default" className="text-[10px]">+{perms.length - 2}</Badge>}
          </div>
        ) : <span className="text-[var(--text-muted)]">Tam Yetki</span>;
      },
    },
    {
      header: 'Son Giriş',
      accessorKey: 'lastLoginAt',
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        return v ? <span className="text-xs text-[var(--text-muted)]">{formatDistanceToNow(new Date(v), { addSuffix: true, locale: tr })}</span> : <span className="text-[var(--text-muted)]">—</span>;
      },
    },
    {
      header: '',
      id: 'actions',
      cell: ({ row }) => (
        <Button size="xs" variant="ghost" icon={<Edit3 className="w-3 h-3" />}
          onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}>
          Düzenle
        </Button>
      ),
    },
  ];

  if (isLoading) return <PageSpinner />;

  const adminCount = staff.filter((s) => s.role === 'ADMIN').length;
  const activeCount = staff.filter((s) => s.status === 'ACTIVE').length;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Staff Yönetimi</h1>
          <p>{staff.length} staff üyesi</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModal(true)}>
          Staff Ekle
        </Button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { label: 'Toplam', value: staff.length, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
          { label: 'Admin', value: adminCount, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
          { label: 'Aktif', value: activeCount, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
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

      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title">Personel Listesi</span>
        </div>
        <DataTable columns={columns} data={staff} searchPlaceholder="Ad, email ara..." emptyMessage="Staff bulunamadı." noBorder />
      </div>

      <Modal open={isModalOpen} onClose={closeModal} title={isEditing ? 'Staff Düzenle' : 'Staff Ekle'} size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Vazgeç</Button>
            <Button variant="primary" loading={createMutation.isPending || updateMutation.isPending} onClick={onSubmit}>
              {isEditing ? 'Güncelle' : 'Ekle'}
            </Button>
          </>
        }
      >
        <form className="space-y-3">
          <Input label="Ad Soyad" {...register('fullName')} error={errors.fullName?.message} />
          <Input label="E-posta" type="email" {...register('email')} error={errors.email?.message} />
          {!isEditing && <Input label="Şifre" type="password" {...register('password')} error={errors.password?.message} />}
          <Select label="Rol" options={[{ value: 'STAFF', label: 'Staff' }, { value: 'ADMIN', label: 'Admin' }]} {...register('role')} />
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-1.5">Yetkiler (boş bırakırsanız tam yetki)</p>
            <div className="grid grid-cols-2 gap-1.5">
              {PERMISSION_OPTIONS.map((p) => (
                <label key={p.value} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedPerms.includes(p.value)}
                    onChange={(e) => {
                      const current = selectedPerms;
                      setValue('permissions', e.target.checked ? [...current, p.value] : current.filter((x) => x !== p.value));
                    }}
                    className="accent-indigo-500"
                  />
                  <span className="text-[var(--text-primary)]">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
