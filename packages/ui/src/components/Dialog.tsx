'use client';
import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'full';
}

const sizeMap = {
  sm: 'max-w-sm',
  default: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
};

export function Dialog({ open, onClose, children }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

export function DialogContent({ children, className, size = 'default' }: DialogContentProps) {
  return (
    <div className={cn('relative mx-auto w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 shadow-2xl', sizeMap[size], className)}>
      {children}
    </div>
  );
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-4', className)}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('text-lg font-semibold text-[var(--text-primary)]', className)}>{children}</h2>;
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('mt-1 text-sm text-[var(--text-secondary)]', className)}>{children}</p>;
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mt-6 flex justify-end gap-3', className)}>{children}</div>;
}

export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="absolute right-4 top-4 rounded-md p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
