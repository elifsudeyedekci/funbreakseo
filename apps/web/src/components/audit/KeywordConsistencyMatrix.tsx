'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_COLORS } from './colors';

export interface KeywordConsistencyRow {
  phrase: string;
  inTitle: boolean;
  inMeta: boolean;
  inH1: boolean;
  inH2: boolean;
}

export interface KeywordConsistencyMatrixProps {
  rows: KeywordConsistencyRow[];
  className?: string;
}

const COLUMNS: { key: keyof Omit<KeywordConsistencyRow, 'phrase'>; label: string }[] = [
  { key: 'inTitle', label: 'Title' },
  { key: 'inMeta', label: 'Meta Açıklama' },
  { key: 'inH1', label: 'H1' },
  { key: 'inH2', label: 'H2' },
];

function Mark({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="h-4 w-4 mx-auto" style={{ color: STATUS_COLORS.good }} />
  ) : (
    <X className="h-4 w-4 mx-auto text-white/20" />
  );
}

export function KeywordConsistencyMatrix({ rows, className }: KeywordConsistencyMatrixProps) {
  if (!rows || rows.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm', className)}>
        Veri yok
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-white/10 bg-white/2', className)}>
      <table className="w-full text-sm min-w-[420px]">
        <thead>
          <tr className="text-left text-[11px] uppercase text-white/40 border-b border-white/10">
            <th className="py-2.5 pl-4 pr-4 font-medium">Anahtar Kelime</th>
            {COLUMNS.map((col) => (
              <th key={col.key} className="py-2.5 px-3 font-medium text-center">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-b-0 hover:bg-white/2">
              <td className="py-2.5 pl-4 pr-4 text-white/80">{row.phrase}</td>
              {COLUMNS.map((col) => (
                <td key={col.key} className="py-2.5 px-3 text-center">
                  <Mark ok={row[col.key]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default KeywordConsistencyMatrix;
