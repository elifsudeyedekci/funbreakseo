'use client';
import * as React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../utils';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (opts: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((opts: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id, ...opts }]);
    setTimeout(() => {
      setToasts((p) => p.filter((t) => t.id !== id));
    }, opts.duration ?? 4000);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-[var(--success)]" />,
  error: <XCircle className="h-5 w-5 text-[var(--danger)]" />,
  warning: <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />,
  info: <Info className="h-5 w-5 text-[var(--accent)]" />,
};

const variantBorder: Record<ToastVariant, string> = {
  success: 'border-l-[var(--success)]',
  error: 'border-l-[var(--danger)]',
  warning: 'border-l-[var(--warning)]',
  info: 'border-l-[var(--accent)]',
};

function ToastViewport({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] border-l-4 bg-[var(--bg-elevated)] p-4 shadow-xl min-w-[320px] max-w-[420px] animate-in slide-in-from-right-5 fade-in duration-200',
            variantBorder[t.variant]
          )}
        >
          <div className="flex-shrink-0 mt-0.5">{icons[t.variant]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">{t.title}</p>
            {t.description && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.description}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
