'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentApi } from '@/lib/api';

const PROJECT_ID = 'current';

type TabType = 'list' | 'calendar';

// Simple content calendar — shows scheduled/published content by month
function ContentCalendar({ content }: { content: Record<string, unknown>[] }) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const DAY_NAMES = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

  function getItemsForDay(day: number) {
    const date = new Date(viewYear, viewMonth, day);
    return content.filter((item) => {
      const scheduled = item.scheduledAt ? new Date(item.scheduledAt as string) : item.publishedAt ? new Date(item.publishedAt as string) : null;
      if (!scheduled) return false;
      return scheduled.getFullYear() === date.getFullYear() &&
        scheduled.getMonth() === date.getMonth() &&
        scheduled.getDate() === date.getDate();
    });
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  return (
    <div className="rounded-xl p-4 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/5 transition text-sm" style={{ color: 'var(--text-secondary)' }}>‹ Önceki</button>
        <span className="font-semibold text-sm">{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/5 transition text-sm" style={{ color: 'var(--text-secondary)' }}>Sonraki ›</button>
      </div>
      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs py-1" style={{ color: 'var(--text-muted)' }}>{d}</div>
        ))}
        {/* Empty cells before first day */}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const items = getItemsForDay(day);
          const isToday = day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
          return (
            <div
              key={day}
              className={`min-h-[60px] rounded-lg p-1 text-xs space-y-0.5 transition ${isToday ? 'bg-indigo-500/20 ring-1 ring-indigo-500/40' : 'bg-white/[0.02] hover:bg-white/5'}`}
            >
              <span className={`block mb-1 font-medium ${isToday ? 'text-indigo-400' : ''}`} style={{ color: isToday ? undefined : 'var(--text-secondary)' }}>{day}</span>
              {items.slice(0, 2).map((item, idx) => (
                <div key={idx} className="truncate rounded px-1 py-0.5 text-[10px]" style={{ background: 'var(--accent)', color: '#fff', opacity: 0.85 }}>
                  {item.title as string || 'İçerik'}
                </div>
              ))}
              {items.length > 2 && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{items.length - 2}</span>}
            </div>
          );
        })}
      </div>
      {content.length === 0 && (
        <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>Bu ayda planlanmış içerik yok.</p>
      )}
    </div>
  );
}

type ContentStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED';

const statusStyles: Record<ContentStatus, string> = {
  DRAFT: 'bg-white/10 text-[var(--text-secondary)]',
  IN_REVIEW: 'bg-yellow-400/10 text-yellow-400',
  APPROVED: 'bg-blue-400/10 text-blue-400',
  PUBLISHED: 'bg-green-400/10 text-green-400',
};

const ScoreBar = ({ value, color }: { value: number; color: string }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
    </div>
    <span className="text-xs w-6 text-right" style={{ color: 'var(--text-secondary)' }}>{value}</span>
  </div>
);

export default function ContentPage() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [genTopic, setGenTopic] = useState('');
  const [genKeyword, setGenKeyword] = useState('');
  const qc = useQueryClient();

  const { data: content, isLoading } = useQuery({
    queryKey: ['content', PROJECT_ID],
    queryFn: () => contentApi.list(PROJECT_ID).then((r) => (r.data?.data ?? []) as Record<string, unknown>[]),
  });

  const generateMutation = useMutation({
    mutationFn: (data: { topic: string; keyword: string }) =>
      contentApi.generate(PROJECT_ID, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content', PROJECT_ID] });
      setShowGenerate(false);
      setGenTopic('');
      setGenKeyword('');
    },
  });

  const statusCounts = (content ?? []).reduce(
    (acc: Record<string, number>, item: any) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            AI-generated and managed content with SEO + GEO scoring.
          </p>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          + Generate Content
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-surface)' }}>
        {(['list', 'calendar'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition"
            style={{
              background: activeTab === tab ? 'var(--accent)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {tab === 'list' ? 'Liste' : 'Takvim'}
          </button>
        ))}
      </div>

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <ContentCalendar content={content ?? []} />
      )}

      {/* Status Summary + Content List (list view only) */}
      {activeTab === 'list' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED'] as ContentStatus[]).map((s) => (
              <div key={s} className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{s.replace('_', ' ')}</p>
                <p className="text-2xl font-bold">{statusCounts[s] ?? 0}</p>
              </div>
            ))}
          </div>

          {/* Content List */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Title', 'Status', 'SEO Score', 'GEO Score', 'Words', 'Updated'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(content ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No content yet. Generate your first article above.
                  </td>
                </tr>
              )}
              {(content ?? []).map((item: any) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-xs">{item.title}</p>
                    <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: 'var(--text-muted)' }}>{item.keyword}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[item.status as ContentStatus] ?? ''}`}>
                      {item.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-32">
                    <ScoreBar value={item.seoScore ?? 0} color="var(--accent)" />
                  </td>
                  <td className="px-4 py-3 w-32">
                    <ScoreBar value={item.geoScore ?? 0} color="var(--geo-accent)" />
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {item.wordCount?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
        </>
      )}

      {/* Generate Dialog */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-semibold">Generate Content</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Topic</label>
                <input
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="e.g. Best SEO tools in 2025"
                  className="w-full px-4 py-2 rounded-lg outline-none text-sm"
                  style={{ background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Target Keyword</label>
                <input
                  value={genKeyword}
                  onChange={(e) => setGenKeyword(e.target.value)}
                  placeholder="e.g. seo tools"
                  className="w-full px-4 py-2 rounded-lg outline-none text-sm"
                  style={{ background: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            {generateMutation.isError && (
              <p className="text-xs text-red-400">Failed to generate content. Please try again.</p>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowGenerate(false)} className="px-4 py-2 text-sm rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button
                onClick={() => generateMutation.mutate({ topic: genTopic, keyword: genKeyword })}
                disabled={!genTopic || generateMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {generateMutation.isPending ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
