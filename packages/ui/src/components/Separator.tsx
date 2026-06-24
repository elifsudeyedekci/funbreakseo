import * as React from 'react';
import { cn } from '../utils';

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
}

export function Separator({ orientation = 'horizontal', className, label }: SeparatorProps) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <div className="flex-1 h-px bg-[var(--border-subtle)]" />
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{label}</span>
        <div className="flex-1 h-px bg-[var(--border-subtle)]" />
      </div>
    );
  }

  return (
    <div
      role="separator"
      className={cn(
        orientation === 'horizontal' ? 'h-px w-full bg-[var(--border-subtle)]' : 'w-px self-stretch bg-[var(--border-subtle)]',
        className
      )}
    />
  );
}
