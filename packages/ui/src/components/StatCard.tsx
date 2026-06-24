'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  sparkline?: number[];
  description?: string;
  className?: string;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  delta,
  deltaLabel,
  icon,
  description,
  className,
  loading,
}: StatCardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;
  const isNeutral = delta === 0;

  if (loading) {
    return (
      <div className={cn('rounded-xl border border-border-subtle bg-bg-surface p-5 animate-pulse', className)}>
        <div className="h-4 w-24 bg-bg-elevated rounded mb-3" />
        <div className="h-8 w-16 bg-bg-elevated rounded mb-2" />
        <div className="h-3 w-20 bg-bg-elevated rounded" />
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border-subtle bg-bg-surface p-5 transition-colors hover:border-border-strong', className)}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        {icon && <div className="text-text-muted">{icon}</div>}
      </div>

      <p className="font-mono text-3xl font-bold text-text-primary">{value}</p>

      {(delta !== undefined || description) && (
        <div className="mt-2 flex items-center gap-1.5">
          {delta !== undefined && (
            <>
              {isPositive && <TrendingUp className="h-3.5 w-3.5 text-success" />}
              {isNegative && <TrendingDown className="h-3.5 w-3.5 text-danger" />}
              {isNeutral && <Minus className="h-3.5 w-3.5 text-text-muted" />}
              <span className={cn(
                'text-xs font-medium',
                isPositive && 'text-success',
                isNegative && 'text-danger',
                isNeutral && 'text-text-muted',
              )}>
                {isPositive && '+'}{delta}{deltaLabel || '%'}
              </span>
            </>
          )}
          {description && (
            <span className="text-xs text-text-muted">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
