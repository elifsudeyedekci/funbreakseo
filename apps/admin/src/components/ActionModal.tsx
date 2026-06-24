'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

interface ActionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
  loading?: boolean;
  children?: React.ReactNode;
}

export function ActionModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Onayla',
  confirmVariant = 'primary',
  loading,
  children,
}: ActionModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Vazgeç
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-[var(--text-secondary)] mb-3">{description}</p>
          {children}
        </div>
      </div>
    </Modal>
  );
}
