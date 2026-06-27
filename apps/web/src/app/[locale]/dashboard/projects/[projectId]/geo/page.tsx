'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Brain, TrendingUp, Quote, AlertTriangle, Plus, X, Play, Loader2, Trash2, Info, Search, CheckCircle2, MinusCircle, PenLine, Sparkles } from 'lucide-react';
import { geoApi, api, contentApi } from '@/lib/api';
import type { GeoVisibilityData, GeoPlatform } from '@funbreakseo/shared';

interface GeoQueryDetail {
  id: string;
  prompt: string;
  mentioned: boolean;
  cited: boolean;
  platforms: Array<{
    platform: GeoPlatform;
    mentioned: boolean;
    cited: boolean;
    position: number | null;
    snippet?: string | null;
  }>;
}

const PLATFORM_LABELS: Record<GeoPlatform, string> = {
  CHATGPT: 'ChatGPT',
  GEMINI: 'Gemini',
  PERPLEXITY: 'Perplexity',
  CLAUDE: 'Claude',
  GOOGLE_AI_OVERVIEW: 'AI Overview',
  GOOGLE_AI_MODE: 'AI Mode',
};

const PLATFORM_DESC: Record<GeoPlatform, string> = {
  CHATGPT: 'ChatGPT: OpenAI’ın yapay zeka sohbet asistanı — kullanıcılar ürün/hizmet sorularını burada soruyor.',
  GEMINI: 'Gemini: Google’ın yapay zeka asistanı.',
  PERPLEXITY: 'Perplexity: Kaynak gösteren yapay zeka arama motoru.',
  CLAUDE: 'Claude: Anthropic’in yapay zeka asistanı.',
  GOOGLE_AI_OVERVIEW: 'AI Overview: Google arama sonuçlarının en üstünde çıkan yapay zeka özeti.',
  GOOGLE_AI_MODE: 'AI Mode: Google’ın tamamen yapay zeka ile çalışan yeni arama modu — klasik mavi linkler yerine sohbet tarzı cevap verir.',
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

  const { data: queryDetails } = useQuery<GeoQueryDetail[]>({
    queryKey: ['geo-query-details', projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/geo/queries/details`)
        .then((r) => (Array.isArray(r.data) ? r.data : (r.data?.data ?? [])) as GeoQueryDetail[])
        .catch(() => []),
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

  const deleteQueryMutation = useMutation({
    mutationFn: (queryId: string) => geoApi.deleteQuery(projectId, queryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geo-queries', projectId] });
    },
  });

  // One-click action: turn a GEO gap (recommendation or query where the brand is
  // not shown) into an AI-generated content draft. This is the "müşteri sorunu
  // görsün AMA çözümü tek tıkla başlatabilsin" requirement.
  const [actionResult, setActionResult] = useState<{ topic: string; ok: boolean } | null>(null);
  const generateContentMutation = useMutation({
    mutationFn: (topic: string) =>
      contentApi.generate(projectId, {
        title: `${topic} — kapsamlı rehber`,
        focusKeyword: topic,
        type: 'BLOG',
      }),
    onSuccess: (_d, topic) => setActionResult({ topic, ok: true }),
    onError: (_e, topic) => setActionResult({ topic, ok: false }),
  });
  const generatingTopic = generateContentMutation.isPending ? generateContentMutation.variables : null;

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

      {/* Educational info box — explains the value of GEO to the customer */}
      <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 flex-shrink-0">
            <Info className="h-4 w-4 text-purple-300" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white">GEO nedir, size ne kazandırır?</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              İnsanlar artık yalnızca Google&apos;da değil, <strong className="text-white/80">ChatGPT, Gemini, Perplexity</strong> ve
              Google&apos;ın <strong className="text-white/80">AI Overview</strong> bölümünde de cevap arıyor. GEO (Generative Engine
              Optimization), markanızın bu yapay zeka cevaplarında görünüp görünmediğini ölçer. AI bir kullanıcıya cevap verirken
              markanızı önerirse veya kaynak gösterirse, <strong className="text-white/80">reklam vermeden</strong> yeni müşterilere ulaşırsınız.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="rounded-lg bg-white/5 px-3 py-2">
                <span className="text-xs font-semibold text-purple-300">AI&apos;da Bahsedilme</span>
                <p className="text-[11px] text-white/50 mt-0.5">Yapay zeka cevabında markanızın/sitenizin adı geçiyor.</p>
              </div>
              <div className="rounded-lg bg-white/5 px-3 py-2">
                <span className="text-xs font-semibold text-indigo-300">Kaynak Gösterilme</span>
                <p className="text-[11px] text-white/50 mt-0.5">Yapay zeka cevabının altında sitenizi kaynak olarak link veriyor — en değerlisi budur.</p>
              </div>
              <div className="rounded-lg bg-white/5 px-3 py-2">
                <span className="text-xs font-semibold text-rose-300">AI Mode</span>
                <p className="text-[11px] text-white/50 mt-0.5">Google&apos;ın tamamen yapay zeka ile çalışan yeni arama modu — klasik mavi linkler yerine sohbet tarzı cevap verir.</p>
              </div>
              <div className="rounded-lg bg-white/5 px-3 py-2">
                <span className="text-xs font-semibold text-indigo-300">AI Overview</span>
                <p className="text-[11px] text-white/50 mt-0.5">Google arama sonuçlarının en üstünde çıkan yapay zeka özeti kutusu.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* One-click action result banner */}
      {actionResult && (
        <div className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${actionResult.ok ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-red-500/20 bg-red-500/5 text-red-400'}`}>
          {actionResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {actionResult.ok
            ? `"${actionResult.topic}" konusunda içerik taslağı oluşturuldu — İçerik sayfasından düzenleyip yayınlayabilirsiniz.`
            : `"${actionResult.topic}" için içerik oluşturulamadı. İçerik kredinizi kontrol edip tekrar deneyin.`}
        </div>
      )}

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
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/30">{new Date(q.createdAt).toLocaleDateString('tr-TR')}</span>
                  <button
                    onClick={() => deleteQueryMutation.mutate(q.id)}
                    disabled={deleteQueryMutation.isPending}
                    className="text-white/30 hover:text-red-400 disabled:opacity-50 transition-colors"
                    title="Sorguyu sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
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
            <span className="text-xs text-white/50">AI&apos;da Bahsedilme</span>
          </div>
          <div className="text-4xl font-bold gradient-text-geo">{visibility?.mentionCount ?? '—'}</div>
          <p className="text-xs text-white/30 mt-1">Markanızın AI cevaplarında kaç kez adının geçtiği</p>
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Quote className="h-4 w-4 text-indigo-400" />
            <span className="text-xs text-white/50">Kaynak Gösterilme</span>
          </div>
          <div className="text-4xl font-bold text-indigo-400">{visibility?.citationCount ?? '—'}</div>
          <p className="text-xs text-white/30 mt-1">AI cevabında sitenizin kaynak olarak link verilmesi</p>
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
                title={PLATFORM_DESC[platform]}
                className={`rounded-xl border p-4 text-center cursor-help ${PLATFORM_COLORS[platform]}`}
              >
                <p className="text-xs font-medium mb-3">{label}</p>
                <div className="space-y-1">
                  <div>
                    <div className="text-lg font-bold">{stats?.mentions ?? 0}</div>
                    <div className="text-[10px] opacity-60">bahsedilme</div>
                  </div>
                  <div>
                    <div className="text-base font-bold">{stats?.citations ?? 0}</div>
                    <div className="text-[10px] opacity-60">kaynak</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-query detail: which search query, which AI platform, how the brand showed up */}
      {queryDetails && queryDetails.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Sorgu Bazında Görünürlük</h2>
          <p className="text-[11px] text-white/35 mb-4">Hangi aramada, hangi AI platformunda markanız nasıl göründü</p>
          <div className="space-y-3">
            {queryDetails.map((q) => (
              <div key={q.id} className="rounded-xl border border-white/10 bg-white/2 p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Search className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{q.prompt}</p>
                    <div className="flex gap-2 mt-1">
                      {q.mentioned ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Bahsedildi</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/30"><MinusCircle className="h-3 w-3" /> Bahsedilmedi</span>
                      )}
                      {q.cited && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400"><Quote className="h-3 w-3" /> Kaynak gösterildi</span>
                      )}
                    </div>
                  </div>
                </div>
                {q.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {q.platforms.map((p, i) => (
                      <div key={i} className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${PLATFORM_COLORS[p.platform] ?? 'border-white/10 text-white/50'}`}>
                        <span className="font-semibold">{PLATFORM_LABELS[p.platform] ?? p.platform}</span>
                        <span className="opacity-70">
                          {' · '}
                          {p.mentioned ? 'bahsedildi' : 'yok'}
                          {p.cited ? ' · kaynak' : ''}
                          {p.position != null ? ` · #${p.position}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Action: brand not shown for this query → offer to write content */}
                {!q.mentioned && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                    <Info className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-[11px] text-white/60">
                        Bu aramada yapay zeka markanızı göstermiyor. <strong className="text-white/80">Ne yapmalı?</strong> Bu konuda
                        kapsamlı, soruyu net yanıtlayan bir içerik yayınlamak AI cevaplarında görünme şansınızı artırır.
                      </p>
                      <button
                        onClick={() => generateContentMutation.mutate(q.prompt)}
                        disabled={generateContentMutation.isPending}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-all"
                      >
                        {generatingTopic === q.prompt ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />}
                        İçerik Yaz
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
                {/* One-click action: generate content to act on this recommendation */}
                <button
                  onClick={() => generateContentMutation.mutate(rec.title)}
                  disabled={generateContentMutation.isPending}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-all"
                >
                  {generatingTopic === rec.title ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Bunun için İçerik Yaz
                </button>
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
