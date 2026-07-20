'use client';

import { Zap, CheckCircle2, XCircle, Check, Loader2 } from 'lucide-react';

export interface ScanProgressOverlayProps {
  visible: boolean;
  progress: number;
  step: string;
  stepKey: string;
  phase: 'running' | 'done' | 'failed';
}

const STEPS: { key: string; label: string }[] = [
  { key: 'crawl', label: 'Sayfalar taranıyor' },
  { key: 'analyzing:performance', label: 'Performans ölçülüyor' },
  { key: 'analyzing:technology', label: 'Teknoloji & domain bilgileri' },
  { key: 'analyzing:geo', label: 'GEO / AI görünürlüğü' },
  { key: 'analyzing:backlink', label: 'Backlink senkronizasyonu' },
  { key: 'analyzing:finalize', label: 'Sonuçlar birleştiriliyor' },
];

/**
 * Small floating progress card shown while a full-site scan runs.
 * The dim/blur backdrop is pointer-events-none so the rest of the app
 * (sidebar nav, etc.) stays fully usable — this never traps the user on
 * the audit page, it just can't be dismissed manually.
 */
export function ScanProgressOverlay({ visible, progress, step, stepKey, phase }: ScanProgressOverlayProps) {
  if (!visible) return null;

  const currentIndex = STEPS.findIndex((s) => s.key === stepKey);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none print:hidden">
      <div className="absolute inset-0 backdrop-blur-sm bg-black/40 transition-opacity" />
      <div className="relative z-10 flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="pointer-events-auto w-full max-w-[22rem] rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl shadow-black/60 p-5 sm:p-6 transition-all duration-300">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0">
              <Zap className="h-4 w-4 text-[#0f172a]" />
            </div>
            <span className="font-bold text-white text-sm">FunBreak SEO</span>
          </div>

          {phase === 'done' ? (
            <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm py-2">
              <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
              Tarama Tamamlandı!
            </div>
          ) : phase === 'failed' ? (
            <div className="flex items-center gap-2.5 text-red-400 font-semibold text-sm py-2">
              <XCircle className="h-6 w-6 flex-shrink-0" />
              Tarama sırasında bir hata oluştu
            </div>
          ) : (
            <>
              <p className="text-sm text-white font-semibold mb-0.5">Tarama yapılıyor…</p>
              <p className="text-xs text-white/50 mb-4 break-words">{step}</p>

              <div className="flex items-center justify-between mb-4">
                <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden mr-3">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-amber-300 flex-shrink-0 tabular-nums">%{Math.round(progress)}</span>
              </div>

              <ul className="space-y-2 border-t border-white/10 pt-4">
                {STEPS.map((s, i) => {
                  const done = currentIndex >= 0 && i < currentIndex;
                  const current = i === currentIndex;
                  return (
                    <li key={s.key} className="flex items-center gap-2.5 text-xs">
                      {done ? (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                      ) : current ? (
                        <span className="flex h-4 w-4 items-center justify-center flex-shrink-0">
                          <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                        </span>
                      ) : (
                        <span className="flex h-4 w-4 items-center justify-center flex-shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                        </span>
                      )}
                      <span className={done ? 'text-white/50 line-through' : current ? 'text-white font-medium' : 'text-white/30'}>
                        {s.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScanProgressOverlay;
