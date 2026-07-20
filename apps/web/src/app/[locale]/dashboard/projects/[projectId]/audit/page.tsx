'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Play, RefreshCw, Download, Printer, Lock } from 'lucide-react';
import { api, auditApi, geoAuditApi, crawlerApi, projectApi } from '@/lib/api';
import { exportToCSV } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { DEFAULT_PLAN_LIMITS } from '@funbreakseo/shared';
import { ActionPlanPanel } from '@/components/dashboard/ActionPlanPanel';
import {
  LetterGradeRing,
  CategoryRingRow,
  AuditRadarChart,
  PriorityRecommendationList,
  DeviceScreenshotFrame,
  type CategoryRingItem,
} from '@/components/audit';
import {
  OnPageSection,
  GeoSection,
  BacklinkSummarySection,
  PerformanceSection,
  UsabilitySection,
  SocialSection,
  TechnologySection,
  LocalSeoSection,
  CrawlListSection,
  CompetitorCompareSection,
  DomainInfoWidget,
} from '@/components/audit/sections';

const RUNNING_MESSAGES = [
  'Sayfalar taranıyor...',
  'Sayfa içi SEO kontrol ediliyor...',
  'GEO / AI görünürlüğü analiz ediliyor...',
  'Performans ölçülüyor (PageSpeed Insights)...',
  'Kullanılabilirlik ve cihaz görünümleri hazırlanıyor...',
  'Sosyal medya ve teknoloji tespiti yapılıyor...',
  'Sonuçlar bir araya getiriliyor...',
];

async function downloadSiteAuditPdf(projectId: string, domain: string, setBusy: (v: boolean) => void) {
  setBusy(true);
  try {
    const res = await api.get(`/projects/${projectId}/reports/site-audit-pdf`, { responseType: 'blob', timeout: 120000 });
    const contentType = (res.headers['content-type'] as string) ?? 'application/pdf';
    const blob = new Blob([res.data], { type: contentType });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    const base = `site-denetimi-${domain || 'rapor'}`;
    a.download = contentType.includes('pdf') ? `${base}.pdf` : `${base}.html`;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } finally {
    setBusy(false);
  }
}

interface CategoryScoreShape {
  score: number;
  grade: string;
}

interface SiteAuditReportShape {
  id: string;
  overallScore: number;
  overallGrade: string;
  categoryScores: {
    onPage: CategoryScoreShape;
    geo: CategoryScoreShape;
    backlink: CategoryScoreShape;
    usability: CategoryScoreShape;
    performance: CategoryScoreShape;
  } | null;
  recommendationsCount: number;
  recommendations: any[];
  onPageJson: any;
  geoJson: any;
  performanceJson: any;
  usabilityJson: any;
  socialJson: any;
  technologyJson: any;
  localSeoJson: any;
  crawlListJson: any;
  screenshotDesktopUrl: string | null;
  screenshotMobileUrl: string | null;
  screenshotTabletUrl: string | null;
  updatedAt: string;
}

interface AuditData {
  id: string;
  healthScore: number;
  crawledPages: number;
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  noticeCount: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'DONE' | 'FAILED';
  completedAt?: string;
  pagesScanned?: number;
  totalPagesQueued?: number | null;
  siteAuditReport: SiteAuditReportShape | null;
}

const CATEGORY_LABELS: Record<'onPage' | 'geo' | 'backlink' | 'usability' | 'performance', string> = {
  onPage: 'Sayfa İçi SEO',
  geo: 'GEO / AI',
  backlink: 'Backlink',
  usability: 'Kullanılabilirlik',
  performance: 'Performans',
};

/** Always-open section — no "Detayları Göster" click required. */
function Section({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/2 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function PremiumLock({ children, unlocked, feature }: { children: React.ReactNode; unlocked: boolean; feature: string }) {
  if (unlocked) return <>{children}</>;
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-30 blur-[2px] max-h-56 overflow-hidden">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
        <Lock className="h-6 w-6 text-white/50" />
        <p className="text-sm text-white/70">{feature} — daha yüksek bir pakette açılır</p>
        <a href="../../billing" className="text-xs text-indigo-400 hover:text-indigo-300 underline">
          Paketleri Görüntüle
        </a>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslations('auditPage');
  const { subscription } = useAuthStore();
  const planSlug = (subscription?.plan?.slug ?? 'starter') as keyof typeof DEFAULT_PLAN_LIMITS;
  const isPremium = DEFAULT_PLAN_LIMITS[planSlug]?.fullAuditReport ?? false;

  const [msgIndex, setMsgIndex] = useState(0);
  const [pdfBusy, setPdfBusy] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit', projectId],
    queryFn: () => auditApi.get(projectId).then((r) => (r.data ?? null) as AuditData | null),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'RUNNING' || status === 'PENDING' ? 4000 : false;
    },
  });

  const audit = data;
  const isRunning = audit?.status === 'RUNNING' || audit?.status === 'PENDING';
  const report = audit?.siteAuditReport ?? null;

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % RUNNING_MESSAGES.length), 3500);
    return () => clearInterval(id);
  }, [isRunning]);

  const crawlMutation = useMutation({
    mutationFn: () => auditApi.start(projectId),
    onSuccess: () => refetch(),
  });

  const { data: aiOverview } = useQuery({
    queryKey: ['geo-ai-overview', projectId],
    queryFn: () => geoAuditApi.aiOverviewTracking(projectId).then((r) => r.data as { keyword: string; hasAiOverview: boolean; cited: boolean }[]),
    enabled: !!projectId && !isRunning && isPremium,
    staleTime: 5 * 60_000,
  });

  const { data: pages } = useQuery({
    queryKey: ['crawl-pages', audit?.id],
    queryFn: () => crawlerApi.pages(audit!.id).then((r) => r.data),
    enabled: !!audit?.id && !isRunning,
    staleTime: 5 * 60_000,
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId).then((r) => r.data as { domain: string }),
    staleTime: 5 * 60_000,
  });

  const categoryRings: CategoryRingItem[] = useMemo(() => {
    if (!report?.categoryScores) return [];
    return (Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      score: report.categoryScores![key]?.score ?? 0,
      grade: report.categoryScores![key]?.grade ?? '—',
    }));
  }, [report]);

  const radarSeries = useMemo(() => {
    if (!report?.categoryScores) return [];
    return [
      {
        name: 'Skorunuz',
        color: '#3987e5',
        data: (Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((key) => ({
          category: CATEGORY_LABELS[key],
          score: report.categoryScores![key]?.score ?? 0,
        })),
      },
    ];
  }, [report]);

  return (
    <div className="p-6 space-y-6 print:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {t('title')}
            {project?.domain && <span className="text-indigo-400"> — {project.domain}</span>}
          </h1>
          <p className="text-white/50 text-sm mt-1">
            {report?.updatedAt
              ? `Rapor oluşturulma: ${new Date(report.updatedAt).toLocaleString('tr-TR')}`
              : audit?.completedAt
                ? t('lastScan', { date: new Date(audit.completedAt).toLocaleString() })
                : t('noScan')}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {report && report.recommendations?.length > 0 && (
            <button
              onClick={() =>
                exportToCSV(
                  report.recommendations.map((r: any) => ({
                    priority: r.priority,
                    category: r.category,
                    title: r.title,
                    howToFix: r.howToFix,
                    affectedCount: r.affectedCount ?? '',
                  })),
                  [
                    { key: 'priority', label: 'Öncelik' },
                    { key: 'category', label: 'Kategori' },
                    { key: 'title', label: 'Öneri' },
                    { key: 'howToFix', label: 'Nasıl düzeltilir?' },
                    { key: 'affectedCount', label: 'Etkilenen Sayfa' },
                  ],
                  'site-audit-oneriler.csv'
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 transition-all"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
          )}
          <button
            onClick={() => downloadSiteAuditPdf(projectId, project?.domain ?? '', setPdfBusy)}
            disabled={pdfBusy || !report}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 disabled:opacity-50 transition-all"
          >
            {pdfBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            {pdfBusy ? 'Hazırlanıyor…' : 'PDF Olarak İndir'}
          </button>
          <button
            onClick={() => crawlMutation.mutate()}
            disabled={isRunning || crawlMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all"
          >
            {isRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {isRunning ? t('scanning') : t('startScan')}
          </button>
        </div>
      </div>

      {isRunning && (() => {
        // Real progress while pages are being crawled (weighted to 75% of the
        // bar); the remaining 25% covers the post-crawl analysis phase
        // (performance/site-intel/GEO) which has no page-count signal, so it
        // holds near the top instead of faking a number.
        const total = audit?.totalPagesQueued;
        const scanned = audit?.pagesScanned ?? 0;
        const pagePercent = total ? Math.min(100, Math.round((scanned / total) * 100)) : 0;
        const displayPercent = total ? Math.min(95, Math.round(pagePercent * 0.75)) : null;
        return (
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 print:hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" />
                <span className="text-sm text-white/80">{RUNNING_MESSAGES[msgIndex]}</span>
              </div>
              {displayPercent != null && <span className="text-sm font-bold text-indigo-300">%{displayPercent}</span>}
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              {displayPercent != null ? (
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${displayPercent}%` }} />
              ) : (
                <div className="h-full w-1/3 bg-indigo-500 rounded-full" style={{ animation: 'audit-progress 2.5s ease-in-out infinite' }} />
              )}
            </div>
            {total ? (
              <p className="text-xs text-white/30 mt-1.5">{scanned}/{total} sayfa tarandı</p>
            ) : null}
            <style>{`@keyframes audit-progress { 0% { transform: translateX(-100%); } 50% { transform: translateX(60%); } 100% { transform: translateX(220%); } }`}</style>
          </div>
        );
      })()}

      {!isRunning && audit && !report && (
        <div className="rounded-2xl border border-white/10 bg-white/2 p-6 text-center text-white/40 text-sm">
          Tam denetim raporu hazırlanıyor, birkaç dakika içinde burada görünecek.
        </div>
      )}

      {isLoading && !audit && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 h-16 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && !audit && (
        <div className="rounded-2xl border border-white/10 p-10 text-center text-white/30">{t('startScanPrompt')}</div>
      )}

      {report && !isRunning && (
        <>
          {/* ── Genel skor & vizualizasyon ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/2 p-6 flex items-center justify-center">
              <LetterGradeRing score={report.overallScore} grade={report.overallGrade} label="Genel Sağlık Skoru" />
            </div>
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/2 p-5 space-y-4">
              <CategoryRingRow categories={categoryRings} />
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
                <span className="rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-semibold px-3 py-1">
                  Öneriler: {report.recommendationsCount}
                </span>
                <span className="text-xs text-white/30">{audit?.crawledPages ?? 0} sayfa tarandı</span>
              </div>
            </div>
          </div>

          {/* Temel güven sinyalleri — tüm paketlerde açık (tam teknoloji
              listesi aşağıdaki premium "Teknoloji" bölümünde). */}
          {report.technologyJson && (
            <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
              <h3 className="text-sm font-semibold text-white/70 mb-3">Domain Bilgileri</h3>
              <DomainInfoWidget technology={report.technologyJson} />
            </div>
          )}

          {(report.screenshotDesktopUrl || report.screenshotMobileUrl) && (
            <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
              <h3 className="text-sm font-semibold text-white/70 mb-3">Site Görünümü</h3>
              <DeviceScreenshotFrame desktop={report.screenshotDesktopUrl} mobile={report.screenshotMobileUrl} />
            </div>
          )}

          {/* ── Radar ────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Kategori Karşılaştırması</h3>
            <AuditRadarChart series={radarSeries} />
          </div>

          {/* ── Öncelikli öneriler ──────────────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Öncelikli Öneriler</h3>
            <PriorityRecommendationList items={report.recommendations ?? []} initialVisibleCount={5} />
          </div>

          {/* ── Modüller — hepsi varsayılan açık, accordion yok ───────── */}
          <div className="space-y-3">
            <Section title="Sayfa İçi SEO">
              <OnPageSection data={report.onPageJson} />
            </Section>

            <Section title="GEO / AI Görünürlük">
              <GeoSection data={report.geoJson} aiOverviewTracking={isPremium ? aiOverview : undefined} />
            </Section>

            <Section title="Backlink Özeti">
              <BacklinkSummarySection projectId={projectId} />
            </Section>

            <Section title="Performans">
              <PerformanceSection data={report.performanceJson} />
            </Section>

            <Section title="Kullanılabilirlik / Cihaz Görünümleri">
              <PremiumLock unlocked={isPremium} feature="Cihaz görünümleri">
                <UsabilitySection
                  data={report.usabilityJson}
                  screenshots={{ desktop: report.screenshotDesktopUrl, mobile: report.screenshotMobileUrl, tablet: report.screenshotTabletUrl }}
                />
              </PremiumLock>
            </Section>

            <Section title="Sosyal Medya">
              <SocialSection data={report.socialJson} />
            </Section>

            <Section title="Teknoloji">
              <PremiumLock unlocked={isPremium} feature="Teknoloji tespiti">
                <TechnologySection data={report.technologyJson} />
              </PremiumLock>
            </Section>

            <Section title="Yerel SEO">
              <LocalSeoSection data={report.localSeoJson} />
            </Section>

            <Section title="Alt Sayfalar / Crawl Listesi">
              <PremiumLock unlocked={isPremium} feature="Alt sayfa listesi">
                <CrawlListSection data={report.crawlListJson} pages={pages} />
              </PremiumLock>
            </Section>

            <Section title="Rakiple Karşılaştır" badge={<span className="text-[10px] text-indigo-300 bg-indigo-500/15 rounded-full px-2 py-0.5">Yeni</span>}>
              <PremiumLock unlocked={isPremium} feature="Rakip karşılaştırma">
                <CompetitorCompareSection
                  projectId={projectId}
                  projectDomain={project?.domain ?? ''}
                  ownCategoryScores={report.categoryScores}
                />
              </PremiumLock>
            </Section>
          </div>

          {/* ── Aksiyon Planı — en altta ───────────────────────────────── */}
          <ActionPlanPanel projectId={projectId} />
        </>
      )}
    </div>
  );
}
