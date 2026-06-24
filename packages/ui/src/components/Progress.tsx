'use client';
import * as React from 'react';
import { cn } from '../utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  size?: 'sm' | 'default' | 'lg';
  color?: 'accent' | 'success' | 'warning' | 'danger' | 'geo';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

const colorMap = {
  accent: 'bg-[var(--accent)]',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
  geo: 'bg-[var(--geo-accent)]',
};

const sizeMap = {
  sm: 'h-1.5',
  default: 'h-2.5',
  lg: 'h-4',
};

export function Progress({ value, max = 100, className, barClassName, size = 'default', color = 'accent', showLabel, label, animated }: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-[var(--text-secondary)]">{label}</span>
          {showLabel && <span className="text-xs font-medium text-[var(--text-primary)]">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={cn('w-full overflow-hidden rounded-full bg-[var(--border-subtle)]', sizeMap[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorMap[color], animated && 'animate-pulse', barClassName)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}
