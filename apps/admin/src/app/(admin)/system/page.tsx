'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { RefreshCw, Trash2, Eye, EyeOff, Save } from 'lucide-react';

interface Queue { name: string; waiting: number; active: number; completed: number; failed: number; }
interface SystemSetting { key: string; value: string; type: string; isEncrypted: boolean; description?: string; }
interface ApiUsageRow { provider: string; customer?: string; callCount: number; cost: number; month: string; }
interface AuditRow { id: string; action: string; actorEmail: string; targetType?: string; targetId?: string; createdAt: string; }

const MOCK_QUEUES: Queue[] = [
  { name: 'content-generation', waiting: 5, active: 2, completed: 1243, failed: 3 },
  { name: 'serp-tracking', waiting: 12, active: 4, completed: 8923, failed: 1 },
  { name: 'geo-visibility', waiting: 2, active: 1, completed: 3421, failed: 0 },
  { name: 'outreach-email', waiting: 8, active: 1, completed: 567, failed: 4 },
  { name: 'autopilot', waiting: 3, active: 1, completed: 234, failed: 0 },
  { name: 'invoice-sync', waiting: 1, active: 0, completed: 892, failed: 2 },
];

const MOCK_SETTINGS: SystemSetting[] = [
  { key: 'DATAFORSEO_API_KEY', value: '****encrypted****', type: 'STRING', isEncrypted: true, description: 'DataForSEO API anahtarı' },
  { key: 'OPENAI_API_KEY', value: '****encrypted****', type: 'STRING', isEncrypted: true, description: 'OpenAI API anahtarı' },
  { key: 'VAT_RATE', value: '0.20', type: 'NUMBER', isEncrypted: false, description: 'KDV oranı (0-1 arası)' },
  { key: 'MAINTENANCE_MODE', value: 'false', type: 'BOOLEAN', isEncrypted: false, description: 'Bakım modu' },
  { key: 'SMTP_FROM_EMAIL', value: 'noreply@funbreakseo.com', type: 'STRING', isEncrypted: false },
];

const MOCK_API_USAGE: ApiUsageRow[] = [
  { provider: 'DataForSEO', callCount: 8234, cost: 820.5, month: '2026-06' },
  { provider: 'OpenAI', callCount: 1234, cost: 640.0, month: '2026-06' },
  { provider: 'Anthropic', callCount: 456, cost: 380.2, month: '2026-06' },
  { provider: 'DataForSEO', customer: 'Müşteri 1', callCount: 234, cost: 23.4, month: '2026-06' },
  { provider: 'OpenAI', customer: 'Müşteri 2', callCount: 156, cost: 80.1, month: '2026-06' },
];

const MOCK_AUDIT: AuditRow[] = Array.from({ length: 20 }, (_, i) => ({
  id: `audit-${i}`,
  action: ['ADMIN_PLAN_CHANGE', 'ADMIN_REFUND', 'ADMIN_CREDIT_ADD', 'ADMIN_SUSPEND', 'SYSTEM_SETTING_UPDATE'][i % 5],
  actorEmail: i % 3 === 0 ? 'super@funbreakseo.com' : 'admin@funbreakseo.com',
  targetType: ['CUSTOMER', 'SUBSCRIPTION', 'INVOICE'][i % 3],
  targetId: `target-${i}`,
  createdAt: new Date(Date.now() - i * 3600000 * 4).toISOString(),
}));

export default function SystemPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: queues = MOCK_QUEUES } = useQuery({
    queryKey: ['admin-queues'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/queue-health'); return r.data?.data ?? MOCK_QUEUES; } catch { return MOCK_QUEUES; } },
  });

  const { data: settings = MOCK_SETTINGS } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/settings'); return r.data?.data ?? MOCK_SETTINGS; } catch { return MOCK_SETTINGS; } },
  });

  const { data: apiUsage = MOCK_API_USAGE } = useQuery({
    queryKey: ['admin-api-usage'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/api-usage'); return r.data?.data ?? MOCK_API_USAGE; } catch { return MOCK_API_USAGE; } },
  });

  const { data: auditLog = MOCK_AUDIT } = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/audit-logs', { params: { limit: 50 } }); return r.data?.data ?? MOCK_AUDIT; } catch { return MOCK_AUDIT; } },
  });

  const retryMutation = useMutation({
    mutationFn: (name: string) => adminApi.post(`/admin/queue-health/${name}/retry`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-queues'] }); toast('Yeniden deneme başlatıldı', 'success'); },
  });

  const cleanMutation = useMutation({
    mutationFn: (name: string) => adminApi.post(`/admin/queue-health/${name}/clean`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-queues'] }); toast('Kuyruk temizlendi', 'warning'); },
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => adminApi.patch(`/admin/settings/${key}`, { value }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-settings'] }); toast('Ayar güncellendi', 'success'); },
    onError: () => toast('Güncelleme başarısız', 'error'),
  });

  // Setting edit state
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [settingValues, setSettingValues] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Sistem Yönetimi</h1>
      </div>

      <Tabs defaultValue="queues">
        <TabsList>
          <TabsTrigger value="queues">Kuyruk Monitörü</TabsTrigger>
          <TabsTrigger value="settings">Sistem Ayarları</TabsTrigger>
          <TabsTrigger value="api-usage">API Kullanımı</TabsTrigger>
          <TabsTrigger value="audit">Denetim Kaydı</TabsTrigger>
        </TabsList>

        {/* QUEUES */}
        <TabsContent value="queues">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(queues as Queue[]).map((q) => (
              <Card key={q.name}>
                <CardHeader>
                  <CardTitle className="text-sm font-mono">{q.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="flex justify-between bg-[var(--bg-elevated)] rounded px-2 py-1">
                      <span className="text-[var(--text-muted)]">Bekleyen</span>
                      <Badge variant={q.waiting > 20 ? 'warning' : 'default'}>{q.waiting}</Badge>
                    </div>
                    <div className="flex justify-between bg-[var(--bg-elevated)] rounded px-2 py-1">
                      <span className="text-[var(--text-muted)]">Aktif</span>
                      <Badge variant="info">{q.active}</Badge>
                    </div>
                    <div className="flex justify-between bg-[var(--bg-elevated)] rounded px-2 py-1">
                      <span className="text-[var(--text-muted)]">Tamamlanan</span>
                      <Badge variant="success">{q.completed.toLocaleString()}</Badge>
                    </div>
                    <div className="flex justify-between bg-[var(--bg-elevated)] rounded px-2 py-1">
                      <span className="text-[var(--text-muted)]">Hatalı</span>
                      <Badge variant={q.failed > 0 ? 'danger' : 'default'}>{q.failed}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 pt-1">
                    <Button size="xs" variant="secondary" icon={<RefreshCw className="w-3 h-3" />}
                      onClick={() => retryMutation.mutate(q.name)} loading={retryMutation.isPending}>
                      Yeniden Dene
                    </Button>
                    <Button size="xs" variant="danger" icon={<Trash2 className="w-3 h-3" />}
                      onClick={() => cleanMutation.mutate(q.name)}>
                      Temizle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings">
          <div className="space-y-2">
            {(settings as SystemSetting[]).map((s) => (
              <Card key={s.key} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <code className="text-xs font-bold text-indigo-400">{s.key}</code>
                      {s.isEncrypted && <Badge variant="warning">Şifreli</Badge>}
                    </div>
                    {s.description && <p className="text-xs text-[var(--text-muted)]">{s.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingSetting === s.key ? (
                      <>
                        <Input
                          type={s.isEncrypted && !showSecret[s.key] ? 'password' : 'text'}
                          value={settingValues[s.key] ?? ''}
                          onChange={(e) => setSettingValues((p) => ({ ...p, [s.key]: e.target.value }))}
                          className="w-48"
                        />
                        {s.isEncrypted && (
                          <button onClick={() => setShowSecret((p) => ({ ...p, [s.key]: !p[s.key] }))}>
                            {showSecret[s.key] ? <EyeOff className="w-4 h-4 text-[var(--text-muted)]" /> : <Eye className="w-4 h-4 text-[var(--text-muted)]" />}
                          </button>
                        )}
                        <Button size="xs" variant="success" icon={<Save className="w-3 h-3" />}
                          onClick={() => { updateSettingMutation.mutate({ key: s.key, value: settingValues[s.key] ?? '' }); setEditingSetting(null); }}>
                          Kaydet
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => setEditingSetting(null)}>İptal</Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-mono text-[var(--text-secondary)]">
                          {s.isEncrypted ? '••••••••' : s.value}
                        </span>
                        <Button size="xs" variant="ghost" icon={<RefreshCw className="w-3 h-3" />}
                          onClick={() => { setEditingSetting(s.key); setSettingValues((p) => ({ ...p, [s.key]: s.isEncrypted ? '' : s.value })); }}>
                          Düzenle
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* API USAGE */}
        <TabsContent value="api-usage">
          <DataTable
            columns={[
              { header: 'Sağlayıcı', accessorKey: 'provider', cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
              { header: 'Müşteri', accessorKey: 'customer', cell: ({ getValue }) => (getValue() as string) || <Badge variant="info">Sistem</Badge> },
              { header: 'Çağrı', accessorKey: 'callCount', cell: ({ getValue }) => <span>{(getValue() as number).toLocaleString()}</span> },
              { header: 'Maliyet', accessorKey: 'cost', cell: ({ getValue }) => <span className="font-semibold">${(getValue() as number).toFixed(2)}</span> },
              { header: 'Dönem', accessorKey: 'month' },
            ] as ColumnDef<ApiUsageRow>[]}
            data={apiUsage as ApiUsageRow[]}
            searchPlaceholder="Sağlayıcı, müşteri ara..."
            emptyMessage="Kullanım verisi yok."
          />
        </TabsContent>

        {/* AUDIT LOG */}
        <TabsContent value="audit">
          <DataTable
            columns={[
              { header: 'Aksiyon', accessorKey: 'action', cell: ({ getValue }) => <code className="text-xs bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">{getValue() as string}</code> },
              { header: 'Yapan', accessorKey: 'actorEmail', cell: ({ getValue }) => <span className="text-xs">{getValue() as string}</span> },
              { header: 'Hedef', id: 'target', cell: ({ row }) => row.original.targetType ? (
                <span className="text-xs text-[var(--text-muted)]">{row.original.targetType}:{row.original.targetId?.slice(0, 8)}</span>
              ) : null },
              { header: 'Tarih', accessorKey: 'createdAt', cell: ({ getValue }) => <span className="text-xs text-[var(--text-muted)]">{format(new Date(getValue() as string), 'dd MMM HH:mm', { locale: tr })}</span> },
            ] as ColumnDef<AuditRow>[]}
            data={auditLog as AuditRow[]}
            searchPlaceholder="Aksiyon, email ara..."
            emptyMessage="Denetim kaydı yok."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
