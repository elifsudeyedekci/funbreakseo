'use client';

import { useState, useMemo } from 'react';
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
import { Plus, TrendingUp, TrendingDown, Minus, Search, X, ChevronUp, ChevronDown, Download, Trash2, RefreshCw, Sparkles, CheckSquare, Square } from 'lucide-react';
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

interface ResearchResult {
  keyword: string;
  search_volume?: number;
  keyword_difficulty?: number;
  cpc?: number;
  intent?: string;
}

const INTENT_COLORS: Record<KeywordIntent, string> = {
  INFORMATIONAL: 'bg-blue-500/20 text-blue-400',
  NAVIGATIONAL: 'bg-emerald-500/20 text-emerald-400',
  TRANSACTIONAL: 'bg-orange-500/20 text-orange-400',
  COMMERCIAL: 'bg-purple-500/20 text-purple-400',
};

const intentBadge: Record<string, string> = {
  INFORMATIONAL: 'bg-blue-500/15 text-blue-400',
  NAVIGATIONAL: 'bg-purple-500/15 text-purple-400',
  TRANSACTIONAL: 'bg-green-500/15 text-green-400',
  COMMERCIAL: 'bg-orange-500/15 text-orange-400',
};

const difficultyColor = (d: number) =>
  d < 30 ? 'text-green-400' : d < 60 ? 'text-yellow-400' : 'text-red-400';

const columnHelper = createColumnHelper<Keyword>();

export default function KeywordsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const t = useTranslations('keywordsPage');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [addError, setAddError] = useState('');
  const [seedInput, setSeedInput] = useState('');
  const [discoverResults, setDiscoverResults] = useState<ResearchResult[]>([]);
  const [selectedKws, setSelectedKws] = useState<Set<string>>(new Set());
  const [rankedStatus, setRankedStatus] = useState<string | null>(null);
  // Bulk selection for the tracked keywords table
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // GSC fetch filter
  const [gscMaxPosition, setGscMaxPosition] = useState<string>('50');

  const { data, isLoading } = useQuery({
    queryKey: ['keywords', projectId],
    queryFn: () =>
      keywordApi.list(projectId).then((r) => {
        // Backend returns a plain array, not { data: [...] }
        const raw: any[] = Array.isArray(r.data) ? r.data : (r.data?.data ?? r.data ?? []);
        return raw.map((k: any): Keyword => ({
          id: k.id,
          keyword: k.phrase ?? k.keyword ?? '',
          position: k.ranks?.[0]?.position ?? null,
          positionDelta: null,
          searchVolume: k.searchVolume ?? 0,
          difficulty: k.difficulty ?? 0,
          intent: (k.intent as KeywordIntent) ?? 'INFORMATIONAL',
          labels: k.tag ? [k.tag.name] : [],
          updatedAt: k.updatedAt,
        }));
      }),
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

  const researchMutation = useMutation({
    mutationFn: (seeds: string[]) =>
      keywordApi.research(projectId, { seedKeywords: seeds }).then(r => r.data?.data ?? r.data),
    onSuccess: (data) => {
      const items: ResearchResult[] = [
        ...(data?.keywordData ?? []),
        ...(data?.relatedKeywords ?? []).map((k: any) =>
          typeof k === 'string' ? { keyword: k } : k,
        ),
      ];
      const unique = Array.from(new Map(items.map(i => [i.keyword, i])).values());
      setDiscoverResults(unique);
      setSelectedKws(new Set());
    },
  });

  const domainDiscoverMutation = useMutation({
    mutationFn: () => keywordApi.discover(projectId).then((r) => {
      const raw = r.data;
      return Array.isArray(raw) ? raw : (raw?.data ?? raw?.keywords ?? []);
    }),
    onSuccess: (data: ResearchResult[]) => {
      const unique = Array.from(new Map(data.map((i: ResearchResult) => [i.keyword, i])).values());
      setDiscoverResults(unique);
      setSelectedKws(new Set());
    },
  });

  const addSelectedMutation = useMutation({
    mutationFn: (phrases: string[]) => keywordApi.add(projectId, phrases),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords', projectId] });
      setShowDiscover(false);
      setDiscoverResults([]);
      setSelectedKws(new Set());
      setSeedInput('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => keywordApi.delete(projectId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['keywords', projectId] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => keywordApi.delete(projectId, id))),
    onSuccess: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['keywords', projectId] });
    },
  });

  const refreshMetricsMutation = useMutation({
    mutationFn: () => keywordApi.refreshMetrics(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['keywords', projectId] }),
  });

  const refreshRanksMutation = useMutation({
    mutationFn: () => keywordApi.refreshRanks(projectId),
  });

  // GET /projects/:id/keywords/ranked → DataForSEO ranked_keywords/live → add to tracked list.
  const fetchRankedMutation = useMutation({
    mutationFn: async () => {
      setRankedStatus(null);
      const maxPos = parseInt(gscMaxPosition, 10) || 0;
      // 0 = tümü (filtre yok), >0 = sadece o pozisyona kadar
      const params = maxPos > 0 ? { maxPosition: maxPos } : undefined;
      const r = await keywordApi.ranked(projectId, params);
      const raw: any[] = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      if (raw.length === 0) return { added: 0 };

      // Deduplicate by phrase, keep first occurrence (highest ranked)
      const seen = new Set<string>();
      const gscData: Array<{ phrase: string; position: number; clicks: number; impressions: number; ctr: number; url?: string }> = [];
      for (const k of raw) {
        const phrase = (k.keyword ?? k.phrase ?? '').trim();
        if (!phrase || seen.has(phrase.toLowerCase())) continue;
        seen.add(phrase.toLowerCase());
        gscData.push({
          phrase,
          position: k.position ?? 0,
          clicks: k.clicks ?? 0,
          impressions: k.impressions ?? 0,
          ctr: k.ctr ?? 0,
          url: k.url ?? undefined,
        });
      }
      if (gscData.length === 0) return { added: 0 };

      // skipLimit: GSC returns the user's own site data — plan limits shouldn't block it
      await keywordApi.add(projectId, {
        phrases: gscData.map((g) => g.phrase),
        skipLimit: true,
        gscData,
      });
      return { added: gscData.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['keywords', projectId] });
      setRankedStatus(result.added > 0 ? `${result.added} kelime eklendi` : 'Sıralanan kelime bulunamadı');
    },
    onError: (err: any) => {
      setRankedStatus(`Hata: ${err?.response?.data?.message ?? err?.message ?? 'bilinmeyen hata'}`);
    },
  });

  const keywords = data || [];

  const allIds = useMemo(() => keywords.map((k) => k.id), [keywords]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }
  function toggleSelectId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function quickDelete(filterFn: (k: Keyword) => boolean) {
    const ids = keywords.filter(filterFn).map((k) => k.id);
    if (ids.length > 0) bulkDeleteMutation.mutate(ids);
  }

  const firstPageCount = keywords.filter((k) => k.position !== null && k.position <= 10).length;
  const top3Count = keywords.filter((k) => k.position !== null && k.position <= 3).length;
  const avgPos = keywords.length > 0
    ? keywords
        .filter((k) => k.position !== null)
        .reduce((sum, k) => sum + (k.position || 0), 0) /
        Math.max(1, keywords.filter((k) => k.position !== null).length)
    : null;

  const columns = [
    columnHelper.display({
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleSelectAll}
          className="rounded"
          style={{ accentColor: '#6366f1' }}
        />
      ),
      cell: (info) => (
        <input
          type="checkbox"
          checked={selectedIds.has(info.row.original.id)}
          onChange={() => toggleSelectId(info.row.original.id)}
          onClick={(e) => e.stopPropagation()}
          className="rounded"
          style={{ accentColor: '#6366f1' }}
        />
      ),
    }),
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
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <button
          onClick={() => deleteMutation.mutate(info.row.original.id)}
          disabled={deleteMutation.isPending}
          className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Sil"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
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

  function handleResearch() {
    const seeds = seedInput
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    if (seeds.length === 0) return;
    researchMutation.mutate(seeds);
  }

  const toggleKw = (kw: string) => {
    setSelectedKws(prev => {
      const next = new Set(prev);
      next.has(kw) ? next.delete(kw) : next.add(kw);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedKws.size === discoverResults.length) {
      setSelectedKws(new Set());
    } else {
      setSelectedKws(new Set(discoverResults.map(r => r.keyword)));
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
          <p className="text-white/50 text-sm mt-1">{t('trackedCount', { count: keywords.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDiscover(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 transition-all"
          >
            ✦ Keşfet
          </button>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-white/40 whitespace-nowrap">Max pozisyon</label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={gscMaxPosition}
                    onChange={(e) => setGscMaxPosition(e.target.value)}
                    className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <span className="text-[10px] text-white/25">0 = tümü, 1–100 = o aralık</span>
              </div>
              <button
                onClick={() => fetchRankedMutation.mutate()}
                disabled={fetchRankedMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 transition-all disabled:opacity-50"
              >
                <Search className={cn('h-4 w-4', fetchRankedMutation.isPending && 'animate-pulse')} />
                {fetchRankedMutation.isPending ? 'Getiriliyor…' : 'Sıralanan Kelimeleri Getir'}
              </button>
            </div>
            <p className="text-xs text-white/30">
              {parseInt(gscMaxPosition, 10) > 0
                ? `Google'da 1–${gscMaxPosition}. sıradaki kelimeler eklenir (GSC verisi)`
                : 'Tüm sıralamalardan kelimeler eklenir (GSC verisi)'}
            </p>
            {rankedStatus && (
              <span className={cn('text-xs', rankedStatus.startsWith('Hata') ? 'text-red-400' : 'text-emerald-400')}>
                {rankedStatus}
              </span>
            )}
          </div>
          {keywords.length > 0 && (
            <button
              onClick={() => refreshMetricsMutation.mutate()}
              disabled={refreshMetricsMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 transition-all disabled:opacity-50"
              title="Metrikleri Yenile"
            >
              <RefreshCw className={cn('h-4 w-4', refreshMetricsMutation.isPending && 'animate-spin')} />
              Metrikleri Yenile
            </button>
          )}
          {keywords.length > 0 && (
            <button
              onClick={() => refreshRanksMutation.mutate()}
              disabled={refreshRanksMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 transition-all disabled:opacity-50"
              title="Pozisyonları Güncelle"
            >
              <TrendingUp className={cn('h-4 w-4', refreshRanksMutation.isPending && 'animate-pulse')} />
              {refreshRanksMutation.isSuccess ? 'Sıralama Kuyruğa Alındı' : 'Pozisyonları Güncelle'}
            </button>
          )}
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

      {/* Quick-filter delete buttons */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs text-white/30 mr-1">Hızlı sil:</span>
          <button
            onClick={() => quickDelete((k) => k.searchVolume < 50)}
            disabled={bulkDeleteMutation.isPending}
            className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
          >
            Hacim &lt; 50 olanları sil ({keywords.filter((k) => k.searchVolume < 50).length})
          </button>
          <button
            onClick={() => quickDelete((k) => k.position === null)}
            disabled={bulkDeleteMutation.isPending}
            className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
          >
            Pozisyonu olmayanları sil ({keywords.filter((k) => k.position === null).length})
          </button>
          <button
            onClick={() => quickDelete((k) => k.position !== null && k.position > 50)}
            disabled={bulkDeleteMutation.isPending}
            className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
          >
            Pozisyon &gt; 50 olanları sil ({keywords.filter((k) => k.position !== null && k.position > 50).length})
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5">
          <span className="text-sm text-white/70">{selectedIds.size} kelime seçili</span>
          <button
            onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
            disabled={bulkDeleteMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {bulkDeleteMutation.isPending ? 'Siliniyor…' : 'Seçilenleri Sil'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-white/40 hover:text-white"
          >
            Seçimi Kaldır
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-white/30">{t('loading')}</div>
        ) : keywords.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 mb-4">{t('empty')}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowDiscover(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 transition-all"
              >
                ✦ Keşfet
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-all"
              >
                <Plus className="h-4 w-4" />
                {t('addFirstBtn')}
              </button>
            </div>
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

      {/* ── Discover Keywords Modal ── */}
      {showDiscover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl flex flex-col border border-white/10 bg-[#111118]" style={{ maxHeight: '90vh' }}>
            <div className="p-6 pb-4 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-white">Anahtar Kelime Keşfet</h2>
                <button
                  onClick={() => { setShowDiscover(false); setDiscoverResults([]); setSeedInput(''); }}
                  className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-white/50">
                1–5 seed kelime gir (virgül ya da alt satır ile ayır). DataForSEO'dan arama hacmi ve ilgili öneriler gelir.
              </p>
            </div>

            <div className="px-6 pb-4 shrink-0 space-y-3">
              {/* Auto-discover from domain */}
              <button
                onClick={() => domainDiscoverMutation.mutate()}
                disabled={domainDiscoverMutation.isPending || researchMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600/15 px-4 py-2.5 text-sm font-semibold text-indigo-300 hover:bg-indigo-600/25 disabled:opacity-50 transition-all"
              >
                {domainDiscoverMutation.isPending ? (
                  <><span className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" /> Domain Analiz Ediliyor…</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Domain'den Otomatik Keşfet</>
                )}
              </button>
              <div className="flex items-center gap-3 text-xs text-white/30">
                <div className="flex-1 h-px bg-white/10" />
                <span>ya da seed kelimeler gir</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <textarea
                rows={2}
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleResearch(); }}
                placeholder="seo araçları, backlink analizi, anahtar kelime takibi (isteğe bağlı)"
                className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder-white/30 resize-none focus:border-indigo-500/50 focus:outline-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleResearch}
                  disabled={!seedInput.trim() || researchMutation.isPending || domainDiscoverMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
                >
                  {researchMutation.isPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Araştırılıyor…
                    </>
                  ) : 'Araştır'}
                </button>
              </div>
            </div>

            {(researchMutation.isError || domainDiscoverMutation.isError) && (
              <p className="px-6 pb-4 text-sm text-red-400 shrink-0">
                DataForSEO'dan veri alınamadı. API anahtarınızı ve kredinizi kontrol edin.
              </p>
            )}

            {discoverResults.length > 0 && (
              <>
                <div className="px-6 pb-2 shrink-0 flex items-center justify-between">
                  <span className="text-sm text-white/40">
                    {discoverResults.length} öneri — {selectedKws.size} seçili
                  </span>
                  <button onClick={toggleAll} className="text-xs text-indigo-400 hover:text-indigo-300 underline">
                    {selectedKws.size === discoverResults.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 pb-4">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#111118]">
                      <tr className="border-b border-white/10">
                        <th className="py-2 pr-3 w-8" />
                        <th className="text-left py-2 font-medium text-xs text-white/40 uppercase">Kelime</th>
                        <th className="text-right py-2 font-medium text-xs text-white/40 uppercase">Hacim</th>
                        <th className="text-right py-2 font-medium text-xs text-white/40 uppercase">Zorluk</th>
                        <th className="text-right py-2 font-medium text-xs text-white/40 uppercase">CPC</th>
                        <th className="text-right py-2 font-medium text-xs text-white/40 uppercase">Niyet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discoverResults.map((r) => (
                        <tr
                          key={r.keyword}
                          onClick={() => toggleKw(r.keyword)}
                          className="cursor-pointer border-b border-white/5 hover:bg-white/3 transition-colors"
                        >
                          <td className="py-2.5 pr-3">
                            <input
                              type="checkbox"
                              checked={selectedKws.has(r.keyword)}
                              onChange={() => toggleKw(r.keyword)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded"
                              style={{ accentColor: '#6366f1' }}
                            />
                          </td>
                          <td className="py-2.5 font-medium text-white">{r.keyword}</td>
                          <td className="py-2.5 text-right text-white/60">
                            {r.search_volume?.toLocaleString() ?? '—'}
                          </td>
                          <td className={`py-2.5 text-right font-medium ${difficultyColor(r.keyword_difficulty ?? 0)}`}>
                            {r.keyword_difficulty ?? '—'}
                          </td>
                          <td className="py-2.5 text-right text-white/60">
                            {r.cpc ? `$${r.cpc.toFixed(2)}` : '—'}
                          </td>
                          <td className="py-2.5 text-right">
                            {r.intent ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs ${intentBadge[r.intent?.toUpperCase()] ?? 'bg-white/10 text-white/50'}`}>
                                {r.intent}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 pb-6 pt-3 border-t border-white/10 shrink-0 flex justify-end gap-3">
                  <button
                    onClick={() => { setShowDiscover(false); setDiscoverResults([]); setSeedInput(''); }}
                    className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => addSelectedMutation.mutate(Array.from(selectedKws))}
                    disabled={selectedKws.size === 0 || addSelectedMutation.isPending}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
                  >
                    {addSelectedMutation.isPending ? 'Ekleniyor…' : `${selectedKws.size} Kelime Ekle`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
