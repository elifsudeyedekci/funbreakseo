'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown, Plus, Globe } from 'lucide-react';
import { useSelectedProject } from '@/lib/useSelectedProject';
import { cn } from '@/lib/utils';

export function ProjectSelector({ currentProjectId }: { currentProjectId?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('dashNav');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { projects, setProjectId, projectId: persistedId } = useSelectedProject();

  const localePath = (path: string) => locale === 'tr' ? path : `/${locale}${path}`;

  // URL projectId wins; otherwise fall back to persisted selection
  const activeId = currentProjectId || persistedId;
  const current = projects.find((p) => p.id === activeId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function switchProject(id: string) {
    setProjectId(id);
    if (currentProjectId) {
      const newPath = pathname.replace(currentProjectId, id);
      router.push(newPath);
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 transition-colors max-w-[200px]"
      >
        <Globe className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
        <span className="truncate text-xs font-medium">
          {current?.domain || t('selectProject')}
        </span>

        <ChevronDown className="h-3.5 w-3.5 text-white/40 flex-shrink-0 ml-auto" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 glass rounded-xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-1">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => switchProject(project.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/10',
                  project.id === activeId ? 'text-indigo-300 bg-indigo-500/10' : 'text-white/70'
                )}
              >
                <div className="h-6 w-6 rounded bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">
                  {project.domain?.[0]?.toUpperCase() || 'P'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{project.domain}</p>
                  {project.healthScore !== undefined && (
                    <p className="text-[10px] text-white/30">{t('health')}: {project.healthScore}</p>
                  )}
                </div>
                {project.id === activeId && (
                  <svg className="ml-auto h-3.5 w-3.5 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}

            <div className="border-t border-white/10 mt-1 pt-1">
              <button
                onClick={() => {
                  router.push(localePath('/dashboard/projects'));
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t('addProject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
