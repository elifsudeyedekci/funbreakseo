'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keywordApi } from '@/lib/api';
import { useSelectedProject } from '@/lib/useSelectedProject';

const difficultyColor = (d: number) =>
  d < 30 ? 'text-green-400' : d < 60 ? 'text-yellow-400' : 'text-red-400';

const changeColor = (c: number) =>
  c > 0 ? 'text-green-400' : c < 0 ? 'text-red-400' : 'text-[var(--text-muted)]';

const intentBadge: Record<string, string> = {
  INFORMATIONAL: 'bg-blue-500/15 text-blue-400',
  NAVIGATIONAL: 'bg-purple-500/15 text-purple-400',
  TRANSACTIONAL: 'bg-green-500/15 text-green-400',
  COMMERCIAL: 'bg-orange-500/15 text-orange-400',
};

interface ResearchResult {
  keyword: string;
  search_volume?: number;
  keyword_difficulty?: number;
  cpc?: number;
  intent?: string;
}

export default function KeywordsPage() {
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [seedInput, setSeedInput] = useState('');
  const [discoverResults, setDiscoverResults] = useState<ResearchResult[]>([]);
  const [selectedKws, setSelectedKws] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { projectId } = useSelectedProject();

  const { data: keywords, isLoading: kwLoading } = useQuery({
    queryKey: ['keywords', projectId],
    enabled: !!projectId,
    queryFn: () => keywordApi.list(projectId!).then(r => (r.data?.data || r.data || []) as any[]),
  });

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['keywords-summary', projectId],
    enabled: !!projectId,
    queryFn: () => keywordApi.summary(projectId!).then(r => r.data?.data as { top3?: number; top10?: number; top20?: number; beyond20?: number } | undefined),
  });

  const addMutation = useMutation({
    mutationFn: (kw: string) => keywordApi.add(projectId!, [kw]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['keywords', projectId] });
      setShowAdd(false);
      setNewKeyword('');
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (phrases: string[]) => keywordApi.add(projectId!, phrases),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['keywords', projectId] });
      setShowImport(false);
      setBulkText('');
    },
  });

  const researchMutation = useMutation({
    mutationFn: (seeds: string[]) =>
      keywordApi.research(projectId!, { seedKeywords: seeds }).then(r => r.data?.data ?? r.data),
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

  const addSelectedMutation = useMutation({
    mutationFn: (phrases: string[]) => keywordApi.add(projectId!, phrases),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['keywords', projectId] });
      setShowDiscover(false);
      setDiscoverResults([]);
      setSelectedKws(new Set());
      setSeedInput('');
    },
  });

  const rankBuckets = [
    { label: 'Top 3', value: summary?.top3 ?? 0, color: 'text-green-400' },
    { label: '4–10', value: summary?.top10 ?? 0, color: 'text-blue-400' },
    { label: '11–20', value: summary?.top20 ?? 0, color: 'text-yellow-400' },
    { label: '20+', value: summary?.beyond20 ?? 0, color: 'text-[var(--text-muted)]' },
  ];

  const tags: string[] = ['all', ...Array.from(new Set((keywords ?? []).flatMap((k: any) => k.tags ?? [])))];
  const filtered =
    tagFilter === 'all'
      ? (keywords ?? [])
      : (keywords ?? []).filter((k: any) => k.tags?.includes(tagFilter));

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

  const handleResearch = () => {
    const seeds = seedInput
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    if (seeds.length === 0) return;
    researchMutation.mutate(seeds);
  };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Keywords</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Track rankings, volume, and AI Overview appearances.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDiscover(true)}
            className="px-4 py-2 rounded-lg text-sm border border-white/10 hover:border-white/20 transition flex items-center gap-1.5"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            <span>✦</span> Keşfet
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 rounded-lg text-sm border border-white/10 hover:border-white/20 transition"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            Bulk Import
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            + Add Keyword
          </button>
        </div>
      </div>

      {/* Rank Distribution */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {rankBuckets.map((b) => (
          <div key={b.label} className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{b.label}</p>
            {sumLoading ? (
              <div className="h-7 w-12 rounded bg-white/5 animate-pulse" />
            ) : (
              <p className={`text-2xl font-bold ${b.color}`}>{b.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Tag filters */}
      <div className="flex gap-2 flex-wrap">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setTagFilter(t)}
            className={`px-3 py-1 rounded-full text-xs transition ${
              tagFilter === t ? 'font-semibold' : 'opacity-60 hover:opacity-80'
            }`}
            style={{
              background: tagFilter === t ? 'var(--accent)' : 'var(--bg-elevated)',
              color: tagFilter === t ? '#fff' : 'var(--text-secondary)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {t === 'all' ? 'All Tags' : t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {kwLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Keyword', 'Rank', 'Change', 'Volume', 'Difficulty', 'AI Overview', 'Tags'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No keywords yet.{' '}
                    <button onClick={() => setShowDiscover(true)} className="underline" style={{ color: 'var(--accent)' }}>
                      Keşfet
                    </button>{' '}
                    ile anahtar kelime bul ya da manuel ekle.
                  </td>
                </tr>
              )}
              {filtered.map((kw: any) => (
                <tr key={kw.id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 font-medium">{kw.phrase ?? kw.keyword}</td>
                  <td className="px-4 py-3">{kw.rank ?? kw.ranks?.[0]?.position ?? '—'}</td>
                  <td className={`px-4 py-3 font-medium ${changeColor(kw.change ?? 0)}`}>
                    {kw.change > 0 ? `+${kw.change}` : kw.change ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {(kw.searchVolume ?? kw.volume)?.toLocaleString() ?? '—'}
                  </td>
                  <td className={`px-4 py-3 font-medium ${difficultyColor(kw.difficulty ?? 0)}`}>
                    {kw.difficulty ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {kw.aiOverview ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--accent)', color: '#fff' }}>
                        Yes
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(kw.tags ?? []).map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Discover Keywords Modal ── */}
      {showDiscover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl flex flex-col" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh' }}>
            {/* Modal header */}
            <div className="p-6 pb-4 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold">Anahtar Kelime Keşfet</h2>
                <button onClick={() => { setShowDiscover(false); setDiscoverResults([]); setSeedInput(''); }} style={{ color: 'var(--text-muted)' }}>✕</button>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                1–5 seed kelime gir (virgül ya da alt satır ile ayır). DataForSEO'dan arama hacmi ve ilgili öneriler gelir.
              </p>
            </div>

            {/* Seed input */}
            <div className="px-6 pb-4 shrink-0">
              <textarea
                rows={2}
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleResearch(); }}
                placeholder="seo araçları, backlink analizi, anahtar kelime takibi"
                className="w-full px-4 py-2.5 rounded-lg outline-none text-sm resize-none"
                style={{ background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleResearch}
                  disabled={!seedInput.trim() || researchMutation.isPending}
                  className="px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition hover:opacity-90"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {researchMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Araştırılıyor…
                    </span>
                  ) : 'Araştır'}
                </button>
              </div>
            </div>

            {/* Results */}
            {discoverResults.length > 0 && (
              <>
                <div className="px-6 pb-2 shrink-0 flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {discoverResults.length} öneri — {selectedKws.size} seçili
                  </span>
                  <button onClick={toggleAll} className="text-xs underline" style={{ color: 'var(--accent)' }}>
                    {selectedKws.size === discoverResults.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 pb-4">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0" style={{ background: 'var(--bg-elevated)' }}>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th className="py-2 pr-3 w-8" />
                        <th className="text-left py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Kelime</th>
                        <th className="text-right py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Hacim</th>
                        <th className="text-right py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Zorluk</th>
                        <th className="text-right py-2 font-medium" style={{ color: 'var(--text-muted)' }}>CPC</th>
                        <th className="text-right py-2 font-medium" style={{ color: 'var(--text-muted)' }}>Niyet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discoverResults.map((r) => (
                        <tr
                          key={r.keyword}
                          onClick={() => toggleKw(r.keyword)}
                          className="cursor-pointer hover:bg-white/[0.03] transition"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        >
                          <td className="py-2.5 pr-3">
                            <input
                              type="checkbox"
                              checked={selectedKws.has(r.keyword)}
                              onChange={() => toggleKw(r.keyword)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded"
                              style={{ accentColor: 'var(--accent)' }}
                            />
                          </td>
                          <td className="py-2.5 font-medium">{r.keyword}</td>
                          <td className="py-2.5 text-right" style={{ color: 'var(--text-secondary)' }}>
                            {r.search_volume?.toLocaleString() ?? '—'}
                          </td>
                          <td className={`py-2.5 text-right font-medium ${difficultyColor(r.keyword_difficulty ?? 0)}`}>
                            {r.keyword_difficulty ?? '—'}
                          </td>
                          <td className="py-2.5 text-right" style={{ color: 'var(--text-secondary)' }}>
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

                <div className="px-6 pb-6 pt-3 border-t shrink-0 flex justify-end gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => { setShowDiscover(false); setDiscoverResults([]); setSeedInput(''); }}
                    className="px-4 py-2 text-sm rounded-lg"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => addSelectedMutation.mutate(Array.from(selectedKws))}
                    disabled={selectedKws.size === 0 || addSelectedMutation.isPending}
                    className="px-5 py-2 text-sm rounded-lg font-medium disabled:opacity-50 transition hover:opacity-90"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    {addSelectedMutation.isPending
                      ? 'Ekleniyor…'
                      : `${selectedKws.size} Kelime Ekle`}
                  </button>
                </div>
              </>
            )}

            {researchMutation.isError && (
              <p className="px-6 pb-4 text-sm text-red-400">
                DataForSEO'dan veri alınamadı. API anahtarınızı ve kredinizi kontrol edin.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add Keyword Dialog */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-semibold">Add Keyword</h2>
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newKeyword) addMutation.mutate(newKeyword); }}
              placeholder="Enter keyword..."
              className="w-full px-4 py-2 rounded-lg outline-none text-sm"
              style={{ background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button
                onClick={() => addMutation.mutate(newKeyword)}
                disabled={!newKeyword || addMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {addMutation.isPending ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Dialog */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-semibold">Bulk Import Keywords</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Paste keywords below, one per line.
            </p>
            <textarea
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'keyword one\nkeyword two\nkeyword three'}
              className="w-full px-4 py-2 rounded-lg outline-none text-sm resize-none"
              style={{ background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button
                onClick={() => {
                  const phrases = bulkText.split('\n').map(s => s.trim()).filter(Boolean);
                  if (phrases.length) bulkImportMutation.mutate(phrases);
                }}
                disabled={!bulkText.trim() || bulkImportMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {bulkImportMutation.isPending ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
