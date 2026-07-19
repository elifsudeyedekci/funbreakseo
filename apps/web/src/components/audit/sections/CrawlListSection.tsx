'use client';

export interface CrawlListJson {
  urls?: string[];
  brokenLinks?: { url: string; statusCode: number }[];
  redirectChains?: { url: string; hops: number }[];
  orphanPages?: string[];
}

export interface CrawledPageRow {
  id: string;
  url: string;
  statusCode: number | null;
  _count?: { issues: number };
}

export interface CrawlListSectionProps {
  data: CrawlListJson | null;
  pages?: CrawledPageRow[];
}

function UrlTable({ rows, empty }: { rows: { url: string; extra?: string }[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-white/30 py-3">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 max-h-72 overflow-y-auto">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0">
              <td className="p-3 text-white/70 truncate max-w-md">{r.url}</td>
              {r.extra && <td className="p-3 text-white/40 text-right whitespace-nowrap">{r.extra}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CrawlListSection({ data, pages }: CrawlListSectionProps) {
  if (!data && !pages) {
    return <div className="rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm">Alt sayfa listesi için bir denetim çalıştırın.</div>;
  }

  return (
    <div className="space-y-6">
      {pages && pages.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2">Taranan Sayfalar ({pages.length})</h4>
          <UrlTable
            rows={pages.map((p) => ({ url: p.url, extra: `${p.statusCode ?? '—'} · ${p._count?.issues ?? 0} sorun` }))}
            empty="Taranan sayfa yok."
          />
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-red-400 mb-2">Bozuk Bağlantılar (404/hata)</h4>
        <UrlTable rows={(data?.brokenLinks ?? []).map((b) => ({ url: b.url, extra: String(b.statusCode) }))} empty="Bozuk bağlantı bulunamadı." />
      </div>

      <div>
        <h4 className="text-sm font-semibold text-yellow-400 mb-2">Yönlendirme Zincirleri</h4>
        <UrlTable rows={(data?.redirectChains ?? []).map((r) => ({ url: r.url, extra: `${r.hops} adım` }))} empty="Yönlendirme zinciri bulunamadı." />
      </div>

      <div>
        <h4 className="text-sm font-semibold text-orange-400 mb-2">Orphan Sayfalar (iç bağlantısız)</h4>
        <UrlTable rows={(data?.orphanPages ?? []).map((u) => ({ url: u }))} empty="Orphan sayfa bulunamadı." />
      </div>
    </div>
  );
}

export default CrawlListSection;
