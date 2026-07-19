'use client';

import { cn } from '@/lib/utils';
import { HEADING_LEVEL_RAMP } from './colors';

export type HeadingLevel = 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6';

export interface HeadingLevelCount {
  level: HeadingLevel;
  count: number;
}

export interface HeadingDistributionBarsProps {
  counts: HeadingLevelCount[];
  className?: string;
}

const LEVEL_ORDER: HeadingLevel[] = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

export function HeadingDistributionBars({ counts, className }: HeadingDistributionBarsProps) {
  if (!counts || counts.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm', className)}>
        Veri yok
      </div>
    );
  }

  const byLevel = new Map(counts.map((c) => [c.level, c.count]));
  const rows = LEVEL_ORDER.filter((lvl) => byLevel.has(lvl)).map((lvl) => ({ level: lvl, count: byLevel.get(lvl) ?? 0 }));
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className={cn('space-y-2.5', className)}>
      {rows.map((row) => {
        const idx = LEVEL_ORDER.indexOf(row.level);
        const color = HEADING_LEVEL_RAMP[idx] ?? HEADING_LEVEL_RAMP[0];
        const pct = (row.count / max) * 100;
        return (
          <div key={row.level} className="flex items-center gap-3">
            <span className="w-8 flex-shrink-0 text-xs font-semibold text-white/60">{row.level}</span>
            <div className="flex-1 h-4 rounded-md bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-300"
                style={{ width: `${Math.max(row.count > 0 ? 3 : 0, pct)}%`, backgroundColor: color }}
              />
            </div>
            <span className="w-8 flex-shrink-0 text-right text-xs text-white/50 tabular-nums">{row.count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default HeadingDistributionBars;
