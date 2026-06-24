'use client';
import * as React from 'react';
import { cn } from '../utils';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue>({ open: false, setOpen: () => {} });

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-flex">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open, setOpen } = React.useContext(DropdownMenuContext);
  return (
    <div className={cn('cursor-pointer', className)} onClick={() => setOpen(!open)}>{children}</div>
  );
}

export function DropdownMenuContent({ children, className, align = 'right' }: { children: React.ReactNode; className?: string; align?: 'left' | 'right' | 'center' }) {
  const { open } = React.useContext(DropdownMenuContext);
  const alignClasses = { left: 'left-0', right: 'right-0', center: 'left-1/2 -translate-x-1/2' };
  if (!open) return null;
  return (
    <div className={cn('absolute top-full mt-1 z-50 min-w-[160px] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-1 shadow-xl', alignClasses[align], className)}>
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, className, onClick, disabled }: { children: React.ReactNode; className?: string; onClick?: () => void; disabled?: boolean }) {
  const { setOpen } = React.useContext(DropdownMenuContext);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => { onClick?.(); setOpen(false); }}
      className={cn('flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed', className)}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider', className)}>{children}</div>;
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('my-1 h-px bg-[var(--border-subtle)]', className)} />;
}
