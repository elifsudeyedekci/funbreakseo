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
import { Eye, CheckCircle, XCircle, Reply, Plus, Play, Mail } from 'lucide-react';

interface PlatformCampaign {
  id: string;
  name: string;
  targetUrl: string;
  topic?: string | null;
  status: string;
  prospectsFound: number;
  emailsSent: number;
  replies: number;
  linksWon: number;
  project?: { domain?: string };
}

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
      try { const r = await adminApi.get('/admin/outreach-review'); return r.data?.data ?? []; }
      catch { return []; }
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

  const replies = (data ?? []) as OutreachReply[];

  // ── Platform kampanyaları (backlink havuzunu besleyen merkezi outreach) ──
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campForm, setCampForm] = useState({ name: '', targetUrl: 'https://funbreakseo.com', topic: '' });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['admin-outreach-campaigns'],
    queryFn: async () => {
      try {
        const r = await adminApi.get('/admin/outreach/campaigns');
        const raw = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
        return raw as PlatformCampaign[];
      } catch { return []; }
    },
  });

  const createCampaign = useMutation({
    mutationFn: () => adminApi.post('/admin/outreach/campaigns', campForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-outreach-campaigns'] });
      setShowCreateCampaign(false);
      setCampForm({ name: '', targetUrl: 'https://funbreakseo.com', topic: '' });
      toast('Kampanya oluşturuldu — adaylar bulunuyor', 'success');
    },
    onError: () => toast('Kampanya oluşturulamadı', 'error'),
  });

  const genEmails = useMutation({
    mutationFn: (id: string) => adminApi.post(`/admin/outreach/campaigns/${id}/generate-emails`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-outreach-campaigns'] }); toast('Mailler üretiliyor', 'success'); },
    onError: () => toast('Mail üretimi başlatılamadı', 'error'),
  });

  const startCampaign = useMutation({
    mutationFn: (id: string) => adminApi.post(`/admin/outreach/campaigns/${id}/start`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-outreach-campaigns'] }); toast('Kampanya başlatıldı — mailler gönderiliyor', 'success'); },
    onError: () => toast('Kampanya başlatılamadı', 'error'),
  });

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
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Outreach — Platform Kampanyaları</h1>
          <p>Sistem maili merkezi atar; olumlu dönüşler fiyat onayınızla backlink havuzuna girer</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateCampaign(true)}>
          Yeni Kampanya
        </Button>
      </div>

      {/* Kampanya listesi */}
      <div className="section-card" style={{ marginBottom: 20 }}>
        <div className="section-card-header"><span className="section-card-title">Kampanyalar ({campaigns.length})</span></div>
        {campaigns.length === 0 ? (
          <p style={{ padding: '20px', fontSize: 13, color: 'var(--text-muted)' }}>
            Henüz kampanya yok. &quot;Yeni Kampanya&quot; ile başlatın: sistem yüksek DR&apos;lı adayları bulur, kişisel mailleri üretir ve gönderir.
          </p>
        ) : (
          <div style={{ padding: '8px 16px' }}>
            {campaigns.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.topic ?? c.targetUrl}</p>
                </div>
                <Badge variant={c.status === 'RUNNING' ? 'success' : c.status === 'COMPLETED' ? 'info' : 'default'}>{c.status}</Badge>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {c.prospectsFound} aday · {c.emailsSent} mail · {c.replies} cevap · {c.linksWon} teklif
                </span>
                <div className="flex gap-1">
                  <Button size="xs" variant="secondary" icon={<Mail className="w-3 h-3" />} loading={genEmails.isPending}
                    onClick={() => genEmails.mutate(c.id)}>Mailleri Üret</Button>
                  <Button size="xs" variant="success" icon={<Play className="w-3 h-3" />} loading={startCampaign.isPending}
                    onClick={() => startCampaign.mutate(c.id)} disabled={c.status === 'RUNNING'}>Başlat</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showCreateCampaign} onClose={() => setShowCreateCampaign(false)} title="Yeni Platform Kampanyası"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateCampaign(false)}>İptal</Button>
            <Button variant="primary" loading={createCampaign.isPending}
              disabled={!campForm.name || !campForm.topic}
              onClick={() => createCampaign.mutate()}>Oluştur</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Kampanya Adı</p>
            <input value={campForm.name} onChange={(e) => setCampForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="örn. TR haber siteleri — SEO niş"
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Konu / Niş (aday bulmada kullanılır)</p>
            <input value={campForm.topic} onChange={(e) => setCampForm((p) => ({ ...p, topic: e.target.value }))}
              placeholder="örn. seo, dijital pazarlama, teknoloji haberleri"
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Hedef URL</p>
            <input value={campForm.targetUrl} onChange={(e) => setCampForm((p) => ({ ...p, targetUrl: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm" />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Akış: adaylar DR&apos;a göre bulunur → kişisel mailler üretilir → &quot;Başlat&quot; ile gönderim başlar →
            olumlu dönüşler aşağıdaki yanıt listesine ve fiyat onayı için Pazar sayfasındaki teklif kuyruğuna düşer.
          </p>
        </div>
      </Modal>

      <div className="section-card">
        <div className="section-card-header"><span className="section-card-title">Yanıt Listesi</span></div>
        <DataTable columns={columns} data={replies} searchPlaceholder="Domain, kampanya ara..." emptyMessage="İncelenecek yanıt yok." noBorder />
      </div>

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
