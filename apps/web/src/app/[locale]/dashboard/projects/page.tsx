'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Globe, TrendingUp, Search, AlertCircle, X } from 'lucide-react';
import { projectApi } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

interface Project {
  id: string;
  domain: string;
  country: string;
  language: string;
  healthScore: number;
  geoScore: number;
  keywordsCount: number;
  lastCrawlDate: string | null;
  status: string;
}

const addProjectSchema = z.object({
  domain: z.string().min(3, 'Geçerli bir domain girin').regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Örnek: example.com'),
  country: z.string().min(1, 'Ülke seçin'),
  language: z.string().min(1, 'Dil seçin'),
  searchEngine: z.string().default('GOOGLE'),
});

type AddProjectForm = z.infer<typeof addProjectSchema>;

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-sm font-bold text-white">{score}</span>
    </div>
  );
}

export default function ProjectsPage() {
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const localePath = (path: string) => locale === 'tr' ? path : `/${locale}${path}`;

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list().then((r) => r.data.data as Project[]),
  });

  const createMutation = useMutation({
    mutationFn: (data: AddProjectForm) => projectApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowModal(false);
      reset();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddProjectForm>({
    resolver: zodResolver(addProjectSchema),
    defaultValues: { searchEngine: 'GOOGLE' },
  });

  const projects = data || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projeler</h1>
          <p className="text-white/50 text-sm mt-1">Tüm sitelerinizi yönetin</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="h-4 w-4" />
          Yeni Proje Ekle
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/2 h-48 animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-2xl bg-white/5 mb-4">
            <Globe className="h-10 w-10 text-white/30" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Henüz proje yok</h3>
          <p className="text-white/40 text-sm mb-6">İlk projenizi ekleyin ve SEO analizine başlayın</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            İlk Projeyi Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => router.push(localePath(`/dashboard/projects/${project.id}/dashboard`))}
              className="text-left rounded-2xl border border-white/10 bg-white/2 p-5 hover:border-indigo-500/30 hover:bg-white/5 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                    {project.domain}
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    {project.country} · {project.language}
                    {project.lastCrawlDate && ` · ${formatDate(project.lastCrawlDate)}`}
                  </p>
                </div>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2',
                  project.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'
                )}>
                  {project.status === 'ACTIVE' ? 'Aktif' : project.status}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <ScoreRing score={project.healthScore || 0} color="#6366f1" />
                  <p className="text-[10px] text-white/40 mt-1">SEO</p>
                </div>
                <div className="text-center">
                  <ScoreRing score={project.geoScore || 0} color="#a855f7" />
                  <p className="text-[10px] text-white/40 mt-1">GEO</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="flex items-center gap-1 text-sm text-white/70">
                    <Search className="h-3.5 w-3.5" />
                    <span>{(project.keywordsCount || 0).toLocaleString('tr-TR')}</span>
                  </div>
                  <p className="text-[10px] text-white/30 mt-0.5">kelime</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Add project modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Yeni Proje Ekle</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Domain</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">https://</span>
                  <input
                    {...register('domain')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-16 pr-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none"
                    placeholder="example.com"
                  />
                </div>
                {errors.domain && <p className="mt-1 text-xs text-red-400">{errors.domain.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Ülke</label>
                  <select
                    {...register('country')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="">Seç</option>
                    <option value="TR">Türkiye</option>
                    <option value="US">ABD</option>
                    <option value="DE">Almanya</option>
                    <option value="GB">İngiltere</option>
                    <option value="FR">Fransa</option>
                    <option value="SA">Suudi Arabistan</option>
                    <option value="AE">BAE</option>
                  </select>
                  {errors.country && <p className="mt-1 text-xs text-red-400">{errors.country.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Dil</label>
                  <select
                    {...register('language')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                  >
                    <option value="">Seç</option>
                    <option value="tr">Türkçe</option>
                    <option value="en">İngilizce</option>
                    <option value="de">Almanca</option>
                    <option value="fr">Fransızca</option>
                    <option value="ar">Arapça</option>
                  </select>
                  {errors.language && <p className="mt-1 text-xs text-red-400">{errors.language.message}</p>}
                </div>
              </div>

              {createMutation.isError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  Proje eklenemedi. Lütfen tekrar deneyin.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); reset(); }}
                  className="flex-1 rounded-xl border border-white/20 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
                >
                  {createMutation.isPending ? 'Ekleniyor...' : 'Ekle ve Tara'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
