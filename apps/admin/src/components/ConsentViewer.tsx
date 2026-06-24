'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FileText, Download } from 'lucide-react';
import { getConsentPdf } from '@/lib/api';

interface ConsentRecord {
  id: string;
  type: string;
  version: string;
  acceptedAt: string;
  ipAddress: string;
  device: string;
  textSnapshot?: string;
}

interface ConsentViewerProps {
  consent: ConsentRecord | null;
  customerId: string;
  onClose: () => void;
}

export function ConsentViewer({ consent, customerId, onClose }: ConsentViewerProps) {
  const [downloading, setDownloading] = useState(false);

  if (!consent) return null;

  const handlePdfDownload = async () => {
    try {
      setDownloading(true);
      const res = await getConsentPdf(customerId, consent.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `onay-${consent.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // handle error
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={!!consent}
      onClose={onClose}
      title={`${consent.type} v${consent.version}`}
      size="xl"
      footer={
        <Button
          variant="secondary"
          icon={<Download className="w-4 h-4" />}
          onClick={handlePdfDownload}
          loading={downloading}
        >
          PDF İndir
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[var(--bg-elevated)] rounded-lg p-2">
            <p className="text-[var(--text-muted)]">Tarih</p>
            <p className="text-[var(--text-primary)] font-medium">{new Date(consent.acceptedAt).toLocaleString('tr-TR')}</p>
          </div>
          <div className="bg-[var(--bg-elevated)] rounded-lg p-2">
            <p className="text-[var(--text-muted)]">IP Adresi</p>
            <p className="text-[var(--text-primary)] font-medium font-mono">{consent.ipAddress}</p>
          </div>
          <div className="bg-[var(--bg-elevated)] rounded-lg p-2 col-span-2">
            <p className="text-[var(--text-muted)]">Cihaz</p>
            <p className="text-[var(--text-primary)] font-medium text-xs truncate">{consent.device}</p>
          </div>
        </div>
        {consent.textSnapshot ? (
          <div className="bg-[var(--bg-elevated)] rounded-lg p-3 max-h-72 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-[var(--text-muted)]" />
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase">Sözleşme Metni (O Andaki Versiyon)</p>
            </div>
            <pre className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {consent.textSnapshot}
            </pre>
          </div>
        ) : (
          <div className="bg-[var(--bg-elevated)] rounded-lg p-4 text-center text-sm text-[var(--text-muted)]">
            Sözleşme metni mevcut değil
          </div>
        )}
      </div>
    </Modal>
  );
}
