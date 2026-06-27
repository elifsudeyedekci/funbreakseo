'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { projectApi } from './api';

const STORAGE_KEY = 'funbreak_selected_project';

interface Project {
  id: string;
  domain: string;
  name?: string;
  healthScore?: number;
  status: string;
}

/**
 * Shared, app-wide selected-project state. Using a single zustand store (instead
 * of per-hook useState) is what fixes the bug where switching the project in the
 * header selector did not update data on other pages — every component now reads
 * and writes the SAME selection, and persists it to localStorage.
 */
interface SelectedProjectState {
  storedId: string | undefined;
  hydrated: boolean;
  setStoredId: (id: string) => void;
  hydrate: () => void;
}

const useStore = create<SelectedProjectState>((set) => ({
  storedId: undefined,
  hydrated: false,
  setStoredId: (id: string) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {
        /* ignore */
      }
    }
    set({ storedId: id });
  },
  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const val = localStorage.getItem(STORAGE_KEY) ?? undefined;
      set({ storedId: val, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
}));

export function useSelectedProject() {
  const storedId = useStore((s) => s.storedId);
  const hydrated = useStore((s) => s.hydrated);
  const setStoredId = useStore((s) => s.setStoredId);
  const hydrate = useStore((s) => s.hydrate);

  // Hydrate the persisted id from localStorage once on the client.
  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () =>
      projectApi.list().then((r) =>
        (Array.isArray(r.data) ? r.data : (r.data?.data ?? [])) as Project[]
      ),
  });

  // Resolve the active project: persisted selection if it still exists,
  // otherwise the first project.
  const projectId =
    (storedId && projects?.find((p) => p.id === storedId)?.id) ||
    projects?.[0]?.id;

  // Keep the store in sync when we fall back to the first project.
  useEffect(() => {
    if (projectId && projectId !== storedId) {
      setStoredId(projectId);
    }
  }, [projectId, storedId, setStoredId]);

  return {
    projectId,
    setProjectId: setStoredId,
    projects: projects ?? [],
    isLoading,
  };
}
