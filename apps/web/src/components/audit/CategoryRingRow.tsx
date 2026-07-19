'use client';

import { cn } from '@/lib/utils';
import { CATEGORY_FAMILY_COLORS } from './colors';

export type AuditCategoryKey = 'onPage' | 'geo' | 'backlink' | 'usability' | 'performance';

export interface CategoryRingItem {
  key: AuditCategoryKey;
  label: string;
  score: number;
  grade: string;
}

export interface CategoryRingRowProps {
  categories: CategoryRingItem[];
  className?: string;
}

const SIZE = 96;
const STROKE = 8;
const R = SIZE / 2 - STROKE;
const C = 2 * Math.PI * R;

function CategoryRing({ item }: { item: CategoryRingItem }) {
  const clamped = Math.max(0, Math.min(100, item.score));
  const offset = C - (clamped / 100) * C;
  const color = CATEGORY_FAMILY_COLORS[item.key] ?? '#3987e5';

  return (
    <div className="flex flex-shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/2 p-4 w-[140px]">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg className="-rotate-90" width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeDasharray={C}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white leading-none" style={{ color }}>
            {item.grade}
          </span>
          <span className="text-[10px] text-white/40 mt-1">{Math.round(clamped)}</span>
        </div>
      </div>
      <p className="text-xs text-white/60 text-center leading-tight">{item.label}</p>
    </div>
  );
}

export function CategoryRingRow({ categories, className }: CategoryRingRowProps) {
  if (!categories || categories.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm', className)}>
        Veri yok
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-stretch gap-3 overflow-x-auto pb-1', className)}>
      {categories.map((item) => (
        <CategoryRing key={item.key} item={item} />
      ))}
    </div>
  );
}

export default CategoryRingRow;
