'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Brain, TrendingUp, Quote, AlertTriangle, Plus, X, Play, Loader2 } from 'lucide-react';
import { geoApi } from '@/lib/api';
import type { GeoVisibilityData, GeoPlatform } from '@funbreakseo/shared';

const PLATFORM_LABELS: Record<GeoPlatform, string> = {
  CHATGPT: 'ChatGPT',
  GEMINI: 'Gemini',
  PERPLEXITY: 'Perplexity',
  CLAUDE: 'Claude',
  GOOGLE_AI_OVERVIEW: 'AI Overview',
  GOOGLE_AI_MODE: 'AI Mode',
};

const PLATFORM_COLORS: Record<GeoPlatform, string> = {
  CHATGPT: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  GEMINI: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  PERPLEXITY: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
  CLAUDE: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
  GOOGLE_AI_OVERVIEW: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400',
  GOOGLE_AI_MODE: 'bg-rose-500/20 border-rose-500/30 text-rose-400',
};

interface GeoData {
  visibility: GeoVisibilityData;
  recommendations: Array<{ id: string; title: string; priority: string; description: string }>;
}

export default function GeoPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslations('geoPage');
  const queryClient = useQueryClient();
  const [showAddQuery, setShowAddQuery] = useState(false);
  const [queryInput, setQueryInput] = useState('');

  const { data: queriesData } = useQuery({
    queryKey: ['geo-queries', projectId],
    queryFn: () => geoApi.listQueries(projectId).then((r) => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
  });

  const addQueryMutation = useMutation({
    mutationFn: (prompt: string) => geoApi.addQuery(projectId, { prompt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geo-queries', projectId] });
      setQueryInput('');
      setShowAddQuery(false);
    },
  });

  const scanMutation = useMutation({
    mutationFn: () => geoApi.triggerScan(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geo', projectId] });
      queryClient.invalidateQueries({ queryKey: ['geo-queries', projectId] });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['geo', projectId],
    queryFn: () =>
      Promise.all([
        geoApi.overview(projectId).then((r) => r.data),
        geoApi.recommendations(projectId).then((r) => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
      ]).then(([overview, recs]) =>
        overview ? ({ visibility: overview as GeoVisibilityData, recommendations: recs } as GeoData) : null
      ),
  });

  const visibility = data?.visibility;
  const recommendations: Array<{ id: string; title: string; priority: string; description: string }> = data?.recommendations || [];

  const platforms = Object.entries(PLATFORM_LABELS) as Array<[GeoPlatform, string]>;
  const ratio = visibility?.citationToMentionRatio ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header with purple theme */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-500/20">
          <Brain className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
          <p className="text-white/50 text-sm">{t('subtitle')}</p>
        </div>
      </div>

      {/* GEO Queries section */}
      <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">AI Sorguları</h2>
          <div className="flex gap-2">
            <button
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 transition-all"
            >
              {scanMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Tarama Başlat
            </button>
            <button
              onClick={() => setShowAddQuery(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 transition-all"
            >
              <Plus className="h-3 w-3" />
              Sorgu Ekle
            </button>
          </div>
        </div>

        {queriesData && queriesData.length > 0 ? (
          <div className="space-y-2">
            {(queriesData as Array<{ id: string; prompt: string; createdAt: string }>).map((q) => (
              <div key={q.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                <span className="text-sm text-white/70">{q.prompt}</span>
                <span className="text-xs text-white/30">{new Date(q.createdAt).toLocaleDateString('tr-TR')}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/30 text-center py-4">
            Henüz sorgu yok. "Tarama Başlat" butonuna basarak domain adınıza göre otomatik sorgu oluşturulur; ya da manuel sorgu ekleyebilirsiniz.
          </p>
        )}
      </div>

      {showAddQuery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">GEO Sorgusu Ekle</h2>
              <button onClick={() => setShowAddQuery(false)} className="p-1 text-white/40 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-white/50 mb-4">
              Kullanıcıların AI platformlarında sorabileceği soruları girin. (ör: "seo aracı önerir misin?")
            </p>
            <textarea
              rows={3}
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Markanız için seo aracı önerin..."
              className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder-white/30 resize-none focus:border-purple-500/50 focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddQuery(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white">
                İptal
              </button>
              <button
                onClick={() => addQueryMutation.mutate(queryInput.trim())}
                disabled={!queryInput.trim() || addQueryMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
              >
                {addQueryMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-white/50">AI Mention</span>
          </div>
          <div className="text-4xl font-bold gradient-text-geo">{visibility?.mentionCount ?? '—'}</div>
          <p className="text-xs text-white/30 mt-1">{t('aiMentionDesc')}</p>
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Quote className="h-4 w-4 text-indigo-400" />
            <span className="text-xs text-white/50">AI Citation</span>
          </div>
          <div className="text-4xl font-bold text-indigo-400">{visibility?.citationCount ?? '—'}</div>
          <p className="text-xs text-white/30 mt-1">{t('aiCitationDesc')}</p>
        </div>

        <div className={`rounded-2xl border p-5 ${
          ratio < 0.1
            ? 'border-orange-500/30 bg-orange-500/5'
            : 'border-emerald-500/30 bg-emerald-500/5'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <span className="text-xs text-white/50">{t('citationRatio')}</span>
          </div>
          <div className={`text-4xl font-bold ${ratio < 0.1 ? 'text-orange-400' : 'text-emerald-400'}`}>
            {visibility?.citationToMentionRatio !== undefined
              ? `${(visibility.citationToMentionRatio * 100).toFixed(0)}%`
              : '—'}
          </div>
          <p className="text-xs text-white/30 mt-1">
            {ratio < 0.1 ? t('lowRatioWarning') : t('goodLevel')}
          </p>
        </div>
      </div>

      {/* Platform breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">{t('platformBreakdown')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {platforms.map(([platform, label]) => {
            const stats = visibility?.byPlatform?.[platform];
            return (
              <div
                key={platform}
                className={`rounded-xl border p-4 text-center ${PLATFORM_COLORS[platform]}`}
              >
                <p className="text-xs font-medium mb-3">{label}</p>
                <div className="space-y-1">
                  <div>
                    <div className="text-lg font-bold">{stats?.mentions ?? 0}</div>
                    <div className="text-[10px] opacity-60">mention</div>
                  </div>
                  <div>
                    <div className="text-base font-bold">{stats?.citations ?? 0}</div>
                    <div className="text-[10px] opacity-60">citation</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">{t('recommendations')}</h2>
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    rec.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                    rec.priority === 'MEDIUM' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {rec.priority === 'HIGH' ? t('priorityHigh') : rec.priority === 'MEDIUM' ? t('priorityMedium') : t('priorityLow')}
                  </span>
                  <h3 className="text-sm font-semibold text-white">{rec.title}</h3>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">{rec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 h-32 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}
