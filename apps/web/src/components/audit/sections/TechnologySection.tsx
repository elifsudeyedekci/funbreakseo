'use client';

import { CheckRow } from './CheckRow';

export interface TechnologyJson {
  technologies?: { category: string; name: string }[];
  serverIp?: string | null;
  nameservers?: string[];
  webServer?: string | null;
  charset?: string | null;
  dmarc?: { found: boolean; record: string | null };
  spf?: { found: boolean; record: string | null };
  domainAgeYears?: number | null;
  sslExpiryDate?: string | null;
  sslValid?: boolean;
}

export interface TechnologySectionProps {
  data: TechnologyJson | null;
}

export function TechnologySection({ data }: TechnologySectionProps) {
  if (!data) {
    return <div className="rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm">Teknoloji verisi için bir denetim çalıştırın.</div>;
  }

  return (
    <div className="space-y-6">
      {data.technologies && data.technologies.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2">Tespit Edilen Teknolojiler</h4>
          <div className="flex flex-wrap gap-2">
            {data.technologies.map((t, i) => (
              <span key={i} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                <span className="text-white/40">{t.category}:</span> {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="rounded-xl border border-white/10 bg-white/2 p-4">
          <p className="text-white/40 text-xs mb-1">Sunucu IP</p>
          <p className="text-white font-mono">{data.serverIp ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/2 p-4">
          <p className="text-white/40 text-xs mb-1">DNS Sunucuları</p>
          <p className="text-white font-mono text-xs">{data.nameservers && data.nameservers.length > 0 ? data.nameservers.join(', ') : '—'}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/2 p-4">
          <p className="text-white/40 text-xs mb-1">Web Sunucusu</p>
          <p className="text-white">{data.webServer ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/2 p-4">
          <p className="text-white/40 text-xs mb-1">Charset</p>
          <p className="text-white">{data.charset ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/2 p-4">
          <p className="text-white/40 text-xs mb-1">Domain Yaşı</p>
          <p className="text-white">{data.domainAgeYears != null ? `${data.domainAgeYears.toFixed(1)} yıl` : 'Bilinmiyor'}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/2 p-4">
          <p className="text-white/40 text-xs mb-1">SSL Sertifikası Bitiş Tarihi</p>
          <p className="text-white">{data.sslExpiryDate ? new Date(data.sslExpiryDate).toLocaleDateString('tr-TR') : 'Bilinmiyor'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <CheckRow
          label="DMARC Kaydı"
          ok={!!data.dmarc?.found}
          detail={data.dmarc?.record ?? undefined}
          info="DMARC, e-posta sahtekarlığını (spoofing) önlemeye yardımcı olan bir DNS kaydıdır."
        />
        <CheckRow
          label="SPF Kaydı"
          ok={!!data.spf?.found}
          detail={data.spf?.record ?? undefined}
          info="SPF, hangi sunucuların alan adınız adına e-posta gönderebileceğini belirten bir DNS kaydıdır."
        />
        <CheckRow label="SSL Geçerli" ok={!!data.sslValid} />
      </div>
    </div>
  );
}

export default TechnologySection;
