'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Eye, CheckCircle, XCircle, Reply } from 'lucide-react';

interface OutreachReply {
  id: string;
  prospectEmail: string;
  prospectDomain: string;
  campaignName: string;
  status: string;
  aiSummary: string;
  originalText: string;
  receivedAt: string;
  needsHumanReview: boolean;
}

const MOCK_REPLIES: OutreachReply[] = Array.from({ length: 10 }, (_, i) => ({
  id: `reply-${i}`,
  prospectEmail: `editor${i + 1}@blog${i + 1}.com`,
  prospectDomain: `blog${i + 1}.com`,
  campaignName: `Kampanya ${(i % 3) + 1}`,
  status: i % 3 === 0 ? 'REPLIED_POSITIVE' : 'NEEDS_REVIEW',
  aiSummary: 'Yayıncı içerik yerleştirmeye olumlu yaklaşıyor ve fiyat teklifinizi kabul etmeye hazır.',
  originalText: `Merhaba,\n\nTeklifinizi inceledik ve ilginç bulduk. ${i % 2 === 0 ? 'Link yerleştirme için $150 ücret alıyoruz.' : 'Evet, blog yazısı yayınlayabiliriz.'}\n\nSaygılarımla,\nEditör`,
  receivedAt: new Date(Date.now() - i * 3600000 * 12).toISOString(),
  needsHumanReview: true,
}));

export default function OutreachReviewPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [detail, setDetail] = useState<OutreachReply | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-outreach-review'],
    queryFn: async () => {
      try { const r = await adminApi.get('/admin/outreach/review'); return r.data?.data ?? MOCK_REPLIES; }
      catch { return MOCK_REPLIES; }
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.post(`/admin/outreach/replies/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-outreach-review'] }); toast('Yanıt onaylandı', 'success'); setDetail(null); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApi.post(`/admin/outreach/replies/${id}/reject`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-outreach-review'] }); toast('Yanıt reddedildi', 'warning'); setDetail(null); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const replies = (data ?? MOCK_REPLIES) as OutreachReply[];

  const columns: ColumnDef<OutreachReply>[] = [
    {
      header: 'Prospect',
      id: 'prospect',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.prospectDomain}</p>
          <p className="text-xs text-[var(--text-muted)]">{row.original.prospectEmail}</p>
        </div>
      ),
    },
    {
      header: 'Kampanya',
      accessorKey: 'campaignName',
    },
    {
      header: 'Durum',
      accessorKey: 'status',
      cell: ({ getValue }) => {
        const s = getValue() as string;
        return <Badge variant={s === 'REPLIED_POSITIVE' ? 'success' : 'warning'}>{s}</Badge>;
      },
    },
    {
      header: 'AI Özeti',
      accessorKey: 'aiSummary',
      cell: ({ getValue }) => (
        <span className="text-xs text-[var(--text-muted)] max-w-[200px] truncate block">{getValue() as string}</span>
      ),
    },
    {
      header: 'Tarih',
      accessorKey: 'receivedAt',
      cell: ({ getValue }) => <span className="text-xs text-[var(--text-muted)]">{format(new Date(getValue() as string), 'dd MMM HH:mm', { locale: tr })}</span>,
    },
    {
      header: 'Aksiyon',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="xs" variant="ghost" icon={<Eye className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); setDetail(row.original); }}>
            Detay
          </Button>
          <Button size="xs" variant="success" icon={<CheckCircle className="w-3 h-3" />}
            onClick={(e) => { e.stopPropagation(); approveMutation.mutate(row.original.id); }}>
            Onayla
          </Button>
          <Button size="xs" variant="danger" icon={<XCircle className="w-3 h-3" />}
            onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(row.original.id); }}>
            Reddet
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Outreach İnceleme</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">{replies.length} yanıt insan incelemesi bekliyor</p>
      </div>

      <DataTable columns={columns} data={replies} searchPlaceholder="Domain, kampanya ara..." emptyMessage="İncelenecek yanıt yok." />

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Yanıt — ${detail?.prospectDomain}`} size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDetail(null)}>Kapat</Button>
            <Button variant="secondary" icon={<Reply className="w-4 h-4" />}>Yanıtla</Button>
            <Button variant="danger" icon={<XCircle className="w-4 h-4" />} loading={rejectMutation.isPending}
              onClick={() => detail && rejectMutation.mutate(detail.id)}>Reddet</Button>
            <Button variant="success" icon={<CheckCircle className="w-4 h-4" />} loading={approveMutation.isPending}
              onClick={() => detail && approveMutation.mutate(detail.id)}>Onayla (Link Yayına)</Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
              <p className="text-xs font-semibold text-indigo-400 uppercase mb-1">AI Özeti</p>
              <p className="text-sm text-[var(--text-secondary)]">{detail.aiSummary}</p>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Orijinal Metin</p>
              <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans">{detail.originalText}</pre>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[var(--bg-elevated)] rounded p-2">
                <p className="text-[var(--text-muted)]">Kampanya</p>
                <p className="font-medium">{detail.campaignName}</p>
              </div>
              <div className="bg-[var(--bg-elevated)] rounded p-2">
                <p className="text-[var(--text-muted)]">Alındı</p>
                <p className="font-medium">{format(new Date(detail.receivedAt), 'dd MMM yyyy HH:mm', { locale: tr })}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
