'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AccordionSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  badge?: ReactNode;
  className?: string;
}

export function AccordionSection({ title, defaultOpen = false, children, badge, className }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-2xl border border-white/10 bg-white/2 overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-white">{title}</span>
        {badge && <span className="flex-shrink-0">{badge}</span>}
        <span className="ml-auto flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-white/40">{open ? 'Detayları Gizle' : 'Detayları Göster'}</span>
          <ChevronDown
            className={cn('h-4 w-4 text-white/40 transition-transform duration-200', open && 'rotate-180')}
          />
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default AccordionSection;
