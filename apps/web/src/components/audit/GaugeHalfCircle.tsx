'use client';

import { cn } from '@/lib/utils';
import { STATUS_COLORS } from './colors';

export interface GaugeThresholds {
  /** Value at/beyond which the gauge reads "good". */
  good: number;
  /** Value at/beyond which the gauge reads "warning" (anything past this is "critical"). */
  warn: number;
}

export interface GaugeHalfCircleProps {
  value: number;
  min?: number;
  max?: number;
  thresholds?: GaugeThresholds;
  /** true (default): higher values are better (e.g. PSI score). false: lower is better (e.g. response time). */
  higherIsBetter?: boolean;
  label: string;
  /** Optional override for the center text, e.g. "0.3s" instead of the raw number. */
  displayValue?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CONFIG = {
  sm: { w: 140, h: 78, stroke: 10, valueText: 'text-lg', labelText: 'text-[10px]' },
  md: { w: 200, h: 108, stroke: 14, valueText: 'text-2xl', labelText: 'text-xs' },
  lg: { w: 260, h: 138, stroke: 18, valueText: 'text-3xl', labelText: 'text-sm' },
};

function resolveColor(value: number, thresholds: GaugeThresholds, higherIsBetter: boolean): string {
  const { good, warn } = thresholds;
  if (higherIsBetter) {
    if (value >= good) return STATUS_COLORS.good;
    if (value >= warn) return STATUS_COLORS.warning;
    return STATUS_COLORS.critical;
  }
  if (value <= good) return STATUS_COLORS.good;
  if (value <= warn) return STATUS_COLORS.warning;
  return STATUS_COLORS.critical;
}

export function GaugeHalfCircle({
  value,
  min = 0,
  max = 100,
  thresholds = { good: 80, warn: 60 },
  higherIsBetter = true,
  label,
  displayValue,
  size = 'md',
  className,
}: GaugeHalfCircleProps) {
  const cfg = SIZE_CONFIG[size];
  const r = cfg.w / 2 - cfg.stroke;
  const cx = cfg.w / 2;
  const cy = cfg.h - cfg.stroke / 2;
  const arcLength = Math.PI * r;

  const range = max - min || 1;
  const clamped = Math.max(min, Math.min(max, value));
  const fraction = (clamped - min) / range;
  const offset = arcLength - fraction * arcLength;
  const color = resolveColor(value, thresholds, higherIsBetter);

  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: cfg.w, height: cfg.h }}>
        <svg width={cfg.w} height={cfg.h} viewBox={`0 0 ${cfg.w} ${cfg.h}`}>
          <path d={path} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={cfg.stroke} strokeLinecap="round" />
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={cfg.stroke}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-0.5">
          <span className={cn('font-bold text-white leading-none', cfg.valueText)} style={{ color }}>
            {displayValue ?? Math.round(clamped)}
          </span>
        </div>
      </div>
      <p className={cn('text-white/50 mt-2 text-center', cfg.labelText)}>{label}</p>
    </div>
  );
}

export default GaugeHalfCircle;
