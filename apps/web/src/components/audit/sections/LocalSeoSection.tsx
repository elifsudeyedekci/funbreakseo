'use client';

import { CheckRow } from './CheckRow';

export interface LocalSeoJson {
  found?: boolean;
  schemaType?: string | null;
  name?: string | null;
  address?: string | null;
  telephone?: string | null;
  napConsistency?: { consistent: boolean | null; pageTelephone: string | null };
}

export interface LocalSeoSectionProps {
  data: LocalSeoJson | null;
}

export function LocalSeoSection({ data }: LocalSeoSectionProps) {
  if (!data) {
    return <div className="rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm">Yerel SEO verisi için bir denetim çalıştırın.</div>;
  }

  return (
    <div className="space-y-4">
      <CheckRow
        label="LocalBusiness / Organization Şeması"
        ok={!!data.found}
        detail={data.schemaType ?? undefined}
        info="Yerel işletmeler için Schema.org LocalBusiness işaretlemesi, Google'ın işletme bilgilerinizi doğru yorumlamasını sağlar."
      />
      {data.found && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/2 p-4">
            <p className="text-white/40 text-xs mb-1">İşletme Adı</p>
            <p className="text-white">{data.name ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/2 p-4">
            <p className="text-white/40 text-xs mb-1">Adres</p>
            <p className="text-white">{data.address ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/2 p-4">
            <p className="text-white/40 text-xs mb-1">Telefon</p>
            <p className="text-white">{data.telephone ?? '—'}</p>
          </div>
        </div>
      )}
      <CheckRow
        label="NAP (Ad, Adres, Telefon) Tutarlılığı"
        ok={data.napConsistency?.consistent ?? null}
        detail={data.napConsistency?.consistent === null ? 'Karşılaştırma için şemada telefon bilgisi yok' : undefined}
      />
    </div>
  );
}

export default LocalSeoSection;
