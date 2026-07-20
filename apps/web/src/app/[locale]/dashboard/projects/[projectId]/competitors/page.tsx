'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { RefreshCw, BarChart2, Trash2, List, Plus, Check, FileSearch, Link2, ExternalLink } from 'lucide-react';
import { competitorApi, keywordApi } from '@/lib/api';

// Same DR thresholds/colors as the backlinks page (drColorClass) — kept
// consistent so a domain rating reads the same everywhere in the app.
function drColorClass(dr: number | null | undefined): string {
  if (dr == null) return 'text-white/30';
  if (dr >= 70) return 'text-emerald-400';
  if (dr >= 50) return 'text-green-400';
  if (dr >= 30) return 'text-yellow-400';
  return 'text-red-400';
}

export default function CompetitorsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const locale = useLocale();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [manualDomain, setManualDomain] = useState('');
  const [kwCompetitor, setKwCompetitor] = useState<{ id: string; domain: string } | null>(null);
  const [addedKeywords, setAddedKeywords] = useState<Set<string>>(new Set());
  const [gapDomain, setGapDomain] = useState<string | null>(null);
  const [backlinkGapDomainState, setBacklinkGapDomainState] = useState<string | null>(null);

  const { data: competitors, isLoading, refetch } = useQuery({
    queryKey: ['competitors', projectId],
    queryFn: () => competitorApi.list(projectId).then((r) => {
      const raw = r.data;
      return Array.isArray(raw) ? raw : (raw?.data ?? raw?.competitors ?? []);
    }),
    enabled: !!projectId,
  });

  // Discovery is an explicit action (POST) — separate from the read-only list
  // query, so deleting a competitor and refetching never resurrects it.
  const discoverMutation = useMutation({
    mutationFn: () => competitorApi.discover(projectId),
    onSuccess: () => refetch(),
  });

  const { data: comparison, mutate: compare, isPending: comparing } = useMutation({
    mutationFn: (domain: string) =>
      competitorApi.compare(projectId, domain).then((r) => {
        const raw = r.data;
        return Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);
      }),
  });

  const addMutation = useMutation({
    mutationFn: (domain: string) => competitorApi.add(projectId, domain),
    onSuccess: () => { setManualDomain(''); refetch(); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => competitorApi.remove(projectId, id),
    onSuccess: () => refetch(),
  });

  const { data: competitorKeywords, mutate: loadKeywords, isPending: loadingKeywords } = useMutation({
    mutationFn: (competitorId: string) =>
      competitorApi.keywords(projectId, competitorId).then((r) => {
        const raw = r.data;
        return Array.isArray(raw) ? raw : (raw?.data ?? []);
      }),
  });

  const addKeywordMutation = useMutation({
    mutationFn: (phrase: string) => keywordApi.add(projectId, [phrase]),
    onSuccess: (_d, phrase) => setAddedKeywords((prev) => new Set(prev).add(phrase)),
  });

  const { data: contentGap, mutate: loadContentGap, isPending: loadingContentGap } = useMutation({
    mutationFn: (domain: string) =>
      competitorApi.contentGap(projectId, domain).then((r) => {
        const raw = r.data;
        return Array.isArray(raw) ? raw : (raw?.data ?? []);
      }),
  });

  const { data: backlinkGap, mutate: loadBacklinkGap, isPending: loadingBacklinkGap } = useMutation({
    mutationFn: (domain: string) =>
      competitorApi.backlinkGap(projectId, domain).then((r) => {
        const raw = r.data;
        return Array.isArray(raw) ? raw : (raw?.data ?? []);
      }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rakip Analizi</h1>
          <p className="text-sm text-white/40 mt-1">Rakip domainleri keşfet ve ortak anahtar kelimeleri karşılaştır</p>
        </div>
        <button
          onClick={() => discoverMutation.mutate()}
          disabled={discoverMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={['h-4 w-4', discoverMutation.isPending ? 'animate-spin' : ''].join(' ')} />
          {discoverMutation.isPending ? 'Rakipler Aranıyor…' : 'Rakipleri Keşfet'}
        </button>
      </div>

      {/* Manual add */}
      <div className="flex gap-3">
        <input
          value={manualDomain}
          onChange={(e) => setManualDomain(e.target.value)}
          placeholder="competitor.com"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={() => manualDomain && addMutation.mutate(manualDomain)}
          disabled={!manualDomain || addMutation.isPending}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Rakip Ekle
        </button>
      </div>

      {/* Competitor list */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl border border-white/10 animate-pulse" />
        ))}</div>
      ) : (
        <div className="space-y-3">
          {(!competitors || (competitors as unknown[]).length === 0) && (
            <div className="rounded-2xl border border-white/10 p-12 text-center text-sm text-white/30">
              Henüz rakip bulunamadı — &quot;Rakipleri Keşfet&quot; butonuna tıklayın
            </div>
          )}
          {(competitors as Array<{ id: string; domain: string; avgPosition: number | null; commonKeywords: number; etv: number | null }> ?? []).map((c) => (
            <div key={c.id} className="rounded-xl border border-white/10 bg-white/2 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{c.domain}</p>
                <p className="text-xs text-white/40 mt-0.5">
                  Ortak kelimeler: <span className="text-white/70">{c.commonKeywords}</span>
                  {c.avgPosition && <> · Ort. Pozisyon: <span className="text-white/70">{c.avgPosition.toFixed(1)}</span></>}
                  {c.etv && <> · Tahmini trafik: <span className="text-white/70">{c.etv.toLocaleString()}</span></>}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setSelectedDomain(c.domain); compare(c.domain); }}
                  disabled={comparing && selectedDomain === c.domain}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-600/30 disabled:opacity-50"
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  Karşılaştır
                </button>
                <button
                  onClick={() => { setKwCompetitor({ id: c.id, domain: c.domain }); loadKeywords(c.id); }}
                  disabled={loadingKeywords && kwCompetitor?.id === c.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 disabled:opacity-50"
                >
                  <List className="h-3.5 w-3.5" />
                  Kelimeleri Gör
                </button>
                <button
                  onClick={() => { setGapDomain(c.domain); loadContentGap(c.domain); }}
                  disabled={loadingContentGap && gapDomain === c.domain}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600/20 border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-600/30 disabled:opacity-50"
                >
                  <FileSearch className="h-3.5 w-3.5" />
                  İçerik Boşluğu
                </button>
                <button
                  onClick={() => { setBacklinkGapDomainState(c.domain); loadBacklinkGap(c.domain); }}
                  disabled={loadingBacklinkGap && backlinkGapDomainState === c.domain}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600/20 border border-sky-500/30 px-3 py-1.5 text-xs font-medium text-sky-400 hover:bg-sky-600/30 disabled:opacity-50"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Backlink Boşluğu
                </button>
                <button
                  onClick={() => removeMutation.mutate(c.id)}
                  className="rounded-lg border border-white/10 p-1.5 text-white/40 hover:text-red-400 hover:border-red-500/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Competitor ranked keywords + add-to-my-keywords */}
      {kwCompetitor && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            <span className="text-indigo-400">{kwCompetitor.domain}</span> sıralandığı kelimeler
          </h2>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40">Kelime</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-center">Rakip Sırası</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-center">Benim Sıram</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-center">Hacim</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-center">Zorluk</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {loadingKeywords && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-white/30">Yükleniyor...</td></tr>
                )}
                {!loadingKeywords && (competitorKeywords as Array<{ keyword: string; position: number | null; myPosition?: number | null; shared?: boolean; searchVolume: number; difficulty: number }> ?? []).map((row, i) => {
                  const added = addedKeywords.has(row.keyword);
                  return (
                    <tr key={i} className={['border-b border-white/5 hover:bg-white/2', row.shared ? 'bg-emerald-500/5' : ''].join(' ')}>
                      <td className="px-4 py-3 text-white">{row.keyword}{row.shared && <span className="ml-2 text-[10px] text-emerald-400">ortak</span>}</td>
                      <td className="px-4 py-3 text-center">
                        {row.position != null
                          ? <span className="inline-block rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-300">#{row.position}</span>
                          : <span className="text-white/30">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.myPosition != null
                          ? <span className="inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">#{row.myPosition}</span>
                          : <span className="text-white/30">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-white/60">{row.searchVolume?.toLocaleString() ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-white/60">{row.difficulty ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => addKeywordMutation.mutate(row.keyword)}
                          disabled={added || addKeywordMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-60"
                        >
                          {added ? <><Check className="h-3 w-3" /> Eklendi</> : <><Plus className="h-3 w-3" /> Kelimelerime Ekle</>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loadingKeywords && (competitorKeywords as unknown[] ?? []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-white/30">Kelime bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comparison table */}
      {selectedDomain && comparison && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Sizin Domain vs <span className="text-indigo-400">{selectedDomain}</span> — Ortak Kelimeler
          </h2>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40">Kelime</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-center">Hacim</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-center">Sizin Sıralamanız</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-center">Rakip Sıralaması</th>
                </tr>
              </thead>
              <tbody>
                {comparing && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-white/30">Yükleniyor...</td></tr>
                )}
                {(comparison as Array<{ keyword: string; searchVolume: number; domain1Position: number | null; domain2Position: number | null }>).map((row, i) => {
                  const youWin = row.domain1Position && row.domain2Position && row.domain1Position < row.domain2Position;
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                      <td className="px-4 py-3 text-white">{row.keyword}</td>
                      <td className="px-4 py-3 text-center text-white/60">{row.searchVolume?.toLocaleString() ?? '—'}</td>
                      <td className={['px-4 py-3 text-center font-medium', youWin ? 'text-emerald-400' : 'text-white/60'].join(' ')}>
                        {row.domain1Position ?? '—'}
                      </td>
                      <td className={['px-4 py-3 text-center font-medium', !youWin && row.domain2Position ? 'text-red-400' : 'text-white/60'].join(' ')}>
                        {row.domain2Position ?? '—'}
                      </td>
                    </tr>
                  );
                })}
                {!comparing && (comparison as unknown[]).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-white/30">Ortak kelime bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content Gap table */}
      {gapDomain && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            İçerik Boşluğu — <span className="text-amber-400">{gapDomain}</span> sıralandığı ama sizin ranklamadığınız kelimeler
          </h2>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40">Kelime</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-center">Arama Hacmi</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-center">Rakip Pozisyon</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-center">Sizin Pozisyon</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-center">Fırsat Skoru</th>
                </tr>
              </thead>
              <tbody>
                {loadingContentGap && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-white/30">Yükleniyor...</td></tr>
                )}
                {!loadingContentGap && (contentGap as Array<{ keyword: string; searchVolume: number; competitorPosition: number; yourPosition: number | null; opportunityScore: number }> ?? [])
                  .map((row, i) => (
                    <tr key={i} className={['border-b border-white/5 hover:bg-white/2', i < 3 ? 'bg-amber-500/5' : ''].join(' ')}>
                      <td className="px-4 py-3 text-white">{row.keyword}</td>
                      <td className="px-4 py-3 text-center text-white/60">{row.searchVolume?.toLocaleString() ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-300">#{row.competitorPosition}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-white/60">{row.yourPosition ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300">{row.opportunityScore}</span>
                      </td>
                    </tr>
                  ))}
                {!loadingContentGap && (contentGap as unknown[] ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-white/30">İçerik boşluğu bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Backlink Gap table */}
      {backlinkGapDomainState && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Backlink Boşluğu — <span className="text-sky-400">{backlinkGapDomainState}</span> sahip olduğu ama sizde olmayan referans domainler
          </h2>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40">Kaynak Domain</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-center">DR</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/40">Anchor</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-center">Tip</th>
                  <th className="px-4 py-3 text-xs font-medium text-white/40 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {loadingBacklinkGap && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-white/30">Yükleniyor...</td></tr>
                )}
                {!loadingBacklinkGap && (backlinkGap as Array<{ sourceDomain: string; domainRating: number; sourceUrl: string; anchor: string; isDofollow: boolean }> ?? [])
                  .map((row, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                      <td className="px-4 py-3 text-white">{row.sourceDomain}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={['font-bold', drColorClass(row.domainRating)].join(' ')}>{row.domainRating}</span>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs max-w-[240px] truncate">{row.anchor || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={[
                          'inline-block rounded-md px-2 py-0.5 text-xs font-medium',
                          row.isDofollow ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/50',
                        ].join(' ')}>
                          {row.isDofollow ? 'dofollow' : 'nofollow'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/${locale}/dashboard/projects/${projectId}/backlinks`}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-600/20 border border-sky-500/30 px-2.5 py-1 text-xs font-medium text-sky-400 hover:bg-sky-600/30"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Outreach Başlat
                        </Link>
                      </td>
                    </tr>
                  ))}
                {!loadingBacklinkGap && (backlinkGap as unknown[] ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-white/30">Backlink boşluğu bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
