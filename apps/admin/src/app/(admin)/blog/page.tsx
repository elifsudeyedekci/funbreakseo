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
import { Plus, Edit3, Trash2, Eye } from 'lucide-react';

const LOCALES = ['tr', 'en', 'de', 'fr', 'es', 'ar', 'ru', 'hi'];

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  locale: string;
  status: string;
  publishedAt?: string;
  viewCount: number;
  seoScore?: number;
}

const MOCK_POSTS: BlogPost[] = Array.from({ length: 15 }, (_, i) => ({
  id: `post-${i}`, title: `Blog Yazısı ${i + 1}`, slug: `blog-yazisi-${i + 1}`,
  locale: LOCALES[i % 8], status: ['PUBLISHED', 'DRAFT', 'PUBLISHED'][i % 3],
  publishedAt: i % 3 !== 1 ? new Date(Date.now() - i * 86400000 * 3).toISOString() : undefined,
  viewCount: Math.floor(Math.random() * 5000), seoScore: 60 + Math.floor(Math.random() * 40),
}));

const PostSchema = z.object({
  title: z.string().min(1, 'Başlık gerekli'),
  slug: z.string().min(1, 'Slug gerekli'),
  locale: z.string().min(1),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  body: z.string().min(1, 'İçerik gerekli'),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  publishedAt: z.string().optional(),
});

type PostForm = z.infer<typeof PostSchema>;

export default function BlogPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editPost, setEditPost] = useState<BlogPost | null>(null);
  const [localeFilter, setLocaleFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-blog'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/blog'); return r.data?.data ?? MOCK_POSTS; } catch { return MOCK_POSTS; } },
  });

  const createMutation = useMutation({
    mutationFn: (d: PostForm) => adminApi.post('/admin/blog', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-blog'] }); toast('Yazı oluşturuldu', 'success'); setModalOpen(false); reset(); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PostForm }) => adminApi.put(`/admin/blog/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-blog'] }); toast('Yazı güncellendi', 'success'); setEditPost(null); reset(); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/admin/blog/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-blog'] }); toast('Yazı silindi', 'warning'); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<PostForm>({
    resolver: zodResolver(PostSchema),
    defaultValues: { status: 'DRAFT', locale: 'tr' },
  });

  const openEdit = (post: BlogPost) => {
    setEditPost(post);
    setValue('title', post.title); setValue('slug', post.slug); setValue('locale', post.locale);
    setValue('status', post.status as 'DRAFT' | 'PUBLISHED'); setValue('body', '');
  };

  const posts = (data ?? MOCK_POSTS) as BlogPost[];
  const filtered = localeFilter ? posts.filter((p) => p.locale === localeFilter) : posts;

  const columns: ColumnDef<BlogPost>[] = [
    { header: 'Başlık', accessorKey: 'title', cell: ({ row }) => (
      <div><p className="font-medium text-sm">{row.original.title}</p><p className="text-xs text-[var(--text-muted)] font-mono">{row.original.slug}</p></div>
    )},
    { header: 'Dil', accessorKey: 'locale', cell: ({ getValue }) => <Badge variant="default">{(getValue() as string).toUpperCase()}</Badge> },
    { header: 'Durum', accessorKey: 'status', cell: ({ getValue }) => <Badge variant={getValue() === 'PUBLISHED' ? 'success' : 'warning'}>{getValue() as string}</Badge> },
    { header: 'Yayın', accessorKey: 'publishedAt', cell: ({ getValue }) => {
      const v = getValue() as string | undefined;
      return v ? <span className="text-xs text-[var(--text-muted)]">{format(new Date(v), 'dd MMM yyyy', { locale: tr })}</span> : <span className="text-[var(--text-muted)]">—</span>;
    }},
    { header: 'Görüntüleme', accessorKey: 'viewCount', cell: ({ getValue }) => <span className="text-sm">{(getValue() as number).toLocaleString()}</span> },
    { header: 'SEO', accessorKey: 'seoScore', cell: ({ getValue }) => {
      const v = getValue() as number | undefined;
      return v ? <span className={v >= 80 ? 'text-emerald-400 font-bold' : 'text-yellow-400 font-bold'}>{v}</span> : '—';
    }},
    { header: '', id: 'actions', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="xs" variant="ghost" icon={<Edit3 className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}>Düzenle</Button>
        <Button size="xs" variant="danger" icon={<Trash2 className="w-3 h-3" />}
          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(row.original.id); }}>Sil</Button>
      </div>
    )},
  ];

  if (isLoading) return <PageSpinner />;

  const isEditing = !!editPost;
  const modalTitle = isEditing ? 'Yazıyı Düzenle' : 'Yeni Blog Yazısı';
  const isModalOpen = modalOpen || isEditing;
  const closeModal = () => { setModalOpen(false); setEditPost(null); reset(); };
  const onSubmit = handleSubmit((d) => {
    if (isEditing && editPost) { updateMutation.mutate({ id: editPost.id, data: d }); }
    else { createMutation.mutate(d); }
  });

  const publishedCount = posts.filter((p) => p.status === 'PUBLISHED').length;
  const draftCount = posts.filter((p) => p.status === 'DRAFT').length;
  const totalViews = posts.reduce((a, p) => a + p.viewCount, 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Blog Yönetimi</h1>
          <p>{posts.length} yazı · {publishedCount} yayında · {draftCount} taslak</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          Yeni Yazı
        </Button>
      </div>

      <div className="kpi-grid">
        {[
          { label: 'Toplam', value: posts.length, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
          { label: 'Yayında', value: publishedCount, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
          { label: 'Taslak', value: draftCount, color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
          { label: 'Görüntüleme', value: totalViews.toLocaleString('tr-TR'), color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
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
        <div className="section-card-header">
          <span className="section-card-title">Blog Yazıları</span>
          <Select
            options={[{ value: '', label: 'Tüm Diller' }, ...LOCALES.map((l) => ({ value: l, label: l.toUpperCase() }))]}
            value={localeFilter}
            onChange={(e) => setLocaleFilter(e.target.value)}
          />
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Başlık, slug ara..."
          emptyMessage="Blog yazısı bulunamadı."
          noBorder
        />
      </div>

      <Modal open={isModalOpen} onClose={closeModal} title={modalTitle} size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Vazgeç</Button>
            <Button variant="primary" loading={createMutation.isPending || updateMutation.isPending} onClick={onSubmit}>
              {isEditing ? 'Güncelle' : 'Oluştur'}
            </Button>
          </>
        }
      >
        <form className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Başlık" {...register('title')} error={errors.title?.message} />
            <Input label="Slug" {...register('slug')} error={errors.slug?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Dil" options={LOCALES.map((l) => ({ value: l, label: l.toUpperCase() }))} {...register('locale')} />
            <Select label="Durum" options={[{ value: 'DRAFT', label: 'Taslak' }, { value: 'PUBLISHED', label: 'Yayında' }]} {...register('status')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">İçerik (Markdown)</label>
            <textarea
              className="w-full min-h-[200px] rounded-lg border bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2 text-sm font-mono border-[var(--border-default)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
              placeholder="# Blog başlığı&#10;&#10;İçerik buraya..."
              {...register('body')}
            />
            {errors.body && <p className="text-xs text-red-400">{errors.body.message}</p>}
          </div>
          <Input label="Meta Başlık" {...register('metaTitle')} />
          <Input label="Meta Açıklaması" {...register('metaDescription')} />
          <Input label="Yayın Tarihi" type="datetime-local" {...register('publishedAt')} />
        </form>
      </Modal>
    </div>
  );
}
