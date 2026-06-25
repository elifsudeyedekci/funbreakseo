'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Download, Plus, FileText } from 'lucide-react';
import { reportsApi } from '@/lib/api';

interface Report {
  id: string;
  name: string;
  type: string;
  status: 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';
  fileUrl: string | null;
  createdAt: string;
}

export default function ReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [showSchedule, setShowSchedule] = useState(false);
  const [reportType, setReportType] = useState('OVERVIEW');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', projectId],
    queryFn: () => reportsApi.list(projectId).then((r) => (r.data?.data ?? []) as Report[]),
    refetchInterval: (q) => (q.state.data as Report[] | undefined)?.some((r) => r.status === 'GENERATING' || r.status === 'PENDING') ? 5000 : false,
  });

  const generateMutation = useMutation({
    mutationFn: () => reportsApi.generate(projectId, { type: reportType }),
    onSuccess: () => refetch(),
  });

  const reports = data || [];

  const statusConfig: Record<Report['status'], { label: string; color: string }> = {
    PENDING: { label: 'Bekleniyor', color: 'text-yellow-400' },
    GENERATING: { label: 'Uretiliyor...', color: 'text-blue-400' },
    READY: { label: 'Hazir', color: 'text-emerald-400' },
    FAILED: { label: 'Basarisiz', color: 'text-red-400' },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Raporlar</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowSchedule(true)}
            className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10 transition-colors">
            Zamanlanmis Rapor
          </button>
          <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all">
            <Plus className="h-4 w-4" /> Rapor Uret
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {['OVERVIEW', 'KEYWORDS', 'AUDIT', 'BACKLINKS', 'GEO'].map((type) => (
          <button key={type} onClick={() => setReportType(type)}
            className={['rounded-lg px-3 py-1.5 text-xs font-medium transition-colors', reportType === type ? 'bg-indigo-600 text-white' : 'border border-white/10 text-white/50 hover:text-white hover:bg-white/10'].join(' ')}>
            {type}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-xl border border-white/10 h-16 animate-pulse" />)}</div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center">
          <FileText className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 mb-4">Henuz rapor yok</p>
          <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-all">
            Ilk Raporu Uret
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Rapor Adi', 'Tur', 'Durum', 'Tarih', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-white/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/2">
                  <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                  <td className="px-4 py-3 text-white/50 text-xs">{r.type}</td>
                  <td className={['px-4 py-3 text-xs font-medium', statusConfig[r.status]?.color || ''].join(' ')}>{statusConfig[r.status]?.label || r.status}</td>
                  <td className="px-4 py-3 text-white/40 text-xs">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
                  <td className="px-4 py-3">
                    {r.status === 'READY' && r.fileUrl && (
                      <a href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors inline-block">
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}