'use client';
import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'left' | 'right' | 'bottom';
  className?: string;
}

const sideClasses = {
  right: 'right-0 top-0 bottom-0 w-full max-w-md',
  left: 'left-0 top-0 bottom-0 w-full max-w-md',
  bottom: 'bottom-0 left-0 right-0 max-h-[90vh]',
};

export function Drawer({ open, onClose, children, side = 'right', className }: DrawerProps) {
  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('absolute bg-[var(--bg-elevated)] border-[var(--border-subtle)] flex flex-col', side === 'bottom' ? 'border-t rounded-t-2xl' : side === 'right' ? 'border-l' : 'border-r', sideClasses[side], className)}>
        {children}
      </div>
    </div>
  );
}

export function DrawerHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-between p-4 border-b border-[var(--border-subtle)]', className)}>{children}</div>;
}

export function DrawerTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('text-lg font-semibold text-[var(--text-primary)]', className)}>{children}</h2>;
}

export function DrawerDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-sm text-[var(--text-secondary)]', className)}>{children}</p>;
}

export function DrawerContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex-1 overflow-y-auto p-4', className)}>{children}</div>;
}

export function DrawerFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-4 border-t border-[var(--border-subtle)]', className)}>{children}</div>;
}

export function DrawerClose({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} className="rounded-md p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
      <X className="h-4 w-4" />
    </button>
  );
}

export { Drawer as DrawerTrigger };
