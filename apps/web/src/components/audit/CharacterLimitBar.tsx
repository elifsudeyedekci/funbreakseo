'use client';

import { cn } from '@/lib/utils';
import { STATUS_COLORS } from './colors';

export interface CharacterLimitBarProps {
  current: number;
  idealMin: number;
  idealMax: number;
  label: string;
  className?: string;
}

function resolveState(current: number, idealMin: number, idealMax: number): { color: string; text: string } {
  if (current >= idealMin && current <= idealMax) {
    return { color: STATUS_COLORS.good, text: 'İdeal aralıkta' };
  }
  const span = Math.max(1, idealMax - idealMin);
  const tolerance = span * 0.2;
  if (current >= idealMin - tolerance && current <= idealMax + tolerance) {
    return { color: STATUS_COLORS.warning, text: current < idealMin ? 'Biraz kısa' : 'Biraz uzun' };
  }
  return { color: STATUS_COLORS.critical, text: current < idealMin ? 'Çok kısa' : 'Çok uzun' };
}

export function CharacterLimitBar({ current, idealMin, idealMax, label, className }: CharacterLimitBarProps) {
  const { color, text } = resolveState(current, idealMin, idealMax);

  // Bar domain padded beyond the ideal range so the marker + fill have room to breathe.
  const domainMax = Math.max(idealMax * 1.4, current * 1.1, 1);
  const fillPct = Math.min(100, (current / domainMax) * 100);
  const idealStartPct = (idealMin / domainMax) * 100;
  const idealEndPct = (idealMax / domainMax) * 100;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-white/60">{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>
          {current} · {text}
        </span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
        {/* Ideal range band */}
        <div
          className="absolute top-0 h-full bg-white/10"
          style={{ left: `${idealStartPct}%`, width: `${Math.max(0, idealEndPct - idealStartPct)}%` }}
        />
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
          style={{ width: `${fillPct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex items-center justify-between mt-1 text-[10px] text-white/30">
        <span>0</span>
        <span>
          İdeal: {idealMin}–{idealMax}
        </span>
        <span>{Math.round(domainMax)}</span>
      </div>
    </div>
  );
}

export default CharacterLimitBar;
