'use client';
import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../utils';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  category?: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
  className?: string;
}

export function CommandPalette({ open, onClose, items, placeholder = 'Komut veya sayfa ara...', className }: CommandPaletteProps) {
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const filtered = query
    ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()) || i.description?.toLowerCase().includes(query.toLowerCase()))
    : items.slice(0, 8);

  const categories = [...new Set(filtered.map((i) => i.category ?? 'Genel'))];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh] p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative z-10 w-full max-w-lg rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-2xl overflow-hidden', className)}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
          <Search className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sonuç bulunamadı.</p>
          ) : (
            categories.map((cat) => (
              <div key={cat}>
                <p className="px-2 py-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{cat}</p>
                {filtered.filter((i) => (i.category ?? 'Genel') === cat).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { item.action(); onClose(); setQuery(''); }}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-[var(--bg-base)] transition-colors"
                  >
                    {item.icon && <span className="text-[var(--text-muted)]">{item.icon}</span>}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-[var(--text-primary)]">{item.label}</p>
                      {item.description && <p className="text-xs text-[var(--text-muted)]">{item.description}</p>}
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
