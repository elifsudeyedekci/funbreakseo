'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Plus, FileText, Sparkles, X } from 'lucide-react';
import { contentApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ContentStatus } from '@funbreakseo/shared';

interface Content {
  id: string;
  title: string;
  keyword: string;
  contentType: string;
  status: ContentStatus;
  seoScore: number;
  wordCount: number;
  createdAt: string;
}

export default function ContentPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslations('contentPage');
  const queryClient = useQueryClient();

  const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string }> = {
    DRAFT: { label: t('statusDraft'), color: 'bg-white/10 text-white/50' },
    GENERATING: { label: t('statusGenerating'), color: 'bg-blue-500/20 text-blue-400' },
    REVIEW: { label: t('statusReview'), color: 'bg-yellow-500/20 text-yellow-400' },
    APPROVED: { label: t('statusApproved'), color: 'bg-emerald-500/20 text-emerald-400' },
    PUBLISHED: { label: t('statusPublished'), color: 'bg-green-500/20 text-green-400' },
    REJECTED: { label: t('statusRejected'), color: 'bg-red-500/20 text-red-400' },
  };
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', focusKeyword: '', type: 'BLOG', language: 'tr', tone: 'professional' });
  const [filterStatus, setFilterStatus] = useState<ContentStatus | 'ALL'>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['content', projectId],
    queryFn: () => contentApi.list(projectId).then((r) => (r.data?.items ?? r.data?.data ?? []) as Content[]),
    refetchInterval: (query) => {
      const items = query.state.data as Content[] | undefined;
      return items?.some((c) => c.status === 'GENERATING') ? 5000 : false;
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => contentApi.generate(projectId, { ...form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', projectId] });
      setShowModal(false);
      setForm({ title: '', focusKeyword: '', type: 'BLOG', language: 'tr', tone: 'professional' });
    },
  });

  const items = (data || []).filter((c) => filterStatus === 'ALL' || c.status === filterStatus);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
          <p className="text-white/50 text-sm mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all"
        >
          <Sparkles className="h-4 w-4" />
          {t('generateBtn')}
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'DRAFT', 'GENERATING', 'REVIEW', 'APPROVED', 'PUBLISHED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              filterStatus === s ? 'bg-indigo-600 text-white' : 'border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
            )}
          >
            {s === 'ALL' ? t('allFilter') : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Content list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 h-20 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center">
          <FileText className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 mb-4">{t('empty')}</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            {t('addFirstBtn')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-white/2 p-5 hover:bg-white/5 transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate">{item.title || item.keyword}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-white/40">{item.keyword}</span>
                    <span className="text-xs text-white/30">·</span>
                    <span className="text-xs text-white/40">{item.contentType}</span>
                    {item.wordCount > 0 && (
                      <>
                        <span className="text-xs text-white/30">·</span>
                        <span className="text-xs text-white/40">{t('wordCount', { count: item.wordCount.toLocaleString() })}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {item.seoScore > 0 && (
                    <div className="text-center">
                      <div className={`text-lg font-bold ${item.seoScore >= 80 ? 'text-emerald-400' : item.seoScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {item.seoScore}
                      </div>
                      <div className="text-[10px] text-white/30">SEO</div>
                    </div>
                  )}
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_CONFIG[item.status].color)}>
                    {STATUS_CONFIG[item.status].label}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">{t('modalTitle')}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">{t('titleLabel') ?? 'Makale Başlığı'}</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none"
                  placeholder={t('titlePlaceholder') ?? 'Örn: 2025 Yılının En İyi SEO Araçları'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">{t('keywordLabel')}</label>
                <input
                  value={form.focusKeyword}
                  onChange={(e) => setForm((p) => ({ ...p, focusKeyword: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none"
                  placeholder={t('keywordPlaceholder')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">{t('typeLabel')}</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="BLOG">{t('typeBlog')}</option>
                    <option value="PRODUCT">{t('typeProduct')}</option>
                    <option value="LANDING">{t('typeLanding')}</option>
                    <option value="FAQ">{t('typeFaq')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">{t('langLabel')}</label>
                  <select
                    value={form.language}
                    onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="tr">{t('langTR')}</option>
                    <option value="en">{t('langEN')}</option>
                    <option value="de">{t('langDE')}</option>
                    <option value="fr">{t('langFR')}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-white/20 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 transition-colors"
                >
                  {t('cancelBtn')}
                </button>
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={!form.title || !form.focusKeyword || generateMutation.isPending}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {generateMutation.isPending ? (
                    <><span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('generatingBtn')}</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> {t('generateModalBtn')}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
