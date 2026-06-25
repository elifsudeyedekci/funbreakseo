'use client';

import { useQuery } from '@tanstack/react-query';
import { use } from 'react';
import { Brain, TrendingUp, Quote, AlertTriangle } from 'lucide-react';
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

export default function GeoPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ['geo', projectId],
    queryFn: () => geoApi.overview(projectId).then((r) => r.data.data as GeoData),
  });

  const visibility = data?.visibility;
  const recommendations: Array<{ id: string; title: string; priority: string; description: string }> = data?.recommendations || [];

  const platforms = Object.entries(PLATFORM_LABELS) as Array<[GeoPlatform, string]>;

  return (
    <div className="p-6 space-y-6">
      {/* Header with purple theme */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-500/20">
          <Brain className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">GEO / AI Görünürlük</h1>
          <p className="text-white/50 text-sm">ChatGPT, Gemini, Perplexity ve diğer AI platformlarında görünürlüğünüz</p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-white/50">AI Mention</span>
          </div>
          <div className="text-4xl font-bold gradient-text-geo">{visibility?.mentionCount ?? '—'}</div>
          <p className="text-xs text-white/30 mt-1">AI cevaplarında adınız geçti</p>
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Quote className="h-4 w-4 text-indigo-400" />
            <span className="text-xs text-white/50">AI Citation</span>
          </div>
          <div className="text-4xl font-bold text-indigo-400">{visibility?.citationCount ?? '—'}</div>
          <p className="text-xs text-white/30 mt-1">Siteniz kaynak gösterildi</p>
        </div>

        <div className={`rounded-2xl border p-5 ${
          (visibility?.citationToMentionRatio ?? 0) < 0.1
            ? 'border-orange-500/30 bg-orange-500/5'
            : 'border-emerald-500/30 bg-emerald-500/5'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <span className="text-xs text-white/50">Citation/Mention Oranı</span>
          </div>
          <div className={`text-4xl font-bold ${
            (visibility?.citationToMentionRatio ?? 0) < 0.1 ? 'text-orange-400' : 'text-emerald-400'
          }`}>
            {visibility?.citationToMentionRatio !== undefined
              ? `${(visibility.citationToMentionRatio * 100).toFixed(0)}%`
              : '—'}
          </div>
          <p className="text-xs text-white/30 mt-1">
            {(visibility?.citationToMentionRatio ?? 0) < 0.1 ? '%10 altı → içerik yapısı sorunu' : 'İyi seviye'}
          </p>
        </div>
      </div>

      {/* Platform breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Platform Dağılımı</h2>
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
          <h2 className="text-lg font-semibold text-white mb-4">GEO Önerileri</h2>
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
                    {rec.priority === 'HIGH' ? 'Yüksek Öncelik' : rec.priority === 'MEDIUM' ? 'Orta' : 'Düşük'}
                  </span>
                  <h3 className="text-sm font-semibold text-white">{rec.title}</h3>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">{rec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
