'use client';

import { Zap, CheckCircle2, XCircle } from 'lucide-react';

export interface ScanProgressOverlayProps {
  visible: boolean;
  progress: number;
  step: string;
  phase: 'running' | 'done' | 'failed';
}

/**
 * Small floating progress card shown while a full-site scan runs.
 * The dim/blur backdrop is pointer-events-none so the rest of the app
 * (sidebar nav, etc.) stays fully usable — this never traps the user on
 * the audit page, it just can't be dismissed manually.
 */
export function ScanProgressOverlay({ visible, progress, step, phase }: ScanProgressOverlayProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none print:hidden">
      <div className="absolute inset-0 backdrop-blur-sm bg-black/30 transition-opacity" />
      <div className="relative z-10 flex justify-center pt-20 px-4">
        <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl shadow-black/60 p-5 transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">FunBreak SEO</span>
          </div>

          {phase === 'done' ? (
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm py-1.5">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              Tarama Tamamlandı!
            </div>
          ) : phase === 'failed' ? (
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm py-1.5">
              <XCircle className="h-5 w-5 flex-shrink-0" />
              Tarama sırasında bir hata oluştu
            </div>
          ) : (
            <>
              <p className="text-sm text-white font-semibold mb-0.5">Tarama yapılıyor…</p>
              <p className="text-xs text-white/50 mb-3 truncate">{step}</p>
              <div className="flex items-center justify-between mb-1.5">
                <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden mr-3">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-indigo-300 flex-shrink-0">%{Math.round(progress)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScanProgressOverlay;
