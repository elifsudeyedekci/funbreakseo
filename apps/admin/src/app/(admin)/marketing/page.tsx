'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, CheckCircle, Star, Send, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Testimonial { id: string; customerName: string; company?: string; content: string; rating: number; isApproved: boolean; isFeatured: boolean; locale: string; }
interface CaseStudy { id: string; title: string; customer: string; locale: string; status: string; publishedAt?: string; }
interface EmailCampaign {
  id: string; name: string; subject: string; status: string; scheduledAt?: string;
  sentCount: number; openCount: number; clickCount: number; unsubCount: number;
}

const MOCK_TESTIMONIALS: Testimonial[] = Array.from({ length: 8 }, (_, i) => ({
  id: `t-${i}`, customerName: `Müşteri ${i + 1}`, company: i % 2 === 0 ? `Şirket ${i + 1}` : undefined,
  content: `FunBreak SEO sayesinde organik trafiğimiz %${20 + i * 10} arttı. Çok memnunuz.`,
  rating: 4 + (i % 2), isApproved: i % 3 !== 0, isFeatured: i === 1 || i === 4,
  locale: ['tr', 'en', 'de'][i % 3],
}));

const MOCK_CASE_STUDIES: CaseStudy[] = [
  { id: 'cs1', title: 'E-ticaret SEO Başarı Hikayesi', customer: 'Şirket A', locale: 'tr', status: 'PUBLISHED', publishedAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: 'cs2', title: 'SaaS Organik Büyüme', customer: 'Şirket B', locale: 'en', status: 'DRAFT' },
];

const MOCK_CAMPAIGNS: EmailCampaign[] = [
  { id: 'ec1', name: 'Ocak Bülteni', subject: 'SEO Trendleri 2026', status: 'SENT', sentCount: 1234, openCount: 456, clickCount: 89, unsubCount: 3 },
  { id: 'ec2', name: 'Yeni Özellik Duyurusu', subject: 'GEO Visibility Artık Canlı!', status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 86400000 * 3).toISOString(), sentCount: 0, openCount: 0, clickCount: 0, unsubCount: 0 },
  { id: 'ec3', name: 'Aylık Hatırlatma', subject: 'Raporunuz Hazır', status: 'DRAFT', sentCount: 0, openCount: 0, clickCount: 0, unsubCount: 0 },
];

const CampaignSchema = z.object({
  name: z.string().min(1, 'İsim gerekli'),
  subject: z.string().min(1, 'Konu gerekli'),
  html: z.string().min(1, 'İçerik gerekli'),
  locale: z.string().min(1),
  segment: z.string().optional(),
});

type CampaignForm = z.infer<typeof CampaignSchema>;

export default function MarketingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [campaignModal, setCampaignModal] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState<EmailCampaign | null>(null);

  const { data: testimonials = [] } = useQuery({
    queryKey: ['admin-testimonials'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/testimonials'); return r.data?.data ?? []; } catch { return []; } },
  });

  const { data: caseStudies = [] } = useQuery({
    queryKey: ['admin-case-studies'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/marketing/case-studies'); return r.data?.data ?? []; } catch { return []; } },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/marketing/campaigns'); return r.data?.data ?? []; } catch { return []; } },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.post(`/admin/testimonials/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-testimonials'] }); toast('Yorum onaylandı', 'success'); },
  });

  const featureMutation = useMutation({
    mutationFn: (id: string) => adminApi.post(`/admin/testimonials/${id}/feature`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-testimonials'] }); toast('Yorum öne çıkarıldı', 'success'); },
  });

  const createCampaignMutation = useMutation({
    mutationFn: (d: CampaignForm) => adminApi.post('/admin/marketing/campaigns', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-campaigns'] }); toast('Kampanya oluşturuldu', 'success'); setCampaignModal(false); reset(); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CampaignForm>({
    resolver: zodResolver(CampaignSchema),
    defaultValues: { locale: 'tr' },
  });

  const testimonialCols: ColumnDef<Testimonial>[] = [
    { header: 'Müşteri', accessorKey: 'customerName', cell: ({ row }) => (
      <div><p className="font-medium">{row.original.customerName}</p>{row.original.company && <p className="text-xs text-[var(--text-muted)]">{row.original.company}</p>}</div>
    )},
    { header: 'Puan', accessorKey: 'rating', cell: ({ getValue }) => (
      <div className="flex items-center gap-0.5">{Array.from({ length: getValue() as number }, (_, i) => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}</div>
    )},
    { header: 'İçerik', accessorKey: 'content', cell: ({ getValue }) => <span className="text-xs text-[var(--text-muted)] max-w-[200px] truncate block">{getValue() as string}</span> },
    { header: 'Dil', accessorKey: 'locale', cell: ({ getValue }) => <Badge variant="default">{(getValue() as string).toUpperCase()}</Badge> },
    { header: 'Durum', id: 'status', cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.isApproved && <Badge variant="success">Onaylı</Badge>}
        {row.original.isFeatured && <Badge variant="purple">Öne Çıkan</Badge>}
      </div>
    )},
    { header: '', id: 'actions', cell: ({ row }) => (
      <div className="flex gap-1">
        {!row.original.isApproved && (
          <Button size="xs" variant="success" icon={<CheckCircle className="w-3 h-3" />}
            onClick={(e) => { e.stopPropagation(); approveMutation.mutate(row.original.id); }}>Onayla</Button>
        )}
        {!row.original.isFeatured && (
          <Button size="xs" variant="secondary" icon={<Star className="w-3 h-3" />}
            onClick={(e) => { e.stopPropagation(); featureMutation.mutate(row.original.id); }}>Öne Çıkar</Button>
        )}
      </div>
    )},
  ];

  const campaignCols: ColumnDef<EmailCampaign>[] = [
    { header: 'Kampanya', accessorKey: 'name', cell: ({ row }) => (
      <div><p className="font-medium">{row.original.name}</p><p className="text-xs text-[var(--text-muted)]">{row.original.subject}</p></div>
    )},
    { header: 'Durum', accessorKey: 'status', cell: ({ getValue }) => {
      const s = getValue() as string;
      return <Badge variant={s === 'SENT' ? 'success' : s === 'SCHEDULED' ? 'warning' : 'default'}>{s}</Badge>;
    }},
    { header: 'Gönderilen', accessorKey: 'sentCount' },
    { header: 'Açılan', accessorKey: 'openCount', cell: ({ row }) => {
      const pct = row.original.sentCount > 0 ? Math.round((row.original.openCount / row.original.sentCount) * 100) : 0;
      return <span>{row.original.openCount} ({pct}%)</span>;
    }},
    { header: 'Tıklanan', accessorKey: 'clickCount', cell: ({ row }) => {
      const pct = row.original.sentCount > 0 ? Math.round((row.original.clickCount / row.original.sentCount) * 100) : 0;
      return <span>{row.original.clickCount} ({pct}%)</span>;
    }},
    { header: '', id: 'actions', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="xs" variant="ghost" icon={<Eye className="w-3 h-3" />}
          onClick={(e) => { e.stopPropagation(); setPreviewCampaign(row.original); }}>Önizle</Button>
        {row.original.status === 'DRAFT' && (
          <Button size="xs" variant="primary" icon={<Send className="w-3 h-3" />}>Gönder</Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Pazarlama</h1>
          <p>Kullanıcı yorumları, vaka çalışmaları ve kampanyalar</p>
        </div>
      </div>

      <Tabs defaultValue="testimonials">
        <TabsList>
          <TabsTrigger value="testimonials">Yorumlar</TabsTrigger>
          <TabsTrigger value="case-studies">Vaka Çalışmaları</TabsTrigger>
          <TabsTrigger value="campaigns">E-posta Kampanyaları</TabsTrigger>
          <TabsTrigger value="ab-tests">A/B Testler</TabsTrigger>
        </TabsList>

        <TabsContent value="testimonials">
          <DataTable columns={testimonialCols} data={testimonials as Testimonial[]} searchPlaceholder="Müşteri, içerik ara..." emptyMessage="Yorum bulunamadı." />
        </TabsContent>

        <TabsContent value="case-studies">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button variant="primary" icon={<Plus className="w-4 h-4" />}>Yeni Vaka Çalışması</Button>
            </div>
            <DataTable
              columns={[
                { header: 'Başlık', accessorKey: 'title', cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
                { header: 'Müşteri', accessorKey: 'customer' },
                { header: 'Dil', accessorKey: 'locale', cell: ({ getValue }) => <Badge variant="default">{(getValue() as string).toUpperCase()}</Badge> },
                { header: 'Durum', accessorKey: 'status', cell: ({ getValue }) => <Badge variant={getValue() === 'PUBLISHED' ? 'success' : 'warning'}>{getValue() as string}</Badge> },
              ] as ColumnDef<CaseStudy>[]}
              data={caseStudies as CaseStudy[]}
              emptyMessage="Vaka çalışması bulunamadı."
            />
          </div>
        </TabsContent>

        <TabsContent value="campaigns">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setCampaignModal(true)}>
                Kampanya Oluştur
              </Button>
            </div>
            <Card className="p-3 border-yellow-500/20 bg-yellow-500/5 text-xs text-yellow-400">
              Kampanyalar yalnızca pazarlama e-postasına izin veren abonelere gönderilir (otomatik filtre).
            </Card>
            <DataTable columns={campaignCols} data={campaigns as EmailCampaign[]} searchPlaceholder="Kampanya ara..." emptyMessage="Kampanya bulunamadı." />
          </div>
        </TabsContent>

        <TabsContent value="ab-tests">
          <Card>
            <CardHeader><CardTitle>A/B Test Yönetimi</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--text-muted)]">A/B test oluşturma ve sonuç izleme — yakında.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Modal */}
      <Modal open={campaignModal} onClose={() => { setCampaignModal(false); reset(); }} title="Kampanya Oluştur" size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCampaignModal(false); reset(); }}>Vazgeç</Button>
            <Button variant="primary" loading={createCampaignMutation.isPending}
              onClick={handleSubmit((d) => createCampaignMutation.mutate(d))}>
              Oluştur
            </Button>
          </>
        }
      >
        <form className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kampanya Adı" {...register('name')} error={errors.name?.message} />
            <Input label="E-posta Konusu" {...register('subject')} error={errors.subject?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Dil" options={[
              { value: 'tr', label: 'Türkçe' }, { value: 'en', label: 'İngilizce' },
              { value: 'de', label: 'Almanca' }, { value: 'fr', label: 'Fransızca' },
            ]} {...register('locale')} />
            <Select label="Segment" options={[
              { value: '', label: 'Tüm Aboneler' },
              { value: 'ACTIVE', label: 'Aktif Müşteriler' },
              { value: 'TRIALING', label: 'Trial Kullanıcılar' },
              { value: 'STARTER', label: 'Starter Plan' },
              { value: 'GROWTH', label: 'Growth Plan' },
            ]} {...register('segment')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text-secondary)]">HTML İçerik</label>
            <textarea
              className="w-full min-h-[160px] rounded-lg border bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2 text-sm font-mono border-[var(--border-subtle)] focus:border-[var(--accent)] focus:outline-none resize-y"
              placeholder="<h1>Merhaba {{firstName}},</h1>..."
              {...register('html')}
            />
            {errors.html && <p className="text-xs text-red-400">{errors.html.message}</p>}
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal open={!!previewCampaign} onClose={() => setPreviewCampaign(null)} title={previewCampaign?.name ?? ''} size="lg">
        {previewCampaign && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-[var(--bg-elevated)] rounded p-2">
                <p className="text-[var(--text-muted)] text-xs">Gönderilen</p>
                <p className="font-bold text-lg">{previewCampaign.sentCount.toLocaleString()}</p>
              </div>
              <div className="bg-[var(--bg-elevated)] rounded p-2">
                <p className="text-[var(--text-muted)] text-xs">Açılma Oranı</p>
                <p className="font-bold text-lg">{previewCampaign.sentCount > 0 ? Math.round((previewCampaign.openCount / previewCampaign.sentCount) * 100) : 0}%</p>
              </div>
              <div className="bg-[var(--bg-elevated)] rounded p-2">
                <p className="text-[var(--text-muted)] text-xs">Tıklama Oranı</p>
                <p className="font-bold text-lg">{previewCampaign.sentCount > 0 ? Math.round((previewCampaign.clickCount / previewCampaign.sentCount) * 100) : 0}%</p>
              </div>
              <div className="bg-[var(--bg-elevated)] rounded p-2">
                <p className="text-[var(--text-muted)] text-xs">Abonelik İptali</p>
                <p className="font-bold text-lg text-red-400">{previewCampaign.unsubCount}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
