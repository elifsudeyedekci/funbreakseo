'use client';

import { useState } from 'react';
import { Info, AlertCircle, AlertTriangle, CircleDot, ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_COLORS } from './colors';

export type RecommendationPriority = 'CRITICAL' | 'MEDIUM' | 'LOW';

export interface PriorityRecommendationItem {
  code: string;
  title: string;
  category: string;
  priority: RecommendationPriority;
  howToFix: string;
  affectedCount?: number;
  /** Concrete page URLs this recommendation affects, when known. */
  affectedUrls?: string[];
}

export interface PriorityRecommendationListProps {
  items: PriorityRecommendationItem[];
  /** For free-tier teaser truncation. Default: show all. */
  initialVisibleCount?: number;
  className?: string;
}

const PRIORITY_ORDER: Record<RecommendationPriority, number> = { CRITICAL: 0, MEDIUM: 1, LOW: 2 };

const PRIORITY_CONFIG: Record<
  RecommendationPriority,
  { label: string; color: string; bg: string; border: string; icon: typeof AlertCircle }
> = {
  CRITICAL: {
    label: 'Kritik',
    color: STATUS_COLORS.critical,
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: AlertCircle,
  },
  MEDIUM: {
    label: 'Orta',
    color: STATUS_COLORS.warning,
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    icon: AlertTriangle,
  },
  LOW: {
    label: 'Düşük',
    color: '#898781',
    bg: 'bg-white/5',
    border: 'border-white/10',
    icon: CircleDot,
  },
};

export function PriorityRecommendationList({ items, initialVisibleCount, className }: PriorityRecommendationListProps) {
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [openUrlsCode, setOpenUrlsCode] = useState<string | null>(null);

  const sorted = [...(items ?? [])].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const visible = typeof initialVisibleCount === 'number' ? sorted.slice(0, initialVisibleCount) : sorted;

  if (sorted.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm', className)}>
        Öneri bulunamadı
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {visible.map((item) => {
        const cfg = PRIORITY_CONFIG[item.priority];
        const Icon = cfg.icon;
        const isOpen = openCode === item.code;
        const urlsOpen = openUrlsCode === item.code;
        const hasUrls = !!item.affectedUrls && item.affectedUrls.length > 0;
        return (
          <div key={item.code} className={cn('rounded-xl border p-4', cfg.bg, cfg.border)}>
            <div className="flex items-start gap-3">
              <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: cfg.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ color: cfg.color, backgroundColor: `${cfg.color}1a` }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-[11px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">
                    {item.category}
                  </span>
                  <span className="text-sm font-medium text-white">{item.title}</span>
                  <button
                    type="button"
                    onClick={() => setOpenCode(isOpen ? null : item.code)}
                    className="ml-auto flex-shrink-0 p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Nasıl düzeltilir?"
                    aria-expanded={isOpen}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
                {typeof item.affectedCount === 'number' && item.affectedCount > 0 && (
                  hasUrls ? (
                    <button
                      type="button"
                      onClick={() => setOpenUrlsCode(urlsOpen ? null : item.code)}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors"
                      aria-expanded={urlsOpen}
                    >
                      {item.affectedCount} sayfayı etkiliyor
                      <ChevronDown className={cn('h-3 w-3 transition-transform', urlsOpen && 'rotate-180')} />
                    </button>
                  ) : (
                    <p className="text-xs text-white/40 mt-1">{item.affectedCount} sayfayı etkiliyor</p>
                  )
                )}
                {urlsOpen && hasUrls && (
                  <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2 max-h-56 overflow-y-auto space-y-1">
                    {item.affectedUrls!.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200 hover:underline truncate"
                      >
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{url}</span>
                      </a>
                    ))}
                    {(item.affectedCount ?? 0) > item.affectedUrls!.length && (
                      <p className="text-[11px] text-white/30 pt-1">
                        + {item.affectedCount! - item.affectedUrls!.length} sayfa daha
                      </p>
                    )}
                  </div>
                )}
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs font-semibold text-white/60 mb-1">Nasıl düzeltilir?</p>
                    <p className="text-xs text-white/50 leading-relaxed">{item.howToFix || 'Bu öneri için detaylı açıklama premium pakette sunulur.'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PriorityRecommendationList;
