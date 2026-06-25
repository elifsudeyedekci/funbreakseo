'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type SortingState,
} from '@tanstack/react-table';
import { Plus, TrendingUp, TrendingDown, Minus, Search, X, ChevronUp, ChevronDown, Download } from 'lucide-react';
import { keywordApi } from '@/lib/api';
import { cn, exportToCSV } from '@/lib/utils';
import type { KeywordIntent } from '@funbreakseo/shared';

interface Keyword {
  id: string;
  keyword: string;
  position: number | null;
  positionDelta: number | null;
  searchVolume: number;
  difficulty: number;
  intent: KeywordIntent;
  labels: string[];
  updatedAt: string;
}

const INTENT_COLORS: Record<KeywordIntent, string> = {
  INFORMATIONAL: 'bg-blue-500/20 text-blue-400',
  NAVIGATIONAL: 'bg-emerald-500/20 text-emerald-400',
  TRANSACTIONAL: 'bg-orange-500/20 text-orange-400',
  COMMERCIAL: 'bg-purple-500/20 text-purple-400',
};

const columnHelper = createColumnHelper<Keyword>();

export default function KeywordsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const t = useTranslations('keywordsPage');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [addError, setAddError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['keywords', projectId],
    queryFn: () => keywordApi.list(projectId).then((r) => (r.data?.data ?? []) as Keyword[]),
  });

  const addMutation = useMutation({
    mutationFn: (keywords: string[]) => keywordApi.add(projectId, keywords),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords', projectId] });
      setShowAddModal(false);
      setKeywordInput('');
    },
    onError: () => setAddError(t('addModalErrorFailed')),
  });

  const keywords = data || [];

  const firstPageCount = keywords.filter((k) => k.position !== null && k.position <= 10).length;
  const top3Count = keywords.filter((k) => k.position !== null && k.position <= 3).length;
  const avgPos = keywords.length > 0
    ? keywords
        .filter((k) => k.position !== null)
        .reduce((sum, k) => sum + (k.position || 0), 0) /
        Math.max(1, keywords.filter((k) => k.position !== null).length)
    : null;

  const columns = [
    columnHelper.accessor('keyword', {
      header: t('colKeyword'),
      cell: (info) => <span className="font-medium text-white">{info.getValue()}</span>,
    }),
    columnHelper.accessor('position', {
      header: t('colPosition'),
      cell: (info) => {
        const pos = info.getValue();
        const delta = info.row.original.positionDelta;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{pos ?? '—'}</span>
            {delta !== null && delta !== undefined && (
              <span className={cn('flex items-center text-xs', delta < 0 ? 'text-emerald-400' : delta > 0 ? 'text-red-400' : 'text-white/30')}>
                {delta < 0 ? <TrendingUp className="h-3 w-3" /> : delta > 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {Math.abs(delta)}
              </span>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('searchVolume', {
      header: t('colVolume'),
      cell: (info) => info.getValue()?.toLocaleString() ?? '—',
    }),
    columnHelper.accessor('difficulty', {
      header: t('colDifficulty'),
      cell: (info) => {
        const v = info.getValue();
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-white/10 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${v < 30 ? 'bg-emerald-500' : v < 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${v}%` }}
              />
            </div>
            <span className="text-xs text-white/60">{v}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor('intent', {
      header: t('colIntent'),
      cell: (info) => {
        const intent = info.getValue();
        const INTENT_LABELS: Record<KeywordIntent, string> = {
          INFORMATIONAL: t('intentInfo'),
          NAVIGATIONAL: t('intentNav'),
          TRANSACTIONAL: t('intentTrans'),
          COMMERCIAL: t('intentComm'),
        };
        return (
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', INTENT_COLORS[intent])}>
            {INTENT_LABELS[intent]}
          </span>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: keywords,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  function handleAddKeywords() {
    setAddError('');
    const words = keywordInput
      .split('\n')
      .map((w) => w.trim())
      .filter(Boolean);
    if (words.length === 0) {
      setAddError(t('addModalErrorEmpty'));
      return;
    }
    addMutation.mutate(words);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
          <p className="text-white/50 text-sm mt-1">{t('trackedCount', { count: keywords.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          {keywords.length > 0 && (
            <button
              onClick={() => exportToCSV(
                keywords.map((k) => ({
                  keyword: k.keyword,
                  position: k.position ?? '',
                  searchVolume: k.searchVolume,
                  difficulty: k.difficulty,
                  intent: k.intent,
                  updatedAt: k.updatedAt,
                })),
                [
                  { key: 'keyword', label: t('colKeyword') },
                  { key: 'position', label: t('colPosition') },
                  { key: 'searchVolume', label: t('colVolume') },
                  { key: 'difficulty', label: t('colDifficulty') },
                  { key: 'intent', label: t('colIntent') },
                  { key: 'updatedAt', label: t('colUpdated') },
                ],
                'keywords.csv'
              )}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 transition-all"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            {t('addBtn')}
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: t('total'), value: keywords.length },
          { label: t('firstPage'), value: firstPageCount },
          { label: t('top3'), value: top3Count },
          { label: t('avgPos'), value: avgPos !== null ? avgPos.toFixed(1) : '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/2 p-3 text-center">
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-white/30">{t('loading')}</div>
        ) : keywords.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 mb-4">{t('empty')}</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-all"
            >
              <Plus className="h-4 w-4" />
              {t('addFirstBtn')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-white/10 bg-white/3">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide cursor-pointer hover:text-white/70 transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' ? <ChevronUp className="h-3 w-3" /> :
                           header.column.getIsSorted() === 'desc' ? <ChevronDown className="h-3 w-3" /> : null}
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-white/70">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add keywords modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{t('addModalTitle')}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-white/40 mb-3">{t('addModalHint')}</p>
            <textarea
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              className="w-full h-40 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:border-indigo-500/50 focus:outline-none"
              placeholder={t('addModalPlaceholder')}
            />
            {addError && <p className="mt-2 text-xs text-red-400">{addError}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-xl border border-white/20 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 transition-colors"
              >
                {t('addModalCancel')}
              </button>
              <button
                onClick={handleAddKeywords}
                disabled={addMutation.isPending}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
              >
                {addMutation.isPending ? t('addModalSubmitting') : t('addModalSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
