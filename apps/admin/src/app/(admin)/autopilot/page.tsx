'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/DataTable';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { BarChart } from '@/components/charts/BarChart';
import { type ColumnDef } from '@tanstack/react-table';
import { Play, Search, RefreshCw, Save } from 'lucide-react';

const LOCALES = ['tr', 'en', 'de', 'fr', 'es', 'ar', 'ru', 'hi'];

interface AutopilotSettings {
  isEnabled: boolean;
  activeLocales: string[];
  weeklyTargetPerLocale: number;
  publishMode: 'AUTO' | 'SEMI_AUTO';
  minSeoScore: number;
  minGeoScore: number;
  nicheTopics: string[];
  monthlyBudget: number;
}

interface QueueItem {
  id: string;
  keyword: string;
  locale: string;
  status: string;
  seoScore?: number;
  geoScore?: number;
  scheduledAt?: string;
  publishedAt?: string;
}

const ZERO_SETTINGS: AutopilotSettings = {
  isEnabled: false,
  activeLocales: [],
  weeklyTargetPerLocale: 0,
  publishMode: 'SEMI_AUTO',
  minSeoScore: 0,
  minGeoScore: 0,
  nicheTopics: [],
  monthlyBudget: 0,
};

/** API'nin ham settings satırını UI şekline çevir */
function mapSettings(raw: Record<string, unknown> | null | undefined): AutopilotSettings {
  if (!raw) return ZERO_SETTINGS;
  const perLocale = raw.weeklyTargetPerLocale as Record<string, number> | number | null;
  const weekly =
    typeof perLocale === 'number'
      ? perLocale
      : perLocale && typeof perLocale === 'object'
        ? (Object.values(perLocale)[0] ?? 0)
        : Number(raw.weeklyTarget ?? 0);
  return {
    isEnabled: Boolean(raw.isEnabled ?? raw.isActive),
    activeLocales: (raw.enabledLocales as string[]) ?? (raw.locales as string[]) ?? [],
    weeklyTargetPerLocale: weekly,
    publishMode: ((raw.publishMode as string) === 'AUTO' ? 'AUTO' : 'SEMI_AUTO'),
    minSeoScore: Number(raw.minSeoScore ?? 0),
    minGeoScore: Number(raw.minGeoScore ?? 0),
    nicheTopics: (raw.nicheTopics as string[]) ?? (raw.nichKeywords as string[]) ?? [],
    monthlyBudget: Number(raw.monthlyBudgetUsd ?? raw.monthlyBudget ?? 0),
  };
}

/** API dashboard yanıtını (thisMonth/produced) UI istatistik şekline çevir */
function mapStats(raw: Record<string, unknown> | null | undefined): typeof ZERO_STATS {
  if (!raw) return ZERO_STATS;
  const thisMonth = (raw.thisMonth as Array<{ locale: string; produced?: number; published?: number; queued?: number }>) ?? [];
  return {
    generatedThisMonth: thisMonth.map((x) => ({
      locale: x.locale ?? '?',
      generated: x.produced ?? 0,
      published: x.published ?? 0,
    })),
    discoveredKeywords: Number(raw.discoveredKeywords ?? 0),
    rankingContentPct: Number(raw.rankingContentPct ?? 0),
    lowPerformers:
      (raw.lowPerformers as Array<{ id: string; keyword: string; locale: string; avgPosition: number }>) ??
      (raw.performanceAlerts && Array.isArray(raw.performanceAlerts) ? (raw.performanceAlerts as typeof ZERO_STATS.lowPerformers) : []),
  };
}

const ZERO_STATS = {
  generatedThisMonth: [] as { locale: string; generated: number; published: number }[],
  discoveredKeywords: 0,
  rankingContentPct: 0,
  lowPerformers: [] as { id: string; keyword: string; locale: string; avgPosition: number }[],
};

export default function AutopilotPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [settings, setSettings] = useState<AutopilotSettings>(ZERO_SETTINGS);
  const [editMode, setEditMode] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-autopilot'],
    queryFn: async () => {
      try {
        const [settingsRes, dashRes, queueRes] = await Promise.all([
          adminApi.get('/admin/autopilot/settings'),
          adminApi.get('/admin/autopilot/dashboard'),
          adminApi.get('/admin/autopilot/queue'),
        ]);
        const rawQueue = queueRes.data;
        const queue = Array.isArray(rawQueue) ? rawQueue : (rawQueue?.data ?? rawQueue?.items ?? []);
        return {
          settings: mapSettings(settingsRes.data?.data ?? settingsRes.data),
          stats: mapStats(dashRes.data?.data ?? dashRes.data),
          queue: Array.isArray(queue) ? queue : [],
        };
      } catch { return { settings: ZERO_SETTINGS, queue: [], stats: ZERO_STATS }; }
    },
  });

  // Sunucudan gelen ayarları forma yükle (eskiden hep boş görünüyordu)
  useEffect(() => {
    if (data?.settings) setSettings(data.settings);
  }, [data?.settings]);

  const updateMutation = useMutation({
    // UI şeklini backend DTO'suna çevir (locales, weeklyTarget, isEnabled...)
    mutationFn: (s: AutopilotSettings) =>
      adminApi.patch('/admin/autopilot/settings', {
        isEnabled: s.isEnabled,
        publishMode: s.publishMode,
        weeklyTarget: s.weeklyTargetPerLocale,
        minSeoScore: s.minSeoScore,
        minGeoScore: s.minGeoScore,
        locales: s.activeLocales,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-autopilot'] }); toast('Ayarlar kaydedildi', 'success'); setEditMode(false); },
    onError: () => toast('Güncelleme başarısız', 'error'),
  });

  const runMutation = useMutation({
    mutationFn: () => adminApi.post('/admin/autopilot/run'),
    onSuccess: () => toast('Autopilot çalıştırıldı', 'success'),
    onError: () => toast('Çalıştırma başarısız', 'error'),
  });

  const discoverMutation = useMutation({
    mutationFn: () => adminApi.post('/admin/autopilot/discover?locale=tr'),
    onSuccess: () => toast('Kelime keşfi başlatıldı', 'success'),
    onError: () => toast('Kelime keşfi başlatılamadı', 'error'),
  });

  const d = data ?? { settings: ZERO_SETTINGS, queue: [], stats: ZERO_STATS };
  const queueData = (d.queue ?? []) as QueueItem[];
  const stats = (d.stats ?? ZERO_STATS) as typeof ZERO_STATS;

  if (isLoading) return <PageSpinner />;

  const queueCols: ColumnDef<QueueItem>[] = [
    { header: 'Kelime', accessorKey: 'keyword', cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
    { header: 'Dil', accessorKey: 'locale', cell: ({ getValue }) => <Badge variant="default">{((getValue() as string) ?? '?').toUpperCase()}</Badge> },
    { header: 'Durum', accessorKey: 'status', cell: ({ getValue }) => {
      const s = getValue() as string;
      const v = s === 'PUBLISHED' ? 'success' : s === 'REVIEW' ? 'warning' : s === 'GENERATING' ? 'info' : 'default';
      return <Badge variant={v as 'success' | 'warning' | 'info' | 'default'}>{s}</Badge>;
    }},
    { header: 'SEO', accessorKey: 'seoScore', cell: ({ getValue }) => {
      const v = getValue() as number | undefined;
      return v ? <span className="font-bold text-emerald-400">{v}</span> : <span className="text-[var(--text-muted)]">—</span>;
    }},
    { header: 'GEO', accessorKey: 'geoScore', cell: ({ getValue }) => {
      const v = getValue() as number | undefined;
      return v ? <span className="font-bold text-purple-400">{v}</span> : <span className="text-[var(--text-muted)]">—</span>;
    }},
    { header: 'Planlanan', accessorKey: 'scheduledAt', cell: ({ getValue }) => {
      const v = getValue() as string | undefined;
      return v ? <span className="text-xs text-[var(--text-muted)]">{new Date(v).toLocaleDateString('tr-TR')}</span> : '—';
    }},
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Autopilot Kontrol Merkezi</h1>
          <p>Otomatik içerik üretim ve yayın sistemi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Search className="w-4 h-4" />} loading={discoverMutation.isPending}
            onClick={() => discoverMutation.mutate()}>
            Kelime Keşfi
          </Button>
          <Button variant="primary" icon={<Play className="w-4 h-4" />} loading={runMutation.isPending}
            onClick={() => runMutation.mutate()}>
            Manuel Çalıştır
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Ayarlar</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="queue">Üretim Kuyruğu</TabsTrigger>
          <TabsTrigger value="low-perf">Düşük Performans</TabsTrigger>
        </TabsList>

        {/* SETTINGS */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Autopilot Ayarları
                {!editMode && <Button size="sm" variant="secondary" onClick={() => setEditMode(true)}>Düzenle</Button>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <div className="space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.isEnabled}
                      onChange={(e) => setSettings((p) => ({ ...p, isEnabled: e.target.checked }))}
                      className="accent-emerald-500 w-4 h-4"
                    />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      Autopilot Aktif (kapalıysa sistem hiç içerik üretmez)
                    </span>
                  </label>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Aktif Diller</p>
                    <div className="flex flex-wrap gap-2">
                      {LOCALES.map((l) => (
                        <label key={l} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={settings.activeLocales.includes(l)}
                            onChange={(e) => {
                              setSettings((p) => ({
                                ...p,
                                activeLocales: e.target.checked ? [...p.activeLocales, l] : p.activeLocales.filter((x) => x !== l),
                              }));
                            }}
                            className="accent-indigo-500" />
                          <span className="text-sm text-[var(--text-primary)] uppercase">{l}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Haftalık Hedef (dil başına)" type="number" value={settings.weeklyTargetPerLocale}
                      onChange={(e) => setSettings((p) => ({ ...p, weeklyTargetPerLocale: Number(e.target.value) }))} />
                    <Select label="Yayın Modu" options={[{ value: 'AUTO', label: 'Otomatik' }, { value: 'SEMI_AUTO', label: 'Yarı Otomatik' }]}
                      value={settings.publishMode}
                      onChange={(e) => setSettings((p) => ({ ...p, publishMode: e.target.value as 'AUTO' | 'SEMI_AUTO' }))} />
                    <Input label="Min SEO Skoru" type="number" value={settings.minSeoScore}
                      onChange={(e) => setSettings((p) => ({ ...p, minSeoScore: Number(e.target.value) }))} />
                    <Input label="Min GEO Skoru" type="number" value={settings.minGeoScore}
                      onChange={(e) => setSettings((p) => ({ ...p, minGeoScore: Number(e.target.value) }))} />
                    <Input label="Aylık Bütçe Limiti ($)" type="number" value={settings.monthlyBudget}
                      onChange={(e) => setSettings((p) => ({ ...p, monthlyBudget: Number(e.target.value) }))} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" icon={<Save className="w-4 h-4" />} loading={updateMutation.isPending}
                      onClick={() => updateMutation.mutate(settings)}>
                      Kaydet
                    </Button>
                    <Button variant="ghost" onClick={() => setEditMode(false)}>İptal</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-[var(--text-muted)]">Durum</p>
                    <Badge variant={settings.isEnabled ? 'success' : 'danger'}>{settings.isEnabled ? 'AKTİF' : 'KAPALI'}</Badge></div>
                  <div><p className="text-[var(--text-muted)]">Aktif Diller</p>
                    <div className="flex gap-1 mt-1 flex-wrap">{settings.activeLocales.map((l) => <Badge key={l} variant="info">{l.toUpperCase()}</Badge>)}</div></div>
                  <div><p className="text-[var(--text-muted)]">Haftalık Hedef</p><p className="font-medium">{settings.weeklyTargetPerLocale} / dil</p></div>
                  <div><p className="text-[var(--text-muted)]">Yayın Modu</p><Badge variant={settings.publishMode === 'AUTO' ? 'success' : 'warning'}>{settings.publishMode}</Badge></div>
                  <div><p className="text-[var(--text-muted)]">Min Skorlar</p><p className="font-medium">SEO: {settings.minSeoScore} · GEO: {settings.minGeoScore}</p></div>
                  <div><p className="text-[var(--text-muted)]">Aylık Bütçe</p><p className="font-medium">${settings.monthlyBudget}</p></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DASHBOARD */}
        <TabsContent value="dashboard">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-indigo-400">{stats.discoveredKeywords}</p>
                <p className="text-xs text-[var(--text-muted)]">Keşfedilen Kelime</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{stats.rankingContentPct}%</p>
                <p className="text-xs text-[var(--text-muted)]">Sıralanan İçerik</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{queueData.filter((q) => q.status === 'PENDING').length}</p>
                <p className="text-xs text-[var(--text-muted)]">Kuyrukta Bekleyen</p>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Bu Ay Üretilen / Yayınlanan (Dil Bazlı)</CardTitle></CardHeader>
              <CardContent>
                <BarChart
                  data={stats.generatedThisMonth}
                  bars={[
                    { key: 'generated', color: '#6366f1', label: 'Üretilen' },
                    { key: 'published', color: '#10b981', label: 'Yayınlanan' },
                  ]}
                  xKey="locale"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* QUEUE */}
        <TabsContent value="queue">
          <DataTable columns={queueCols} data={queueData} searchPlaceholder="Kelime, dil ara..." emptyMessage="Kuyruk boş." />
        </TabsContent>

        {/* LOW PERFORMERS */}
        <TabsContent value="low-perf">
          <Card>
            <CardHeader><CardTitle>Düşük Performanslı İçerikler</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.lowPerformers.map((lp) => (
                  <div key={lp.id} className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{lp.keyword}</p>
                      <Badge variant="default">{lp.locale.toUpperCase()}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-red-400">Ort. Pozisyon: {lp.avgPosition}</span>
                      <Button size="xs" variant="secondary" icon={<RefreshCw className="w-3 h-3" />}>Yenile</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
