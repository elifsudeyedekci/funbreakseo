'use client';

import { cn } from '@/lib/utils';
import { scoreToColor } from './colors';

export interface LetterGradeRingProps {
  /** 0-100 numeric score. */
  score: number;
  /** e.g. "A+", "B-", "F". */
  grade: string;
  size?: 'lg' | 'md';
  /** Small caption under the numeric score, e.g. "Genel Sağlık Skoru". */
  label?: string;
  className?: string;
}

const SIZE_CONFIG = {
  lg: { box: 192, stroke: 14, viewBox: 192, gradeText: 'text-5xl', scoreText: 'text-base' },
  md: { box: 128, stroke: 10, viewBox: 128, gradeText: 'text-3xl', scoreText: 'text-sm' },
};

export function LetterGradeRing({ score, grade, size = 'lg', label, className }: LetterGradeRingProps) {
  const cfg = SIZE_CONFIG[size];
  const clamped = Math.max(0, Math.min(100, score));
  const r = cfg.viewBox / 2 - cfg.stroke;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const color = scoreToColor(clamped);

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="relative" style={{ width: cfg.box, height: cfg.box }}>
        <svg
          className="-rotate-90"
          width={cfg.box}
          height={cfg.box}
          viewBox={`0 0 ${cfg.viewBox} ${cfg.viewBox}`}
        >
          <circle
            cx={cfg.viewBox / 2}
            cy={cfg.viewBox / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={cfg.stroke}
          />
          <circle
            cx={cfg.viewBox / 2}
            cy={cfg.viewBox / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={cfg.stroke}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-extrabold text-white leading-none', cfg.gradeText)} style={{ color }}>
            {grade}
          </span>
          <span className={cn('font-semibold text-white/70 mt-1', cfg.scoreText)}>{Math.round(clamped)}/100</span>
        </div>
      </div>
      {label && <p className="text-xs text-white/40 mt-3 text-center">{label}</p>}
    </div>
  );
}

export default LetterGradeRing;
