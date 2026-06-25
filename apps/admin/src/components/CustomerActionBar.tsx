'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/components/ui/Toaster';
import { Modal } from '@/components/ui/Modal';
import { ActionModal } from '@/components/ActionModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Ban,
  CheckCircle,
  XCircle,
  RefreshCw,
  PlusCircle,
  Sliders,
  Mail,
  LogIn,
  Settings,
  CreditCard,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface CustomerActionBarProps {
  customerId: string;
  status: string;
  onRefresh: () => void;
}

export function CustomerActionBar({ customerId, status, onRefresh }: CustomerActionBarProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Modal states
  const [modal, setModal] = useState<
    'suspend' | 'activate' | 'cancel' | 'plan' | 'refund' | 'credit' | 'quota' | 'digest' | 'email' | null
  >(null);
  const [loading, setLoading] = useState(false);

  const close = () => setModal(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['customer', customerId] }); onRefresh(); };

  const run = async (fn: () => Promise<unknown>, successMsg: string) => {
    try {
      setLoading(true);
      await fn();
      toast(successMsg, 'success');
      close();
      refresh();
    } catch {
      toast('İşlem başarısız oldu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === 'ACTIVE' ? (
          <Button size="sm" variant="danger" icon={<Ban className="w-3.5 h-3.5" />} onClick={() => setModal('suspend')}>
            Askıya Al
          </Button>
        ) : (
          <Button size="sm" variant="success" icon={<CheckCircle className="w-3.5 h-3.5" />} onClick={() => setModal('activate')}>
            Aktifleştir
          </Button>
        )}
        <Button size="sm" variant="danger" icon={<XCircle className="w-3.5 h-3.5" />} onClick={() => setModal('cancel')}>
          Aboneliği İptal Et
        </Button>
        <Button size="sm" variant="secondary" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => setModal('plan')}>
          Plan Değiştir
        </Button>
        <Button size="sm" variant="secondary" icon={<CreditCard className="w-3.5 h-3.5" />} onClick={() => setModal('refund')}>
          Ücret İadesi
        </Button>
        <Button size="sm" variant="secondary" icon={<PlusCircle className="w-3.5 h-3.5" />} onClick={() => setModal('credit')}>
          Manuel Kredi
        </Button>
        <Button size="sm" variant="secondary" icon={<Sliders className="w-3.5 h-3.5" />} onClick={() => setModal('quota')}>
          Kota Override
        </Button>
        <Button size="sm" variant="secondary" icon={<Settings className="w-3.5 h-3.5" />} onClick={() => setModal('digest')}>
          Dijest Sıklığı
        </Button>
        <Button size="sm" variant="secondary" icon={<Mail className="w-3.5 h-3.5" />} onClick={() => setModal('email')}>
          Özel Mail
        </Button>
        <Button
          size="sm"
          variant="outline"
          icon={<LogIn className="w-3.5 h-3.5" />}
          onClick={() => run(() => adminApi.post(`/admin/customers/${customerId}/impersonate`), 'Müşteri oturumu açıldı (audit kaydedildi)')}
          loading={loading && modal === null}
        >
          Adına Giriş
        </Button>
      </div>

      {/* Suspend */}
      <ActionModal
        open={modal === 'suspend'}
        onClose={close}
        onConfirm={() => run(() => adminApi.post(`/admin/customers/${customerId}/suspend`), 'Müşteri askıya alındı.')}
        title="Müşteriyi Askıya Al"
        description="Bu müşteriyi askıya almak istediğinize emin misiniz? Müşteri platforma erişemeyecek."
        confirmLabel="Askıya Al"
        confirmVariant="danger"
        loading={loading}
      />

      {/* Activate */}
      <ActionModal
        open={modal === 'activate'}
        onClose={close}
        onConfirm={() => run(() => adminApi.post(`/admin/customers/${customerId}/activate`), 'Müşteri aktifleştirildi.')}
        title="Müşteriyi Aktifleştir"
        description="Bu müşteriyi yeniden aktifleştirmek istiyor musunuz?"
        confirmLabel="Aktifleştir"
        confirmVariant="success"
        loading={loading}
      />

      {/* Cancel */}
      <CancelModal
        open={modal === 'cancel'}
        onClose={close}
        onConfirm={(immediate) => run(() => adminApi.post(`/admin/customers/${customerId}/cancel-subscription`, { immediate }), 'Abonelik iptal edildi.')}
        loading={loading}
      />

      {/* Plan Change */}
      <PlanChangeModal
        open={modal === 'plan'}
        onClose={close}
        onConfirm={(d) => run(() => adminApi.post(`/admin/customers/${customerId}/change-plan`, d), 'Plan değiştirildi.')}
        loading={loading}
      />

      {/* Refund */}
      <RefundModal
        open={modal === 'refund'}
        onClose={close}
        onConfirm={(d) => run(() => adminApi.post(`/admin/customers/${customerId}/refund`, d), 'İade işlemi başlatıldı.')}
        loading={loading}
      />

      {/* Credit */}
      <CreditModal
        open={modal === 'credit'}
        onClose={close}
        onConfirm={(d) => run(() => adminApi.post(`/admin/customers/${customerId}/add-credit`, d), 'Kredi eklendi.')}
        loading={loading}
      />

      {/* Quota */}
      <QuotaModal
        open={modal === 'quota'}
        onClose={close}
        onConfirm={(d) => run(() => adminApi.post(`/admin/customers/${customerId}/override-quota`, d), 'Kota güncellendi.')}
        loading={loading}
      />

      {/* Digest */}
      <DigestModal
        open={modal === 'digest'}
        onClose={close}
        onConfirm={(freq) => run(() => adminApi.post(`/admin/customers/${customerId}/digest-frequency`, { frequency: freq }), 'Dijest sıklığı güncellendi.')}
        loading={loading}
      />

      {/* Email */}
      <EmailModal
        open={modal === 'email'}
        onClose={close}
        onConfirm={(d) => run(() => adminApi.post(`/admin/customers/${customerId}/send-email`, d), 'E-posta gönderildi.')}
        loading={loading}
      />
    </>
  );
}

// ─── Sub modals ───────────────────────────────────────────────────────────────

function CancelModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: (immediate: boolean) => void; loading: boolean;
}) {
  const [immediate, setImmediate] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Aboneliği İptal Et" size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Vazgeç</Button>
          <Button variant="danger" onClick={() => onConfirm(immediate)} loading={loading}>İptal Et</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--text-secondary)]">İptal zamanlamasını seçin:</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="cancel-type" checked={!immediate} onChange={() => setImmediate(false)} className="accent-indigo-500" />
          <span className="text-sm text-[var(--text-primary)]">Dönem sonunda iptal et</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="cancel-type" checked={immediate} onChange={() => setImmediate(true)} className="accent-indigo-500" />
          <span className="text-sm text-[var(--text-primary)]">Hemen iptal et</span>
        </label>
      </div>
    </Modal>
  );
}

const PlanChangeSchema = z.object({
  planId: z.string().min(1, 'Plan seçin'),
  isComplimentary: z.boolean().default(false),
  complimentaryReason: z.string().optional(),
  complimentaryUntil: z.string().optional(),
});

function PlanChangeModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: (d: Record<string, unknown>) => void; loading: boolean;
}) {
  const { register, handleSubmit, watch } = useForm({ resolver: zodResolver(PlanChangeSchema) });
  const isComp = watch('isComplimentary');

  return (
    <Modal open={open} onClose={onClose} title="Plan Değiştir" size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Vazgeç</Button>
          <Button variant="primary" onClick={handleSubmit((d) => onConfirm(d as Record<string, unknown>))} loading={loading}>Değiştir</Button>
        </>
      }
    >
      <form className="space-y-3">
        <Input label="Plan ID" placeholder="plan-uuid..." {...register('planId')} />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('isComplimentary')} className="accent-indigo-500" />
          <span className="text-sm text-[var(--text-primary)]">Complimentary (Ücretsiz ver)</span>
        </label>
        {isComp && (
          <>
            <Input label="Neden?" placeholder="Partner anlaşması..." {...register('complimentaryReason')} />
            <Input label="Bitiş Tarihi" type="datetime-local" {...register('complimentaryUntil')} />
          </>
        )}
      </form>
    </Modal>
  );
}

const RefundSchema = z.object({
  invoiceId: z.string().optional(),
  amount: z.coerce.number().positive(),
  type: z.enum(['full', 'partial']),
});

function RefundModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: (d: Record<string, unknown>) => void; loading: boolean;
}) {
  const { register, handleSubmit } = useForm<{ invoiceId?: string; amount: number; type: 'full' | 'partial' }>({ resolver: zodResolver(RefundSchema), defaultValues: { type: 'full' } });
  return (
    <Modal open={open} onClose={onClose} title="Ücret İadesi" size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Vazgeç</Button>
          <Button variant="danger" onClick={handleSubmit((d) => onConfirm(d as Record<string, unknown>))} loading={loading}>İade Et</Button>
        </>
      }
    >
      <form className="space-y-3">
        <Input label="Fatura ID (opsiyonel)" placeholder="inv-uuid..." {...register('invoiceId')} />
        <Select label="İade Tipi" options={[{ value: 'full', label: 'Tam İade' }, { value: 'partial', label: 'Kısmi İade' }]} {...register('type')} />
        <Input label="Tutar (₺)" type="number" step="0.01" {...register('amount')} />
      </form>
    </Modal>
  );
}

const CreditSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().min(1),
});

function CreditModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: (d: { amount: number; description: string }) => void; loading: boolean;
}) {
  const { register, handleSubmit } = useForm({ resolver: zodResolver(CreditSchema) });
  return (
    <Modal open={open} onClose={onClose} title="Manuel Kredi Ekle" size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Vazgeç</Button>
          <Button variant="success" onClick={handleSubmit((d) => onConfirm(d as { amount: number; description: string }))} loading={loading}>Ekle</Button>
        </>
      }
    >
      <form className="space-y-3">
        <Input label="Tutar (₺)" type="number" step="0.01" {...register('amount')} />
        <Input label="Açıklama" placeholder="Neden kredi eklendi?" {...register('description')} />
      </form>
    </Modal>
  );
}

const QuotaSchema = z.object({
  metric: z.string().min(1),
  value: z.coerce.number().int().min(0),
});

function QuotaModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: (d: { metric: string; value: number }) => void; loading: boolean;
}) {
  const { register, handleSubmit } = useForm({ resolver: zodResolver(QuotaSchema) });
  return (
    <Modal open={open} onClose={onClose} title="Kota Override" size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Vazgeç</Button>
          <Button variant="primary" onClick={handleSubmit((d) => onConfirm(d as { metric: string; value: number }))} loading={loading}>Uygula</Button>
        </>
      }
    >
      <form className="space-y-3">
        <Select label="Metrik" options={[
          { value: 'keywords', label: 'Anahtar Kelimeler' },
          { value: 'crawls', label: 'Taramalar' },
          { value: 'aiBlogs', label: 'AI Blog' },
          { value: 'geoQueries', label: 'GEO Sorgular' },
          { value: 'outreachCampaigns', label: 'Outreach Kampanya' },
        ]} {...register('metric')} />
        <Input label="Yeni Limit" type="number" {...register('value')} />
      </form>
    </Modal>
  );
}

function DigestModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: (freq: string) => void; loading: boolean;
}) {
  const [freq, setFreq] = useState('WEEKLY');
  return (
    <Modal open={open} onClose={onClose} title="Dijest Sıklığı" size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Vazgeç</Button>
          <Button variant="primary" onClick={() => onConfirm(freq)} loading={loading}>Kaydet</Button>
        </>
      }
    >
      <div className="space-y-2">
        {['DAILY', 'WEEKLY', 'MONTHLY'].map((f) => (
          <label key={f} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="freq" value={f} checked={freq === f} onChange={() => setFreq(f)} className="accent-indigo-500" />
            <span className="text-sm text-[var(--text-primary)]">{{ DAILY: 'Günlük', WEEKLY: 'Haftalık', MONTHLY: 'Aylık' }[f]}</span>
          </label>
        ))}
      </div>
    </Modal>
  );
}

const EmailSchema = z.object({
  subject: z.string().min(1),
  content: z.string().min(1),
});

function EmailModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: (d: { subject: string; content: string }) => void; loading: boolean;
}) {
  const { register, handleSubmit } = useForm({ resolver: zodResolver(EmailSchema) });
  return (
    <Modal open={open} onClose={onClose} title="Özel E-posta Gönder" size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Vazgeç</Button>
          <Button variant="primary" onClick={handleSubmit((d) => onConfirm(d as { subject: string; content: string }))} loading={loading}>Gönder</Button>
        </>
      }
    >
      <form className="space-y-3">
        <Input label="Konu" placeholder="E-posta konusu" {...register('subject')} />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--text-secondary)]">İçerik</label>
          <textarea
            className="w-full min-h-[120px] rounded-lg border bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] px-3 py-2 text-sm border-[var(--border-default)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
            placeholder="E-posta içeriği (HTML veya metin)..."
            {...register('content')}
          />
        </div>
      </form>
    </Modal>
  );
}
