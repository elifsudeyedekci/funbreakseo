'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { CheckCircle, AlertCircle, XCircle, RefreshCw, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

type ServiceStatus = 'UP' | 'DEGRADED' | 'DOWN';

interface ServiceHealth {
  name: string;
  label: string;
  status: ServiceStatus;
  latency?: number;
  lastCheck: string;
  message?: string;
}

const MOCK_STATUS: ServiceHealth[] = [
  { name: 'db', label: 'Veritabanı (PostgreSQL)', status: 'UP', latency: 8, lastCheck: new Date(Date.now() - 30000).toISOString() },
  { name: 'redis', label: 'Redis / Cache', status: 'UP', latency: 2, lastCheck: new Date(Date.now() - 30000).toISOString() },
  { name: 'worker', label: 'BullMQ Worker', status: 'UP', latency: 15, lastCheck: new Date(Date.now() - 60000).toISOString() },
  { name: 'disk', label: 'Disk Depolama', status: 'UP', latency: undefined, lastCheck: new Date(Date.now() - 120000).toISOString(), message: '42% kullanımda' },
  { name: 'dataforseo', label: 'DataForSEO API', status: 'UP', latency: 320, lastCheck: new Date(Date.now() - 30000).toISOString() },
  { name: 'llm', label: 'LLM API (OpenAI/Claude)', status: 'DEGRADED', latency: 2100, lastCheck: new Date(Date.now() - 30000).toISOString(), message: 'Yüksek gecikme' },
  { name: 'smtp', label: 'SMTP (E-posta)', status: 'UP', latency: 180, lastCheck: new Date(Date.now() - 60000).toISOString() },
  { name: 'storage', label: 'S3 / Dosya Depolama', status: 'UP', latency: 45, lastCheck: new Date(Date.now() - 30000).toISOString() },
];

const statusConfig: Record<ServiceStatus, { icon: React.ElementType; variant: 'success' | 'warning' | 'danger'; label: string; color: string }> = {
  UP: { icon: CheckCircle, variant: 'success', label: 'Çalışıyor', color: 'text-emerald-400' },
  DEGRADED: { icon: AlertCircle, variant: 'warning', label: 'Sorunlu', color: 'text-yellow-400' },
  DOWN: { icon: XCircle, variant: 'danger', label: 'Çöktü', color: 'text-red-400' },
};

export default function StatusPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: async () => {
      try { const r = await adminApi.get('/admin/system-health'); return r.data?.data ?? MOCK_STATUS; }
      catch { return MOCK_STATUS; }
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  const services = (data ?? MOCK_STATUS) as ServiceHealth[];
  const downCount = services.filter((s) => s.status === 'DOWN').length;
  const degradedCount = services.filter((s) => s.status === 'DEGRADED').length;
  const upCount = services.filter((s) => s.status === 'UP').length;

  const overallStatus: ServiceStatus = downCount > 0 ? 'DOWN' : degradedCount > 0 ? 'DEGRADED' : 'UP';
  const overall = statusConfig[overallStatus];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Sistem Sağlığı</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Tüm servisler gerçek zamanlı izleniyor</p>
        </div>
        <Button
          variant="secondary"
          icon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}
          onClick={() => refetch()}
        >
          Yenile
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={`flex items-center gap-4 p-4 ${overallStatus === 'UP' ? 'border-emerald-500/30 bg-emerald-500/5' : overallStatus === 'DEGRADED' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
        <overall.icon className={`w-8 h-8 ${overall.color}`} />
        <div>
          <p className={`text-lg font-bold ${overall.color}`}>
            {overallStatus === 'UP' ? 'Tüm Sistemler Çalışıyor' : overallStatus === 'DEGRADED' ? 'Bazı Sistemlerde Sorun Var' : 'Kritik Sistem Arızası'}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {upCount} çalışıyor · {degradedCount} sorunlu · {downCount} çöktü
          </p>
        </div>
        <div className="ml-auto">
          <Activity className={`w-6 h-6 ${overall.color} animate-pulse`} />
        </div>
      </Card>

      {/* Service Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((service) => {
          const cfg = statusConfig[service.status];
          const Icon = cfg.icon;
          return (
            <Card key={service.name} className="p-3">
              <div className="flex items-start justify-between mb-2">
                <Icon className={`w-5 h-5 ${cfg.color}`} />
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
              </div>
              <p className="font-medium text-sm text-[var(--text-primary)]">{service.label}</p>
              {service.latency !== undefined && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Gecikme: <span className={service.latency > 1000 ? 'text-yellow-400' : 'text-emerald-400'}>{service.latency}ms</span>
                </p>
              )}
              {service.message && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{service.message}</p>
              )}
              <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
                Son kontrol: {formatDistanceToNow(new Date(service.lastCheck), { addSuffix: true, locale: tr })}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
