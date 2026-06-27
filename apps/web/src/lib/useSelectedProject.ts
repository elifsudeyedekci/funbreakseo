'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectApi } from './api';

const STORAGE_KEY = 'funbreak_selected_project';

interface Project {
  id: string;
  domain: string;
  healthScore?: number;
  status: string;
}

export function useSelectedProject() {
  const [storedId, setStoredId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val) setStoredId(val);
  }, []);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () =>
      projectApi.list().then((r) =>
        (Array.isArray(r.data) ? r.data : (r.data?.data ?? [])) as Project[]
      ),
  });

  const projectId =
    (storedId && projects?.find((p) => p.id === storedId)?.id) ||
    projects?.[0]?.id;

  useEffect(() => {
    if (projectId && projectId !== storedId) {
      setStoredId(projectId);
      localStorage.setItem(STORAGE_KEY, projectId);
    }
  }, [projectId, storedId]);

  function setProjectId(id: string) {
    setStoredId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  return { projectId, setProjectId, projects: projects ?? [], isLoading };
}
