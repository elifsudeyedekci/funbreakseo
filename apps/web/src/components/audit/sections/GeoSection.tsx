'use client';

import { GaugeHalfCircle } from '../GaugeHalfCircle';
import { CheckRow } from './CheckRow';

export interface GeoJson {
  identitySchema?: { found: boolean; type: string | null; name: string | null } | null;
  llmReadability?: { renderedWordCount: number; staticWordCount: number; jsRenderedPercent: number; rating: string };
  llmsTxt?: { found: boolean; url: string | null };
  structuredDataIssues?: { schemaType: string; missingFields: string[] }[];
  eeat?: { score: number; factors: { label: string; present: boolean; weight: number }[] };
}

export interface AiOverviewRow {
  keyword: string;
  hasAiOverview: boolean;
  cited: boolean;
}

export interface GeoSectionProps {
  data: GeoJson | null;
  aiOverviewTracking?: AiOverviewRow[];
}

export function GeoSection({ data, aiOverviewTracking }: GeoSectionProps) {
  if (!data) {
    return <div className="rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm">GEO / AI görünürlük verisi için bir denetim çalıştırın.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
        <GaugeHalfCircle
          value={data.eeat?.score ?? 0}
          label="E-E-A-T Skoru"
          thresholds={{ good: 70, warn: 45 }}
        />
        <GaugeHalfCircle
          value={data.llmReadability?.jsRenderedPercent ?? 0}
          label="LLM Okunabilirliği (JS-render oranı, düşük iyi)"
          higherIsBetter={false}
          thresholds={{ good: 15, warn: 40 }}
          displayValue={`%${Math.round(data.llmReadability?.jsRenderedPercent ?? 0)}`}
        />
        <div className="rounded-xl border border-white/10 bg-white/2 p-4 text-sm w-full">
          <p className="text-white/40 text-xs mb-1">Kimlik Şeması</p>
          <p className="text-white font-semibold">{data.identitySchema?.found ? data.identitySchema.type : 'Bulunamadı'}</p>
          {data.identitySchema?.name && <p className="text-white/40 text-xs mt-1">{data.identitySchema.name}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <CheckRow
          label="llms.txt"
          ok={!!data.llmsTxt?.found}
          detail={data.llmsTxt?.url ?? undefined}
          info="llms.txt, AI asistanlarına sitenizin hangi içeriklerinin önceliklendirilmesi gerektiğini belirten bir dosyadır."
        />
        <CheckRow
          label="Yapılandırılmış veri eksiksiz"
          ok={!data.structuredDataIssues || data.structuredDataIssues.length === 0}
          detail={data.structuredDataIssues?.map((s) => s.schemaType).join(', ')}
        />
      </div>

      {data.eeat?.factors && data.eeat.factors.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2">E-E-A-T Faktörleri</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.eeat.factors.map((f) => (
              <CheckRow key={f.label} label={f.label} ok={f.present} detail={`Ağırlık: ${f.weight}`} />
            ))}
          </div>
        </div>
      )}

      {aiOverviewTracking && aiOverviewTracking.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2">Google AI Overview Takibi</h4>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs">
                  <th className="text-left p-3">Anahtar Kelime</th>
                  <th className="text-left p-3">AI Overview</th>
                  <th className="text-left p-3">Sitem Kaynak Gösterildi</th>
                </tr>
              </thead>
              <tbody>
                {aiOverviewTracking.map((row) => (
                  <tr key={row.keyword} className="border-b border-white/5 last:border-0">
                    <td className="p-3 text-white/80">{row.keyword}</td>
                    <td className="p-3">{row.hasAiOverview ? '✅' : '—'}</td>
                    <td className="p-3">{row.cited ? '✅' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default GeoSection;
