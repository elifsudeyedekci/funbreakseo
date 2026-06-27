'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Download, Plus, FileText, X, Eye, Loader2, BarChart3 } from 'lucide-react';
import { reportsApi } from '@/lib/api';

// ReportRecord from backend: { id, projectId, format, data, createdAt }
interface ReportRecord {
  id: string;
  format: string;
  data: ReportData | null;
  createdAt: string;
}

interface ReportData {
  generatedAt?: string;
  type?: string;
  title?: string;
  project?: { domain?: string; name?: string; organization?: string };
  rankingSummary?: {
    totalKeywords: number;
    averageRank: number;
    inTop10: number;
    firstPagePercentage: number;
    keywords: Array<{ keyword: string; currentRank: number | null; previousRank: number | null; change: number }>;
  } | null;
  technicalSeo?: { healthScore: number; pagesScanned: number; issuesFound: number } | null;
  geoVisibility?: {
    total: number; mentioned: number; cited: number; mentionCount: number; citationCount: number; visibilityRate: number;
  } | null;
  backlinks?: { total: number; newThisWeek: number; recent: Array<{ sourceDomain: string; anchorText?: string | null; domainRating?: number | null }> } | null;
  competitors?: {
    organic: Array<{ domain: string; commonKeywords: number; avgPosition: number | null; visibilityScore: number }>;
    geo: Array<{ domain: string; mentionCount: number; citationCount: number; shareOfVoice: number | null }>;
  } | null;
  recommendations?: Array<{ priority: string; category: string; recommendation: string }>;
}

const REPORT_TYPES: Array<{ key: string; label: string; desc: string }> = [
  { key: 'ALL', label: 'Tümü (Kapsamlı)', desc: 'Tüm alanları içeren tam rapor' },
  { key: 'KEYWORDS', label: 'Anahtar Kelime', desc: 'Sıralamalar ve pozisyon değişimleri' },
  { key: 'TECHNICAL', label: 'Teknik SEO', desc: 'Site sağlığı ve teknik sorunlar' },
  { key: 'BACKLINKS', label: 'Backlink', desc: 'Backlink profili ve referans domainler' },
  { key: 'GEO', label: 'GEO / AI Görünürlük', desc: 'AI aramalarda görünürlük' },
  { key: 'COMPETITORS', label: 'Rakip Analizi', desc: 'Rakip kıyaslaması' },
];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(REPORT_TYPES.map((t) => [t.key, t.label]));

function reportName(r: ReportRecord): string {
  const d = r.data;
  const domain = d?.project?.domain ?? d?.project?.name ?? '';
  const title = d?.title ?? 'SEO Raporu';
  const date = new Date(r.createdAt).toLocaleDateString('tr-TR');
  return `${title}${domain ? ` — ${domain}` : ''} (${date})`;
}

/** Builds a styled, printable HTML document and opens the browser print dialog
 *  (the user can "Save as PDF"). No heavy PDF dependency required. */
function openPrintableReport(data: ReportData, createdAt: string) {
  const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
  const date = new Date(createdAt).toLocaleString('tr-TR');
  const sections: string[] = [];

  if (data.rankingSummary) {
    const rs = data.rankingSummary;
    sections.push(`
      <h2>Anahtar Kelime Performansı</h2>
      <div class="cards">
        <div class="card"><div class="num">${rs.totalKeywords}</div><div class="lbl">Toplam Kelime</div></div>
        <div class="card"><div class="num">${rs.averageRank}</div><div class="lbl">Ortalama Pozisyon</div></div>
        <div class="card"><div class="num">${rs.inTop10}</div><div class="lbl">İlk Sayfada</div></div>
        <div class="card"><div class="num">%${rs.firstPagePercentage}</div><div class="lbl">İlk Sayfa Oranı</div></div>
      </div>
      <table><thead><tr><th>Kelime</th><th>Pozisyon</th><th>Önceki</th><th>Değişim</th></tr></thead><tbody>
      ${rs.keywords.slice(0, 50).map((k) => `<tr><td>${esc(k.keyword)}</td><td>${k.currentRank ?? '—'}</td><td>${k.previousRank ?? '—'}</td><td>${k.change > 0 ? '▲ ' + k.change : k.change < 0 ? '▼ ' + Math.abs(k.change) : '—'}</td></tr>`).join('')}
      </tbody></table>`);
  }
  if (data.technicalSeo) {
    const ts = data.technicalSeo;
    sections.push(`
      <h2>Teknik SEO</h2>
      <div class="cards">
        <div class="card"><div class="num">${ts.healthScore}</div><div class="lbl">Sağlık Skoru</div></div>
        <div class="card"><div class="num">${ts.pagesScanned}</div><div class="lbl">Taranan Sayfa</div></div>
        <div class="card"><div class="num">${ts.issuesFound}</div><div class="lbl">Bulunan Sorun</div></div>
      </div>`);
  }
  if (data.geoVisibility) {
    const g = data.geoVisibility;
    sections.push(`
      <h2>GEO / AI Görünürlük</h2>
      <div class="cards">
        <div class="card"><div class="num">${g.mentionCount}</div><div class="lbl">AI'da Bahsedilme</div></div>
        <div class="card"><div class="num">${g.citationCount}</div><div class="lbl">Kaynak Gösterilme</div></div>
        <div class="card"><div class="num">%${Math.round(g.visibilityRate)}</div><div class="lbl">Görünürlük Oranı</div></div>
      </div>`);
  }
  if (data.backlinks) {
    const b = data.backlinks;
    sections.push(`
      <h2>Backlink Profili</h2>
      <div class="cards">
        <div class="card"><div class="num">${b.total}</div><div class="lbl">Toplam Backlink</div></div>
        <div class="card"><div class="num">${b.newThisWeek}</div><div class="lbl">Bu Hafta Yeni</div></div>
      </div>
      <table><thead><tr><th>Kaynak Domain</th><th>Anchor</th><th>DR</th></tr></thead><tbody>
      ${b.recent.map((x) => `<tr><td>${esc(x.sourceDomain)}</td><td>${esc(x.anchorText ?? '—')}</td><td>${x.domainRating ?? '—'}</td></tr>`).join('')}
      </tbody></table>`);
  }
  if (data.competitors) {
    const c = data.competitors;
    sections.push(`
      <h2>Rakip Analizi</h2>
      <table><thead><tr><th>Rakip Domain</th><th>Ortak Kelime</th><th>Ort. Pozisyon</th><th>Görünürlük</th></tr></thead><tbody>
      ${c.organic.map((x) => `<tr><td>${esc(x.domain)}</td><td>${x.commonKeywords}</td><td>${x.avgPosition?.toFixed?.(1) ?? '—'}</td><td>${x.visibilityScore}</td></tr>`).join('')}
      </tbody></table>`);
  }
  if (data.recommendations && data.recommendations.length > 0) {
    sections.push(`
      <h2>Öneriler</h2>
      ${data.recommendations.map((r) => `<div class="rec rec-${esc(r.priority)}"><strong>[${esc(r.priority)}] ${esc(r.category)}</strong><br>${esc(r.recommendation)}</div>`).join('')}`);
  }

  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(data.title ?? 'SEO Raporu')}</title>
  <style>
    *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a2e;margin:0;padding:40px;background:#fff}
    .head{border-bottom:3px solid #6366f1;padding-bottom:16px;margin-bottom:24px}
    .head h1{margin:0;font-size:24px;color:#1a1a2e} .head .meta{color:#666;font-size:13px;margin-top:6px}
    h2{font-size:16px;color:#6366f1;margin:28px 0 12px;border-left:4px solid #6366f1;padding-left:10px}
    .cards{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px}
    .card{flex:1;min-width:120px;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center;background:#f9fafb}
    .card .num{font-size:26px;font-weight:700;color:#1a1a2e} .card .lbl{font-size:11px;color:#666;margin-top:4px}
    table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px}
    th{text-align:left;background:#f3f4f6;padding:8px;border-bottom:2px solid #e5e7eb;color:#374151}
    td{padding:7px 8px;border-bottom:1px solid #f0f0f0}
    .rec{border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:12px}
    .rec-HIGH{border-left:4px solid #ef4444} .rec-MEDIUM{border-left:4px solid #f59e0b} .rec-LOW{border-left:4px solid #eab308}
    .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;color:#999;font-size:11px;text-align:center}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="head">
    <h1>${esc(data.title ?? 'SEO & GEO Raporu')}</h1>
    <div class="meta">${esc(data.project?.domain ?? '')} ${data.project?.organization ? '· ' + esc(data.project.organization) : ''} · ${esc(date)}</div>
  </div>
  ${sections.join('')}
  <div class="footer">FunBreak SEO tarafından oluşturuldu · ${esc(date)}</div>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

export default function ReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [viewing, setViewing] = useState<ReportRecord | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', projectId],
    queryFn: () =>
      reportsApi.list(projectId).then((r) => {
        const raw = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
        return raw as ReportRecord[];
      }),
  });

  const generateMutation = useMutation({
    mutationFn: (type: string) => reportsApi.generate(projectId, { format: 'PDF', type }),
    onSuccess: () => {
      setShowTypeModal(false);
      refetch();
    },
  });

  const reports = data || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Raporlar</h1>
          <p className="text-sm text-white/40 mt-0.5">Müşteriye sunulabilir, grafikli SEO &amp; GEO raporları</p>
        </div>
        <button onClick={() => setShowTypeModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all">
          <Plus className="h-4 w-4" /> Rapor Üret
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-xl border border-white/10 h-16 animate-pulse" />)}</div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center">
          <FileText className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 mb-4">Henüz rapor yok</p>
          <button onClick={() => setShowTypeModal(true)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-all">
            İlk Raporu Üret
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Rapor Adı', 'Tür', 'Durum', 'Tarih', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-white/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/2">
                  <td className="px-4 py-3 font-medium text-white">{reportName(r)}</td>
                  <td className="px-4 py-3 text-white/50 text-xs">{TYPE_LABEL[r.data?.type ?? ''] ?? r.format}</td>
                  <td className="px-4 py-3 text-xs font-medium text-emerald-400">Hazır</td>
                  <td className="px-4 py-3 text-white/40 text-xs">{new Date(r.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setViewing(r)} title="Görüntüle"
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      {r.data && (
                        <button onClick={() => openPrintableReport(r.data!, r.createdAt)} title="PDF İndir"
                          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Report type selection modal */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111118] p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-white">Hangi raporu üretmek istersiniz?</h2>
              <button onClick={() => setShowTypeModal(false)} className="p-1 text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-white/40 mb-4">Tüm verileri içeren kapsamlı rapor ya da belirli bir alan seçin.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REPORT_TYPES.map((rt) => (
                <button
                  key={rt.key}
                  onClick={() => generateMutation.mutate(rt.key)}
                  disabled={generateMutation.isPending}
                  className="text-left rounded-xl border border-white/10 bg-white/2 p-3 hover:border-indigo-500/40 hover:bg-indigo-500/5 disabled:opacity-50 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm font-semibold text-white">{rt.label}</span>
                  </div>
                  <p className="text-[11px] text-white/40 mt-1">{rt.desc}</p>
                </button>
              ))}
            </div>
            {generateMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-white/50 mt-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Rapor üretiliyor…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report viewer */}
      {viewing && viewing.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#111118] p-6">
            <div className="flex items-center justify-between mb-4 sticky top-0">
              <h2 className="text-base font-semibold text-white">{viewing.data.title ?? 'Rapor'}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => openPrintableReport(viewing.data!, viewing.createdAt)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
                  <Download className="h-3.5 w-3.5" /> PDF İndir
                </button>
                <button onClick={() => setViewing(null)} className="p-1 text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <ReportViewer data={viewing.data} />
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ num, label }: { num: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/2 p-4 text-center">
      <div className="text-2xl font-bold text-white">{num}</div>
      <div className="text-[11px] text-white/40 mt-1">{label}</div>
    </div>
  );
}

function ReportViewer({ data }: { data: ReportData }) {
  return (
    <div className="space-y-6 text-sm">
      {data.rankingSummary && (
        <section>
          <h3 className="text-sm font-semibold text-indigo-300 mb-3">Anahtar Kelime Performansı</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat num={data.rankingSummary.totalKeywords} label="Toplam Kelime" />
            <MiniStat num={data.rankingSummary.averageRank} label="Ort. Pozisyon" />
            <MiniStat num={data.rankingSummary.inTop10} label="İlk Sayfada" />
            <MiniStat num={`%${data.rankingSummary.firstPagePercentage}`} label="İlk Sayfa Oranı" />
          </div>
        </section>
      )}
      {data.technicalSeo && (
        <section>
          <h3 className="text-sm font-semibold text-indigo-300 mb-3">Teknik SEO</h3>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat num={data.technicalSeo.healthScore} label="Sağlık Skoru" />
            <MiniStat num={data.technicalSeo.pagesScanned} label="Taranan Sayfa" />
            <MiniStat num={data.technicalSeo.issuesFound} label="Sorun" />
          </div>
        </section>
      )}
      {data.geoVisibility && (
        <section>
          <h3 className="text-sm font-semibold text-indigo-300 mb-3">GEO / AI Görünürlük</h3>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat num={data.geoVisibility.mentionCount} label="AI'da Bahsedilme" />
            <MiniStat num={data.geoVisibility.citationCount} label="Kaynak Gösterilme" />
            <MiniStat num={`%${Math.round(data.geoVisibility.visibilityRate)}`} label="Görünürlük" />
          </div>
        </section>
      )}
      {data.backlinks && (
        <section>
          <h3 className="text-sm font-semibold text-indigo-300 mb-3">Backlink</h3>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat num={data.backlinks.total} label="Toplam Backlink" />
            <MiniStat num={data.backlinks.newThisWeek} label="Bu Hafta Yeni" />
          </div>
        </section>
      )}
      {data.competitors && data.competitors.organic.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-indigo-300 mb-3">Rakip Analizi</h3>
          <div className="space-y-1.5">
            {data.competitors.organic.slice(0, 8).map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white/3 px-3 py-2">
                <span className="text-white/80">{c.domain}</span>
                <span className="text-xs text-white/40">{c.commonKeywords} ortak kelime · görünürlük {c.visibilityScore}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {data.recommendations && data.recommendations.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-indigo-300 mb-3">Öneriler</h3>
          <div className="space-y-2">
            {data.recommendations.map((r, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/2 p-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  r.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' : r.priority === 'MEDIUM' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>{r.category}</span>
                <p className="text-xs text-white/70 mt-1.5">{r.recommendation}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
