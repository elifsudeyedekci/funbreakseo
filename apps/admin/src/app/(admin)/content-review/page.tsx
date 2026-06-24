'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Eye, CheckCircle, XCircle, Edit3 } from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  customer: string;
  project: string;
  focusKeyword: string;
  seoScore: number;
  geoScore: number;
  status: string;
  createdAt: string;
  body?: string;
}

const MOCK_CONTENT: ContentItem[] = Array.from({ length: 15 }, (_, i) => ({
  id: `content-${i}`,
  title: `${['SEO İçerik Başlığı', 'Ürün Açıklaması', 'Blog Yazısı'][i % 3]} ${i + 1}`,
  customer: `Müşteri ${i + 1}`,
  project: `Proje ${(i % 5) + 1}`,
  focusKeyword: `anahtar kelime ${i + 1}`,
  seoScore: 60 + Math.floor(Math.random() * 40),
  geoScore: 50 + Math.floor(Math.random() * 50),
  status: 'REVIEW',
  createdAt: new Date(Date.now() - i * 3600000 * 8).toISOString(),
  body: `# ${`Blog Yazısı ${i + 1}`}\n\nBu içerik inceleme beklemektedir. Anahtar kelime: anahtar kelime ${i + 1}.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit...`,
}));

export default function ContentReviewPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<ContentItem | null>(null);
  const [rejectItem, setRejectItem] = useState<ContentItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-content-review'],
    queryFn: async () => {
      try { const r = await getContentReview(); return r.data?.data ?? MOCK_CONTENT; }
      catch { return MOCK_CONTENT; }
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveContent(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-content-review'] }); toast('İçerik onaylandı', 'success'); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectContent(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-content-review'] }); toast('İçerik reddedildi', 'warning'); setRejectItem(null); setRejectReason(''); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const content = (data ?? MOCK_CONTENT) as ContentItem[];

  const columns: ColumnDef<ContentItem>[] = [
    {
      header: 'Başlık',
      accessorKey: 'title',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.title}</p>
          <p className="text-xs text-[var(--text-muted)]">KW: {row.original.focusKeyword}</p>
        </div>
      ),
    },
    {
      header: 'Müşteri / Proje',
      id: 'customer-project',
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.customer}</p>
          <p className="text-xs text-[var(--text-muted)]">{row.original.project}</p>
        </div>
      ),
    },
    {
      header: 'SEO',
      accessorKey: 'seoScore',
      cell: ({ getValue }) => {
        const v = getValue() as number;
        return <span className={v >= 80 ? 'text-emerald-400 font-bold' : v >= 60 ? 'text-yellow-400 font-bold' : 'text-red-400 font-bold'}>{v}</span>;
      },
    },
    {
      header: 'GEO',
      accessorKey: 'geoScore',
      cell: ({ getValue }) => {
        const v = getValue() as number;
        return <span className={v >= 80 ? 'text-purple-400 font-bold' : v >= 60 ? 'text-yellow-400 font-bold' : 'text-red-400 font-bold'}>{v}</span>;
      },
    },
    {
      header: 'Tarih',
      accessorKey: 'createdAt',
      cell: ({ getValue }) => <span className="text-xs text-[var(--text-muted)]">{format(new Date(getValue() as string), 'dd MMM HH:mm', { locale: tr })}</span>,
    },
    {
      header: 'Aksiyon',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="xs" variant="ghost" icon={<Eye className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); setPreview(row.original); }}>
            Önizle
          </Button>
          <Button size="xs" variant="success" icon={<CheckCircle className="w-3 h-3" />}
            onClick={(e) => { e.stopPropagation(); approveMutation.mutate(row.original.id); }}
            loading={approveMutation.isPending}>
            Onayla
          </Button>
          <Button size="xs" variant="danger" icon={<XCircle className="w-3 h-3" />}
            onClick={(e) => { e.stopPropagation(); setRejectItem(row.original); }}>
            Reddet
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">İçerik İnceleme</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{content.length} içerik onay bekliyor</p>
        </div>
        {selected.length > 0 && (
          <div className="flex gap-2">
            <Badge variant="warning">{selected.length} seçili</Badge>
            <Button size="sm" variant="success">Toplu Onayla</Button>
            <Button size="sm" variant="danger">Toplu Reddet</Button>
          </div>
        )}
      </div>

      <DataTable columns={columns} data={content} searchPlaceholder="Başlık, müşteri, KW ara..." emptyMessage="İncelenecek içerik yok." />

      {/* Preview Drawer */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title ?? ''} size="xl">
        {preview && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Badge variant="info">SEO: {preview.seoScore}</Badge>
              <Badge variant="purple">GEO: {preview.geoScore}</Badge>
              <Badge variant="default">KW: {preview.focusKeyword}</Badge>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed font-sans">
                {preview.body}
              </pre>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" icon={<Edit3 className="w-4 h-4" />}>Düzenle</Button>
              <Button variant="success" icon={<CheckCircle className="w-4 h-4" />}
                onClick={() => { approveMutation.mutate(preview.id); setPreview(null); }}>
                Onayla
              </Button>
              <Button variant="danger" icon={<XCircle className="w-4 h-4" />}
                onClick={() => { setRejectItem(preview); setPreview(null); }}>
                Reddet
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={!!rejectItem}
        onClose={() => setRejectItem(null)}
        title="İçeriği Reddet"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectItem(null)}>Vazgeç</Button>
            <Button variant="danger" loading={rejectMutation.isPending}
              onClick={() => { if (rejectItem) rejectMutation.mutate({ id: rejectItem.id, reason: rejectReason }); }}>
              Reddet
            </Button>
          </>
        }
      >
        <Input
          label="Red Sebebi"
          placeholder="İçerik neden reddedildi?"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
