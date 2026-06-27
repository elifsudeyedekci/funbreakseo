'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MessageSquare, Clock, Send } from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category?: string;
  assignedTo?: string;
  createdAt: string;
  lastReplyAt?: string;
  slaBreached?: boolean;
}

const MOCK_TICKETS: Ticket[] = Array.from({ length: 18 }, (_, i) => ({
  id: `ticket-${i}`,
  subject: `Destek Konusu ${i + 1}`,
  customerName: `Müşteri ${i + 1}`,
  customerEmail: `musteri${i + 1}@example.com`,
  status: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'][i % 4] as Ticket['status'],
  priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][i % 4] as Ticket['priority'],
  category: ['billing', 'technical', 'feature', 'other'][i % 4],
  assignedTo: i % 3 === 0 ? 'staff@funbreakseo.com' : undefined,
  createdAt: new Date(Date.now() - i * 3600000 * 6).toISOString(),
  lastReplyAt: i % 2 === 0 ? new Date(Date.now() - i * 3600000 * 2).toISOString() : undefined,
  slaBreached: i % 5 === 0,
}));

export default function SupportPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async () => {
      try {
        const r = await adminApi.get('/admin/support/tickets');
        const payload = Array.isArray(r.data) ? r.data : (r.data?.data ?? r.data?.items ?? r.data);
        return Array.isArray(payload) && payload.length > 0 ? payload : MOCK_TICKETS;
      }
      catch { return []; }
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      adminApi.post(`/admin/support/tickets/${id}/reply`, { message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
      toast('Yanıt gönderildi', 'success');
      setReplyText('');
      setSelectedTicket(null);
    },
    onError: () => toast('Yanıt gönderilemedi', 'error'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, staffId }: { id: string; staffId: string }) =>
      adminApi.patch(`/admin/support/tickets/${id}`, { assignedTo: staffId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tickets'] }); toast('Atama yapıldı', 'success'); },
  });

  const tickets = (data ?? []) as Ticket[];
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const urgentCount = tickets.filter((t) => t.priority === 'URGENT' && t.status !== 'CLOSED').length;

  const priorityVariant = { LOW: 'default', MEDIUM: 'info', HIGH: 'warning', URGENT: 'danger' } as const;
  const statusVariant = { OPEN: 'danger', IN_PROGRESS: 'warning', RESOLVED: 'success', CLOSED: 'default' } as const;

  const columns: ColumnDef<Ticket>[] = [
    {
      header: 'Ticket',
      id: 'ticket',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.subject}</p>
          <p className="text-xs text-[var(--text-muted)]">{row.original.customerEmail}</p>
          {row.original.slaBreached && (
            <span className="text-xs text-red-400 flex items-center gap-0.5">
              <Clock className="w-3 h-3" /> SLA İhlal
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Öncelik',
      accessorKey: 'priority',
      cell: ({ getValue }) => <Badge variant={priorityVariant[getValue() as keyof typeof priorityVariant]}>{getValue() as string}</Badge>,
    },
    {
      header: 'Durum',
      accessorKey: 'status',
      cell: ({ getValue }) => <Badge variant={statusVariant[getValue() as keyof typeof statusVariant]}>{getValue() as string}</Badge>,
    },
    {
      header: 'Kategori',
      accessorKey: 'category',
      cell: ({ getValue }) => <span className="text-xs text-[var(--text-muted)] capitalize">{(getValue() as string) || '—'}</span>,
    },
    {
      header: 'Atanan',
      accessorKey: 'assignedTo',
      cell: ({ getValue }) => (getValue() as string) ? <span className="text-xs">{getValue() as string}</span> : <span className="text-[var(--text-muted)]">Atanmamış</span>,
    },
    {
      header: 'Oluşturulma',
      accessorKey: 'createdAt',
      cell: ({ getValue }) => (
        <span className="text-xs text-[var(--text-muted)]">
          {formatDistanceToNow(new Date(getValue() as string), { addSuffix: true, locale: tr })}
        </span>
      ),
    },
    {
      header: 'Aksiyon',
      id: 'actions',
      cell: ({ row }) => (
        <Button size="xs" variant="secondary" icon={<MessageSquare className="w-3 h-3" />}
          onClick={(e) => { e.stopPropagation(); setSelectedTicket(row.original); }}>
          Yanıtla
        </Button>
      ),
    },
  ];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Destek Ticket'ları</h1>
          <p>Müşteri destek talepleri — {tickets.length} kayıt</p>
        </div>
      </div>

      <div className="kpi-grid">
        {[
          { label: 'Toplam', value: tickets.length, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
          { label: 'Açık', value: openCount, color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
          { label: 'İşlemde', value: inProgressCount, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
          { label: 'Acil', value: urgentCount, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
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
          <span className="section-card-title">Ticket Listesi</span>
        </div>
        <DataTable columns={columns} data={tickets} searchPlaceholder="Konu, müşteri ara..." emptyMessage="Ticket bulunamadı." noBorder />
      </div>

      {/* Reply Modal */}
      <Modal
        open={!!selectedTicket}
        onClose={() => { setSelectedTicket(null); setReplyText(''); }}
        title={selectedTicket?.subject ?? ''}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setSelectedTicket(null); setReplyText(''); }}>Kapat</Button>
            <Button
              variant="primary"
              icon={<Send className="w-4 h-4" />}
              loading={replyMutation.isPending}
              onClick={() => {
                if (selectedTicket && replyText.trim()) {
                  replyMutation.mutate({ id: selectedTicket.id, message: replyText });
                }
              }}
            >
              Yanıtla
            </Button>
          </>
        }
      >
        {selectedTicket && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[var(--bg-elevated)] rounded p-2">
                <p className="text-[var(--text-muted)]">Müşteri</p>
                <p className="font-medium">{selectedTicket.customerName}</p>
                <p className="text-[var(--text-muted)]">{selectedTicket.customerEmail}</p>
              </div>
              <div className="bg-[var(--bg-elevated)] rounded p-2">
                <p className="text-[var(--text-muted)]">Oluşturulma</p>
                <p className="font-medium">{format(new Date(selectedTicket.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Yanıtınız</label>
              <textarea
                className="w-full min-h-[120px] rounded-lg border bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2 text-sm border-[var(--border-subtle)] focus:border-[var(--accent)] focus:outline-none resize-y"
                placeholder="Müşteriye yanıtınızı yazın..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
