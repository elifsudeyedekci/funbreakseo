'use client';
import * as React from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '../utils';

interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  className?: string;
  placeholder?: string;
  presets?: Array<{ label: string; range: DateRange }>;
}

const DEFAULT_PRESETS = [
  { label: 'Son 7 gün', range: { from: new Date(Date.now() - 7 * 86400000), to: new Date() } },
  { label: 'Son 30 gün', range: { from: new Date(Date.now() - 30 * 86400000), to: new Date() } },
  { label: 'Son 90 gün', range: { from: new Date(Date.now() - 90 * 86400000), to: new Date() } },
  { label: 'Bu yıl', range: { from: new Date(new Date().getFullYear(), 0, 1), to: new Date() } },
];

function fmt(d: Date | null) {
  if (!d) return '';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function DateRangePicker({ value, onChange, className, placeholder = 'Tarih aralığı seç', presets = DEFAULT_PRESETS }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const displayValue = value?.from
    ? value.to ? `${fmt(value.from)} — ${fmt(value.to)}` : fmt(value.from)
    : placeholder;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
      >
        <CalendarDays className="h-4 w-4" />
        <span>{displayValue}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-2 shadow-xl min-w-[200px]">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { onChange?.(p.range); setOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] transition-colors"
            >
              {p.label}
            </button>
          ))}
          <div className="mx-2 my-1 h-px bg-[var(--border-subtle)]" />
          <div className="px-3 py-2 space-y-2">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Başlangıç</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                value={value?.from ? value.from.toISOString().split('T')[0] : ''}
                onChange={(e) => onChange?.({ from: e.target.value ? new Date(e.target.value) : null, to: value?.to ?? null })}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)]">Bitiş</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                value={value?.to ? value.to.toISOString().split('T')[0] : ''}
                onChange={(e) => onChange?.({ from: value?.from ?? null, to: e.target.value ? new Date(e.target.value) : null })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
