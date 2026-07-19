'use client';

import { Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '../InfoTooltip';

export interface CheckRowProps {
  label: string;
  ok: boolean | null;
  detail?: string;
  info?: string;
  className?: string;
}

/** ✅/❌/⚠️ consistent visual language for pass/fail/unknown checks. */
export function CheckRow({ label, ok, detail, info, className }: CheckRowProps) {
  const Icon = ok === null ? AlertTriangle : ok ? Check : X;
  const color = ok === null ? 'text-yellow-400' : ok ? 'text-green-400' : 'text-red-400';
  const bg = ok === null ? 'bg-yellow-500/10' : ok ? 'bg-green-500/10' : 'bg-red-500/10';

  return (
    <div className={cn('flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3', bg, className)}>
      <Icon className={cn('h-4 w-4 flex-shrink-0', color)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-white/80">{label}</span>
          {info && <InfoTooltip text={info} />}
        </div>
        {detail && <p className="text-xs text-white/40 mt-0.5 truncate">{detail}</p>}
      </div>
    </div>
  );
}

export default CheckRow;
