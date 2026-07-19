'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import { backlinkApi } from '@/lib/api';
import { GaugeHalfCircle } from '../GaugeHalfCircle';
import { InfoTooltip } from '../InfoTooltip';

export interface BacklinkSummarySectionProps {
  projectId: string;
}

interface Gauges {
  domainStrength: number;
  pageStrength: number;
  counters: {
    total: number;
    referringDomains: number;
    dofollow: number;
    nofollow: number;
    edu: number;
    gov: number;
    ipCount: number;
    subnetCount: number;
  };
}

interface ToxicRow {
  id: string;
  sourceDomain: string;
  domainRating: number | null;
  toxicScore: number | null;
}

export function BacklinkSummarySection({ projectId }: BacklinkSummarySectionProps) {
  const { data: gauges, isLoading } = useQuery({
    queryKey: ['backlink-gauges', projectId],
    queryFn: () => backlinkApi.gauges(projectId).then((r) => r.data as Gauges),
    staleTime: 5 * 60_000,
  });

  const { data: toxic } = useQuery({
    queryKey: ['backlink-toxic-preview', projectId],
    queryFn: () => backlinkApi.toxic(projectId).then((r) => r.data as ToxicRow[]),
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return <div className="h-32 rounded-2xl border border-white/10 bg-white/2 animate-pulse" />;
  }

  if (!gauges || gauges.counters.total === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/2 p-6 text-center text-white/40 text-sm space-y-3">
        <p>Henüz backlink verisi senkronize edilmedi.</p>
        <Link href={`backlinks`} className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs">
          Backlink sayfasına git <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const c = gauges.counters;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-6">
        <GaugeHalfCircle value={gauges.domainStrength} label="Domain Strength" thresholds={{ good: 60, warn: 30 }} />
        <GaugeHalfCircle value={gauges.pageStrength} label="Page Strength" thresholds={{ good: 60, warn: 30 }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Backlink', value: c.total },
          { label: 'Yönlendiren Alan', value: c.referringDomains },
          { label: 'Dofollow', value: c.dofollow },
          { label: 'Nofollow', value: c.nofollow },
          { label: '.edu', value: c.edu },
          { label: '.gov', value: c.gov },
          { label: 'IP Sayısı', value: c.ipCount },
          { label: 'Alt Ağ (Subnet)', value: c.subnetCount },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/2 p-3 text-center">
            <div className="text-xl font-bold text-white">{s.value}</div>
            <div className="text-[11px] text-white/40 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {toxic && toxic.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
            <h4 className="text-xs font-semibold text-red-400">Toksik Backlink Uyarısı ({toxic.length})</h4>
            <InfoTooltip text="Spam puanı yüksek backlinkler sitenizin sıralamasına zarar verebilir. Disavow (reddet) aracıyla değerlendirin." />
          </div>
          <div className="space-y-1.5">
            {toxic.slice(0, 3).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs">
                <span className="text-white/70 truncate">{t.sourceDomain}</span>
                <span className="text-red-400 flex-shrink-0">Toksik Skor: {t.toxicScore ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href={`backlinks`} className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs">
        Tam backlink profilini görüntüle (coğrafya, anchor, hız grafiği) <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

export default BacklinkSummarySection;
