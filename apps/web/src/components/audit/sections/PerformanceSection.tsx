'use client';

import { GaugeHalfCircle } from '../GaugeHalfCircle';
import { DonutChart } from '../DonutChart';
import { CheckRow } from './CheckRow';

interface CwvMetric {
  value: number;
  rating: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
}

export interface PerformanceJson {
  serverResponseMs?: number;
  pageLoadMs?: number;
  scriptsCompleteMs?: number;
  downloadSizeBytes?: number;
  sizeBreakdown?: { html: number; css: number; js: number; images: number; fonts: number; other: number };
  compressionRatio?: number;
  compressionByType?: { type: string; ratio: number }[];
  requestCount?: number;
  requestsByType?: { type: string; count: number }[];
  opportunities?: { id: string; title: string; savingsMs: number }[];
  usesHttp2?: boolean;
  isAmp?: boolean;
  hasConsoleErrors?: boolean;
  minified?: { js: boolean; css: boolean };
  deprecatedHtml?: boolean;
  hasInlineStyles?: boolean;
  psi?: {
    mobile: { score: number; fcp: number; speedIndex: number; lcp: number; tti: number; tbt: number; cls: number } | null;
    desktop: { score: number; fcp: number; speedIndex: number; lcp: number; tti: number; tbt: number; cls: number } | null;
  };
  coreWebVitals?: {
    mobile: { lcp: CwvMetric; inp: CwvMetric; cls: CwvMetric } | null;
    desktop: { lcp: CwvMetric; inp: CwvMetric; cls: CwvMetric } | null;
  };
}

export interface PerformanceSectionProps {
  data: PerformanceJson | null;
}

function bytesToMb(b: number) {
  return Math.round((b / (1024 * 1024)) * 100) / 100;
}

function CwvGauges({ label, cwv }: { label: string; cwv: { lcp: CwvMetric; inp: CwvMetric; cls: CwvMetric } | null }) {
  if (!cwv) {
    return <div className="text-white/30 text-sm rounded-xl border border-white/10 bg-white/2 p-4">{label}: Veri yok</div>;
  }
  const ratingColor = (r: CwvMetric['rating']) => (r === 'GOOD' ? 'good' : r === 'NEEDS_IMPROVEMENT' ? 'warn' : 'critical');
  return (
    <div>
      <p className="text-xs text-white/50 mb-2">{label}</p>
      <div className="grid grid-cols-3 gap-3">
        <GaugeHalfCircle size="sm" value={cwv.lcp.value} label="LCP (sn)" displayValue={`${(cwv.lcp.value / 1000).toFixed(1)}s`} higherIsBetter={false} thresholds={{ good: 2500, warn: 4000 }} />
        <GaugeHalfCircle size="sm" value={cwv.inp.value} label="INP (ms)" displayValue={`${Math.round(cwv.inp.value)}ms`} higherIsBetter={false} thresholds={{ good: 200, warn: 500 }} />
        <GaugeHalfCircle size="sm" value={cwv.cls.value * 100} label="CLS" displayValue={cwv.cls.value.toFixed(2)} higherIsBetter={false} thresholds={{ good: 10, warn: 25 }} />
      </div>
      <p className="text-[10px] text-white/25 mt-1">
        {ratingColor(cwv.lcp.rating)} · {ratingColor(cwv.inp.rating)} · {ratingColor(cwv.cls.rating)}
      </p>
    </div>
  );
}

export function PerformanceSection({ data }: PerformanceSectionProps) {
  if (!data) {
    return <div className="rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm">Performans verisi için bir denetim çalıştırın.</div>;
  }

  const sizeDonut = data.sizeBreakdown
    ? Object.entries(data.sizeBreakdown).map(([label, value]) => ({ label: label.toUpperCase(), value: bytesToMb(value) }))
    : [];
  const requestsDonut = (data.requestsByType ?? []).map((r) => ({ label: r.type, value: r.count }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GaugeHalfCircle value={data.serverResponseMs ?? 0} label="Sunucu Yanıt Süresi" displayValue={`${((data.serverResponseMs ?? 0) / 1000).toFixed(2)}s`} higherIsBetter={false} thresholds={{ good: 200, warn: 500 }} />
        <GaugeHalfCircle value={data.pageLoadMs ?? 0} label="Sayfa Yükleme Süresi" displayValue={`${((data.pageLoadMs ?? 0) / 1000).toFixed(1)}s`} higherIsBetter={false} thresholds={{ good: 2000, warn: 4000 }} />
        <GaugeHalfCircle value={data.scriptsCompleteMs ?? 0} label="Tüm Betikler Tamamlanma" displayValue={`${((data.scriptsCompleteMs ?? 0) / 1000).toFixed(1)}s`} higherIsBetter={false} thresholds={{ good: 3000, warn: 6000 }} />
        <GaugeHalfCircle value={(data.compressionRatio ?? 0) * 100} label="Sıkıştırma Oranı" displayValue={`%${Math.round((data.compressionRatio ?? 0) * 100)}`} thresholds={{ good: 60, warn: 30 }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2">İndirme Boyutu Dağılımı (MB)</h4>
          <DonutChart data={sizeDonut} centerLabel={`${bytesToMb(data.downloadSizeBytes ?? 0)} MB`} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2">Kaynak Dağılımı ({data.requestCount ?? 0} istek)</h4>
          <DonutChart data={requestsDonut} centerLabel={`${data.requestCount ?? 0}`} />
        </div>
      </div>

      {data.compressionByType && data.compressionByType.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2">Dosya Tipine Göre Sıkıştırma</h4>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <tbody>
                {data.compressionByType.map((c) => (
                  <tr key={c.type} className="border-b border-white/5 last:border-0">
                    <td className="p-3 text-white/70">{c.type}</td>
                    <td className="p-3 text-white/80 text-right">%{Math.round(c.ratio * 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.psi && (data.psi.mobile || data.psi.desktop) && (
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2">PageSpeed Insights</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.psi.mobile && <GaugeHalfCircle value={data.psi.mobile.score} label="Mobil Skor" thresholds={{ good: 90, warn: 50 }} />}
            {data.psi.desktop && <GaugeHalfCircle value={data.psi.desktop.score} label="Masaüstü Skor" thresholds={{ good: 90, warn: 50 }} />}
          </div>
        </div>
      )}

      {data.coreWebVitals && (
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2">Core Web Vitals</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <CwvGauges label="Mobil" cwv={data.coreWebVitals.mobile} />
            <CwvGauges label="Masaüstü" cwv={data.coreWebVitals.desktop} />
          </div>
        </div>
      )}

      {data.opportunities && data.opportunities.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2">Fırsatlar (Tahmini Tasarruf)</h4>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <tbody>
                {data.opportunities.map((o) => (
                  <tr key={o.id} className="border-b border-white/5 last:border-0">
                    <td className="p-3 text-white/70">{o.title}</td>
                    <td className="p-3 text-orange-400 text-right">{(o.savingsMs / 1000).toFixed(2)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <CheckRow label="HTTP/2 kullanılıyor" ok={!!data.usesHttp2} />
        <CheckRow label="AMP" ok={data.isAmp ? true : null} detail={data.isAmp ? 'Tespit edildi' : 'Kullanılmıyor'} />
        <CheckRow label="Konsol hatası yok" ok={!data.hasConsoleErrors} />
        <CheckRow label="JS küçültülmüş (minified)" ok={!!data.minified?.js} />
        <CheckRow label="CSS küçültülmüş (minified)" ok={!!data.minified?.css} />
        <CheckRow label="Kullanımdan kaldırılmış HTML yok" ok={!data.deprecatedHtml} />
        <CheckRow label="Satır içi (inline) CSS yok" ok={!data.hasInlineStyles} />
      </div>
    </div>
  );
}

export default PerformanceSection;
