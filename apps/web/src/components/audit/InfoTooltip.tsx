'use client';

import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InfoTooltipProps {
  text: string;
  className?: string;
}

export function InfoTooltip({ text, className }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  return (
    <span ref={ref} className={cn('relative inline-flex items-center group', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-white/40 hover:text-white/80 transition-colors"
        aria-label="Bilgi"
        aria-expanded={open}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[240px] rounded-lg border border-white/10 bg-[#111118] px-3 py-2 text-xs text-white/80 shadow-lg z-20 transition-opacity',
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        {text}
      </span>
    </span>
  );
}

export default InfoTooltip;
