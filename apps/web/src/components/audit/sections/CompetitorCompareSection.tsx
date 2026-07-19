'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Swords, Loader2 } from 'lucide-react';
import { competitorApi } from '@/lib/api';
import { AuditRadarChart } from '../AuditRadarChart';
import { CATEGORICAL_DARK } from '../colors';

interface CategoryScore {
  score: number;
  grade: string;
}

interface AuditCategoryScores {
  onPage: CategoryScore;
  geo: CategoryScore;
  backlink: CategoryScore;
  usability: CategoryScore;
  performance: CategoryScore;
}

export interface CompetitorCompareSectionProps {
  projectId: string;
  projectDomain: string;
  ownCategoryScores: AuditCategoryScores | null;
}

const LABELS: Record<keyof AuditCategoryScores, string> = {
  onPage: 'Sayfa İçi SEO',
  geo: 'GEO / AI',
  backlink: 'Backlink',
  usability: 'Kullanılabilirlik',
  performance: 'Performans',
};

function toSeries(scores: AuditCategoryScores) {
  return (Object.keys(LABELS) as (keyof AuditCategoryScores)[]).map((key) => ({
    category: LABELS[key],
    score: scores[key]?.score ?? 0,
  }));
}

export function CompetitorCompareSection({ projectId, projectDomain, ownCategoryScores }: CompetitorCompareSectionProps) {
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (competitorDomain: string) => competitorApi.auditCompare(projectId, competitorDomain),
    onError: (err: any) => {
      const msg: string = err?.response?.data?.message ?? 'Karşılaştırma başarısız oldu.';
      if (msg.startsWith('LIMIT_REACHED')) {
        setError('Bu ayki rakip karşılaştırma limitinize ulaştınız. Daha yüksek bir pakete geçerek limitinizi artırabilirsiniz.');
      } else if (msg.startsWith('SCAN_REQUIRED')) {
        setError('Karşılaştırma için önce bu proje üzerinde bir site denetimi çalıştırmalısınız.');
      } else {
        setError(msg);
      }
    },
  });

  const result = mutation.data?.data as
    | { you: { domain: string; overallScore: number; overallGrade: string; categoryScores: AuditCategoryScores }; competitor: { domain: string; overallScore: number; overallGrade: string; categoryScores: AuditCategoryScores; note: string } }
    | undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="rakip-domain.com"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50"
        />
        <button
          onClick={() => {
            setError(null);
            if (domain.trim()) mutation.mutate(domain.trim());
          }}
          disabled={mutation.isPending || !domain.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
          Karşılaştır
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <div className="space-y-5">
          <AuditRadarChart
            series={[
              { name: projectDomain, color: CATEGORICAL_DARK[0], data: toSeries(result.you.categoryScores) },
              { name: result.competitor.domain, color: CATEGORICAL_DARK[5], data: toSeries(result.competitor.categoryScores) },
            ]}
          />

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs">
                  <th className="text-left p-3">Metrik</th>
                  <th className="text-left p-3">{projectDomain}</th>
                  <th className="text-left p-3">{result.competitor.domain}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="p-3 text-white/70">Genel Skor</td>
                  <td className={`p-3 font-semibold ${result.you.overallScore >= result.competitor.overallScore ? 'text-green-400' : 'text-white/60'}`}>
                    {result.you.overallGrade} ({result.you.overallScore})
                  </td>
                  <td className={`p-3 font-semibold ${result.competitor.overallScore > result.you.overallScore ? 'text-green-400' : 'text-white/60'}`}>
                    {result.competitor.overallGrade} ({result.competitor.overallScore})
                  </td>
                </tr>
                {(Object.keys(LABELS) as (keyof AuditCategoryScores)[]).map((key) => {
                  const you = result.you.categoryScores[key]?.score ?? 0;
                  const comp = result.competitor.categoryScores[key]?.score ?? 0;
                  return (
                    <tr key={key} className="border-b border-white/5 last:border-0">
                      <td className="p-3 text-white/70">{LABELS[key]}</td>
                      <td className={`p-3 ${you >= comp ? 'text-green-400' : 'text-white/50'}`}>{you}</td>
                      <td className={`p-3 ${comp > you ? 'text-green-400' : 'text-white/50'}`}>{comp}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-white/30">{result.competitor.note}</p>
        </div>
      )}
    </div>
  );
}

export default CompetitorCompareSection;
