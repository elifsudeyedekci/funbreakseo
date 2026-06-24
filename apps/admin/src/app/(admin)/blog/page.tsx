'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type ColumnDef } from '@tanstack/react-table';
import { getBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost } from '@/lib/api';
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
    queryFn: async () => { try { const r = await getBlogPosts(); return r.data?.data ?? MOCK_POSTS; } catch { return MOCK_POSTS; } },
  });

  const createMutation = useMutation({
    mutationFn: (d: PostForm) => createBlogPost(d as Record<string, unknown>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-blog'] }); toast('Yazı oluşturuldu', 'success'); setModalOpen(false); reset(); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PostForm }) => updateBlogPost(id, data as Record<string, unknown>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-blog'] }); toast('Yazı güncellendi', 'success'); setEditPost(null); reset(); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBlogPost(id),
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Blog Yönetimi</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{posts.length} yazı</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
          Yeni Yazı
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Başlık, slug ara..."
        emptyMessage="Blog yazısı bulunamadı."
        toolbar={
          <Select
            options={[{ value: '', label: 'Tüm Diller' }, ...LOCALES.map((l) => ({ value: l, label: l.toUpperCase() }))]}
            value={localeFilter}
            onChange={(e) => setLocaleFilter(e.target.value)}
          />
        }
      />

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
