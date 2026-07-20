'use client';

import { Calendar, ShieldCheck, Mail, MailWarning } from 'lucide-react';
import { InfoTooltip } from '../InfoTooltip';

export interface DomainInfoWidgetProps {
  technology: {
    domainAgeYears?: number | null;
    sslExpiryDate?: string | null;
    sslValid?: boolean;
    dmarc?: { found: boolean };
    spf?: { found: boolean };
  } | null;
}

/**
 * Core trust/security signals (domain age, SSL, DMARC, SPF) — shown free to
 * every plan, unlike the full technology-stack list which stays premium.
 */
export function DomainInfoWidget({ technology }: DomainInfoWidgetProps) {
  if (!technology) {
    return null;
  }

  const sslDate = technology.sslExpiryDate ? new Date(technology.sslExpiryDate) : null;
  const sslSoon = sslDate ? sslDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 : false;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-xl border border-white/10 bg-white/2 p-3">
        <div className="flex items-center gap-1.5 text-white/40 text-[11px] mb-1">
          <Calendar className="h-3 w-3" /> Domain Yaşı
        </div>
        <p className="text-sm font-semibold text-white">
          {technology.domainAgeYears != null ? `${technology.domainAgeYears.toFixed(1)} yıl` : 'Bilinmiyor'}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/2 p-3">
        <div className="flex items-center gap-1.5 text-white/40 text-[11px] mb-1">
          <ShieldCheck className="h-3 w-3" /> SSL Durumu
        </div>
        <p className={`text-sm font-semibold ${technology.sslValid ? (sslSoon ? 'text-yellow-400' : 'text-green-400') : 'text-red-400'}`}>
          {technology.sslValid ? (sslDate ? sslDate.toLocaleDateString('tr-TR') : 'Geçerli') : 'Sorunlu'}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/2 p-3">
        <div className="flex items-center gap-1.5 text-white/40 text-[11px] mb-1">
          <Mail className="h-3 w-3" /> DMARC
          <InfoTooltip text="DMARC, e-posta sahtekarlığını (spoofing) önlemeye yardımcı olan bir DNS kaydıdır." />
        </div>
        <p className={`text-sm font-semibold ${technology.dmarc?.found ? 'text-green-400' : 'text-red-400'}`}>
          {technology.dmarc?.found ? 'Var' : 'Yok'}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/2 p-3">
        <div className="flex items-center gap-1.5 text-white/40 text-[11px] mb-1">
          <MailWarning className="h-3 w-3" /> SPF
          <InfoTooltip text="SPF, hangi sunucuların alan adınız adına e-posta gönderebileceğini belirten bir DNS kaydıdır." />
        </div>
        <p className={`text-sm font-semibold ${technology.spf?.found ? 'text-green-400' : 'text-red-400'}`}>
          {technology.spf?.found ? 'Var' : 'Yok'}
        </p>
      </div>
    </div>
  );
}

export default DomainInfoWidget;
