'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  RefreshCw, Trash2, Eye, EyeOff, Save, CheckCircle2, XCircle,
  Zap, CreditCard, Database, Mail, Globe, HardDrive, ShieldCheck,
  AlertCircle, Wifi, WifiOff, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Queue { name: string; waiting: number; active: number; completed: number; failed: number; }
interface SystemSetting { key: string; value: string; type: string; isEncrypted: boolean; description?: string; }
interface ApiUsageRow { provider: string; customer?: string; callCount: number; cost: number; month: string; }
interface AuditRow { id: string; action: string; actorEmail: string; targetType?: string; targetId?: string; createdAt: string; }

// ─── API Integration definitions ─────────────────────────────────────────────
interface ApiField {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  description?: string;
}

interface ApiProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  fields: ApiField[];
  docsUrl?: string;
  required?: boolean;
  tag?: string;
}

const API_PROVIDERS: ApiProvider[] = [
  {
    id: 'dataforseo',
    name: 'DataForSEO',
    description: 'Anahtar kelime araştırması, SERP/sıralama takibi, backlink analizi ve GEO (LLM Mentions, AI Mode) verilerinin tek kaynağı.',
    icon: Database,
    color: 'text-blue-400',
    required: true,
    tag: 'Zorunlu',
    fields: [
      { key: 'DATAFORSEO_LOGIN', label: 'API Login (Email)', placeholder: 'user@example.com', description: 'DataForSEO hesabınızın e-posta adresi' },
      { key: 'DATAFORSEO_PASSWORD', label: 'API Şifresi', placeholder: '••••••••', secret: true },
      { key: 'DATAFORSEO_USE_SANDBOX', label: 'Sandbox Modu', placeholder: 'false', type: 'select', options: [{ value: 'false', label: 'Canlı (Gerçek Veri)' }, { value: 'true', label: 'Sandbox (Test)' }], description: 'Test sırasında sandbox kullanarak API maliyeti olmaz' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'SEO+GEO uyumlu blog üretimi, outreach mail yazımı, içerik sınıflandırma. En güçlü içerik motoru.',
    icon: Zap,
    color: 'text-orange-400',
    required: true,
    tag: 'Zorunlu',
    fields: [
      { key: 'ANTHROPIC_API_KEY', label: 'API Anahtarı', placeholder: 'sk-ant-...', secret: true },
      { key: 'DEFAULT_CONTENT_MODEL', label: 'Varsayılan Model', placeholder: 'claude-sonnet-4-6', type: 'select', options: [
        { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Önerilen)' },
        { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 (En Güçlü)' },
        { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (En Hızlı/Ucuz)' },
      ], description: 'İçerik üretiminde kullanılacak varsayılan model' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Anthropic\'e alternatif LLM — içerik üretimi ve sınıflandırma için yedek sağlayıcı.',
    icon: Zap,
    color: 'text-emerald-400',
    tag: 'Opsiyonel',
    fields: [
      { key: 'OPENAI_API_KEY', label: 'API Anahtarı', placeholder: 'sk-...', secret: true },
    ],
  },
  {
    id: 'google',
    name: 'Google OAuth / GSC',
    description: 'Müşterilerin Google Search Console ve Google Analytics 4 hesaplarını bağlaması için OAuth 2.0 kimlik bilgileri.',
    icon: Globe,
    color: 'text-indigo-400',
    tag: 'GSC Bağlantısı için',
    fields: [
      { key: 'GOOGLE_OAUTH_CLIENT_ID', label: 'OAuth Client ID', placeholder: '12345-abc...apps.googleusercontent.com' },
      { key: 'GOOGLE_OAUTH_CLIENT_SECRET', label: 'OAuth Client Secret', placeholder: 'GOCSPX-...', secret: true },
      { key: 'GSC_REDIRECT_URI', label: 'Redirect URI', placeholder: 'https://api.funbreakseo.com/integrations/gsc/callback', description: 'Google Console\'a eklenmesi gereken callback URL' },
    ],
  },
  {
    id: 'vakifbank',
    name: 'VakıfBank Sanal POS',
    description: 'Birincil ödeme sağlayıcısı — Türkiye ve yurt dışı kart tahsilatı, 3D Secure abonelik.',
    icon: CreditCard,
    color: 'text-yellow-400',
    required: true,
    tag: 'Zorunlu',
    fields: [
      { key: 'VAKIFBANK_MERCHANT_ID', label: 'Merchant ID', placeholder: 'VB_MERCHANT_ID' },
      { key: 'VAKIFBANK_TERMINAL_NO', label: 'Terminal No', placeholder: 'VB_TERMINAL' },
      { key: 'VAKIFBANK_PASSWORD', label: 'POS Şifresi', placeholder: '••••••••', secret: true },
      { key: 'VAKIFBANK_3DSECURE_KEY', label: '3D Secure Anahtarı', placeholder: '••••••••', secret: true },
      { key: 'VAKIFBANK_BASE_URL', label: 'API URL', placeholder: 'https://onlineodeme.vakifbank.com.tr', description: 'Test URL: test.vakifbank.com.tr' },
    ],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Uluslararası ödemeler için ek sağlayıcı (başlangıçta pasif — admin panelden aktif edilir). Global kart desteği ve çoklu para birimi tahsilatı.',
    icon: CreditCard,
    color: 'text-violet-400',
    tag: 'Pasif (İleride)',
    fields: [
      { key: 'STRIPE_SECRET_KEY', label: 'Secret Key', placeholder: 'sk_live_...', secret: true },
      { key: 'STRIPE_WEBHOOK_SECRET', label: 'Webhook Secret', placeholder: 'whsec_...', secret: true },
      { key: 'STRIPE_ENABLED', label: 'Stripe Aktif mi?', placeholder: 'false', type: 'select', options: [{ value: 'false', label: 'Pasif (VakıfBank kullanılıyor)' }, { value: 'true', label: 'Aktif' }] },
    ],
  },
  {
    id: 'parasut',
    name: 'Paraşüt',
    description: 'Her ödeme sonrası otomatik e-fatura/e-arşiv kesimi ve ön muhasebe. Paraşüt bağlı olmadan e-fatura oluşturulmaz.',
    icon: ShieldCheck,
    color: 'text-pink-400',
    tag: 'E-Fatura',
    fields: [
      { key: 'PARASUT_CLIENT_ID', label: 'Client ID', placeholder: 'parasut_client_id' },
      { key: 'PARASUT_CLIENT_SECRET', label: 'Client Secret', placeholder: '••••••••', secret: true },
      { key: 'PARASUT_USERNAME', label: 'Kullanıcı Adı', placeholder: 'admin@firma.com' },
      { key: 'PARASUT_PASSWORD', label: 'Şifre', placeholder: '••••••••', secret: true },
      { key: 'PARASUT_COMPANY_ID', label: 'Company ID', placeholder: '123456', description: 'Paraşüt panel URL\'indeki şirket ID\'si' },
    ],
  },
  {
    id: 'smtp',
    name: 'SMTP / E-posta',
    description: 'Sistem mailleri (fatura, ödeme, uyarı) ve outreach kampanya mailleri için SMTP sunucusu.',
    icon: Mail,
    color: 'text-cyan-400',
    required: true,
    tag: 'Zorunlu',
    fields: [
      { key: 'SMTP_HOST', label: 'SMTP Host', placeholder: 'mail.funbreakseo.com' },
      { key: 'SMTP_PORT', label: 'SMTP Port', placeholder: '587', type: 'number' },
      { key: 'SMTP_USER', label: 'Kullanıcı Adı', placeholder: 'noreply@funbreakseo.com' },
      { key: 'SMTP_PASS', label: 'Şifre', placeholder: '••••••••', secret: true },
      { key: 'MAIL_FROM', label: 'Gönderen (Sistem)', placeholder: '"FunBreak SEO" <noreply@funbreakseo.com>' },
      { key: 'OUTREACH_FROM', label: 'Gönderen (Outreach)', placeholder: '"FunBreak SEO" <pr@funbreakseo.com>' },
    ],
  },
  {
    id: 'exchangerate',
    name: 'Döviz Kuru API',
    description: 'Multi-currency fiyat gösterimi için günlük kur verisi. TRY/USD/EUR/GBP/SAR/AED/RUB desteklenir.',
    icon: Globe,
    color: 'text-teal-400',
    tag: 'Multi-Currency',
    fields: [
      { key: 'EXCHANGE_RATE_API_KEY', label: 'API Anahtarı', placeholder: 'xxxxxxxxxxxxxxxx', secret: true, description: 'exchangerate-api.com veya openexchangerates.org' },
      { key: 'EXCHANGE_RATE_BASE_URL', label: 'API URL', placeholder: 'https://v6.exchangerate-api.com/v6' },
    ],
  },
  {
    id: 's3',
    name: 'S3 / Object Storage',
    description: 'PDF raporları, kapak görselleri ve yüklenen dosyalar için S3 uyumlu depolama (Contabo Object Storage veya AWS S3).',
    icon: HardDrive,
    color: 'text-amber-400',
    tag: 'Depolama',
    fields: [
      { key: 'S3_ENDPOINT', label: 'Endpoint URL', placeholder: 'https://eu2.contabostorage.com' },
      { key: 'S3_BUCKET', label: 'Bucket Adı', placeholder: 'funbreakseo' },
      { key: 'S3_ACCESS_KEY', label: 'Access Key', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
      { key: 'S3_SECRET_KEY', label: 'Secret Key', placeholder: '••••••••', secret: true },
    ],
  },
  {
    id: 'sentry',
    name: 'Sentry',
    description: 'Hata izleme ve performans monitörü. Production\'da önerilir — hataları gerçek zamanlı yakalamak için.',
    icon: AlertCircle,
    color: 'text-rose-400',
    tag: 'İzleme',
    fields: [
      { key: 'SENTRY_DSN', label: 'DSN', placeholder: 'https://xxx@o0.ingest.sentry.io/0' },
    ],
  },
];

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_QUEUES: Queue[] = [
  { name: 'content-generation', waiting: 5, active: 2, completed: 1243, failed: 3 },
  { name: 'serp-tracking', waiting: 12, active: 4, completed: 8923, failed: 1 },
  { name: 'geo-visibility', waiting: 2, active: 1, completed: 3421, failed: 0 },
  { name: 'outreach-email', waiting: 8, active: 1, completed: 567, failed: 4 },
  { name: 'autopilot', waiting: 3, active: 1, completed: 234, failed: 0 },
  { name: 'invoice-sync', waiting: 1, active: 0, completed: 892, failed: 2 },
];

const MOCK_SETTINGS: SystemSetting[] = [
  { key: 'VAT_RATE', value: '0.20', type: 'NUMBER', isEncrypted: false, description: 'KDV oranı (0-1 arası)' },
  { key: 'MAINTENANCE_MODE', value: 'false', type: 'BOOLEAN', isEncrypted: false, description: 'Bakım modu' },
  { key: 'TRIAL_DAYS', value: '14', type: 'NUMBER', isEncrypted: false, description: 'Deneme süresi (gün)' },
  { key: 'PAST_DUE_SUSPEND_DAYS', value: '7', type: 'NUMBER', isEncrypted: false, description: 'Ödeme gecikmesinde kaç günde askıya alınsın' },
  { key: 'ADMIN_NOTIFICATION_EMAIL', value: 'doganizzetcan2@gmail.com', type: 'STRING', isEncrypted: false, description: 'Finansal bildirimler için admin e-posta' },
];

const MOCK_API_USAGE: ApiUsageRow[] = [
  { provider: 'DataForSEO', callCount: 8234, cost: 820.5, month: '2026-06' },
  { provider: 'Anthropic', callCount: 1234, cost: 640.0, month: '2026-06' },
  { provider: 'OpenAI', callCount: 456, cost: 380.2, month: '2026-06' },
  { provider: 'DataForSEO', customer: 'Müşteri 1', callCount: 234, cost: 23.4, month: '2026-06' },
  { provider: 'Anthropic', customer: 'Müşteri 2', callCount: 156, cost: 80.1, month: '2026-06' },
];

const MOCK_AUDIT: AuditRow[] = Array.from({ length: 20 }, (_, i) => ({
  id: `audit-${i}`,
  action: ['ADMIN_PLAN_CHANGE', 'ADMIN_REFUND', 'ADMIN_CREDIT_ADD', 'ADMIN_SUSPEND', 'SYSTEM_SETTING_UPDATE'][i % 5],
  actorEmail: i % 3 === 0 ? 'super@funbreakseo.com' : 'admin@funbreakseo.com',
  targetType: ['CUSTOMER', 'SUBSCRIPTION', 'INVOICE'][i % 3],
  targetId: `target-${i}`,
  createdAt: new Date(Date.now() - i * 3600000 * 4).toISOString(),
}));

// ─── ApiProviderCard ──────────────────────────────────────────────────────────
function ApiProviderCard({ provider, savedKeys }: { provider: ApiProvider; savedKeys: Record<string, string> }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const isConfigured = provider.fields.some((f) => savedKeys[f.key] && savedKeys[f.key] !== '****');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(values).filter(([, v]) => v.trim());
      await Promise.all(
        updates.map(([key, value]) => adminApi.patch(`/admin/settings/${key}`, { value }))
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-api-keys'] });
      toast(`${provider.name} ayarları kaydedildi`, 'success');
      setValues({});
    },
    onError: () => toast('Kayıt başarısız', 'error'),
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await adminApi.post(`/admin/integrations/${provider.id}/test`);
      setTestResult('success');
      toast(`${provider.name} bağlantısı başarılı`, 'success');
    } catch {
      setTestResult('error');
      toast(`${provider.name} bağlantı testi başarısız`, 'error');
    } finally {
      setTesting(false);
    }
  };

  const hasChanges = Object.values(values).some((v) => v.trim());

  const Icon = provider.icon;

  return (
    <div className="relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/80 backdrop-blur-sm overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />

      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className={`w-9 h-9 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 ${provider.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{provider.name}</span>
            {provider.tag && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                provider.required ? 'bg-red-500/15 text-red-400' :
                provider.tag === 'Pasif (İleride)' ? 'bg-[var(--bg-elevated)] text-[var(--text-muted)]' :
                'bg-[var(--accent-dim)] text-[var(--accent)]'
              }`}>
                {provider.tag}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{provider.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status */}
          {isConfigured ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Yapılandırıldı
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <XCircle className="w-3 h-3" /> Yapılandırılmadı
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4 space-y-3">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">{provider.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {provider.fields.map((field) => {
              const currentVal = savedKeys[field.key];
              const isMasked = field.secret && currentVal && !values[field.key];

              return (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{field.label}</label>
                  {field.type === 'select' && field.options ? (
                    <select
                      value={values[field.key] ?? currentVal ?? ''}
                      onChange={(e) => setValues((p) => ({ ...p, [field.key]: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm px-3 py-2 focus:border-[var(--accent)] focus:outline-none"
                    >
                      {field.options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="relative">
                      <Input
                        type={field.secret && !show[field.key] ? 'password' : 'text'}
                        placeholder={isMasked ? '••••••••  (kayıtlı)' : field.placeholder}
                        value={values[field.key] ?? ''}
                        onChange={(e) => setValues((p) => ({ ...p, [field.key]: e.target.value }))}
                        className="pr-8"
                      />
                      {field.secret && (
                        <button
                          type="button"
                          onClick={() => setShow((p) => ({ ...p, [field.key]: !p[field.key] }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                        >
                          {show[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  )}
                  {field.description && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{field.description}</p>}
                  {currentVal && !values[field.key] && (
                    <p className="text-[10px] text-emerald-500/70 mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Mevcut değer kayıtlı
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="primary"
              icon={<Save className="w-3.5 h-3.5" />}
              disabled={!hasChanges}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Kaydet
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : testResult === 'success' ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : testResult === 'error' ? <WifiOff className="w-3.5 h-3.5 text-red-400" /> : <Wifi className="w-3.5 h-3.5" />}
              onClick={handleTest}
              disabled={testing || !isConfigured}
            >
              {testing ? 'Test ediliyor...' : 'Bağlantıyı Test Et'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SystemPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: queues = [] } = useQuery({
    queryKey: ['admin-queues'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/queue-health'); return r.data?.data ?? []; } catch { return []; } },
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/settings'); return r.data?.data ?? []; } catch { return []; } },
  });

  const { data: apiKeys = {} } = useQuery<Record<string, string>>({
    queryKey: ['admin-api-keys'],
    queryFn: async () => {
      try {
        const r = await adminApi.get('/admin/settings/api-keys');
        return r.data?.data ?? {};
      } catch { return {}; }
    },
  });

  const { data: apiUsage = [] } = useQuery({
    queryKey: ['admin-api-usage'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/api-usage'); return r.data?.data ?? []; } catch { return []; } },
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/audit-logs', { params: { limit: 50 } }); return r.data?.data ?? []; } catch { return []; } },
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

  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [settingValues, setSettingValues] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  const configuredCount = API_PROVIDERS.filter((p) =>
    p.fields.some((f) => (apiKeys as Record<string, string>)[f.key])
  ).length;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Sistem Yönetimi</h1>
          <p>API entegrasyonları, kuyruk monitörü, ayarlar ve denetim kaydı</p>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="kpi-grid">
        {[
          { label: 'API Sağlayıcı', value: `${configuredCount}/${API_PROVIDERS.length}`, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
          { label: 'Zorunlu API', value: `${API_PROVIDERS.filter(p => p.required && p.fields.some(f => (apiKeys as Record<string, string>)[f.key])).length}/${API_PROVIDERS.filter(p => p.required).length}`, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
          { label: 'Kuyruk Hatalı', value: (queues as Queue[]).reduce((s, q) => s + q.failed, 0), color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
          { label: 'Aktif İş', value: (queues as Queue[]).reduce((s, q) => s + q.active, 0), color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'block' }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{s.value}</p>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${s.color}80, transparent)`, borderRadius: '0 0 12px 12px' }} />
          </div>
        ))}
      </div>

      <Tabs defaultValue="apis">
        <TabsList>
          <TabsTrigger value="apis">API Entegrasyonları</TabsTrigger>
          <TabsTrigger value="queues">Kuyruk Monitörü</TabsTrigger>
          <TabsTrigger value="settings">Sistem Ayarları</TabsTrigger>
          <TabsTrigger value="api-usage">API Kullanımı</TabsTrigger>
          <TabsTrigger value="audit">Denetim Kaydı</TabsTrigger>
        </TabsList>

        {/* ── API ENTEGRASYONLARI ── */}
        <TabsContent value="apis">
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Her sağlayıcıyı genişletip kimlik bilgilerini girin. Kaydet'e basınca şifreli olarak veritabanına yazılır.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <ShieldCheck style={{ width: 14, height: 14, color: '#22c55e' }} />
                Tüm API anahtarları şifreli saklanır
              </div>
            </div>

            <div>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10 }}>Zorunlu Entegrasyonlar</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {API_PROVIDERS.filter((p) => p.required).map((provider) => (
                  <ApiProviderCard key={provider.id} provider={provider} savedKeys={apiKeys as Record<string, string>} />
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10, marginTop: 8 }}>Opsiyonel Entegrasyonlar</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {API_PROVIDERS.filter((p) => !p.required).map((provider) => (
                  <ApiProviderCard key={provider.id} provider={provider} savedKeys={apiKeys as Record<string, string>} />
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── QUEUES ── */}
        <TabsContent value="queues">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
            {(queues as Queue[]).map((q) => (
              <div key={q.name} className="section-card">
                <div className="section-card-header">
                  <span className="section-card-title" style={{ fontFamily: 'monospace', fontSize: 12 }}>{q.name}</span>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[
                      { label: 'Bekleyen', val: q.waiting, color: q.waiting > 20 ? '#eab308' : 'var(--text-secondary)' },
                      { label: 'Aktif', val: q.active, color: '#6366f1' },
                      { label: 'Tamamlanan', val: q.completed.toLocaleString(), color: '#22c55e' },
                      { label: 'Hatalı', val: q.failed, color: q.failed > 0 ? '#ef4444' : 'var(--text-muted)' },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-elevated)', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                        <span style={{ fontWeight: 600, color }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="xs" variant="secondary" icon={<RefreshCw className="w-3 h-3" />}
                      onClick={() => retryMutation.mutate(q.name)} loading={retryMutation.isPending}>
                      Yeniden Dene
                    </Button>
                    <Button size="xs" variant="danger" icon={<Trash2 className="w-3 h-3" />}
                      onClick={() => cleanMutation.mutate(q.name)}>
                      Temizle
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── GENERAL SETTINGS ── */}
        <TabsContent value="settings">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {(settings as SystemSetting[]).map((s) => (
              <div key={s.key} className="section-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <code style={{ fontSize: 12, fontWeight: 700, color: '#818cf8' }}>{s.key}</code>
                      {s.isEncrypted && <Badge variant="warning">Şifreli</Badge>}
                    </div>
                    {s.description && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.description}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                        <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
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
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── API USAGE ── */}
        <TabsContent value="api-usage">
          <div className="section-card" style={{ marginTop: 16 }}>
            <div className="section-card-header"><span className="section-card-title">API Kullanım İstatistikleri</span></div>
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
              noBorder
            />
          </div>
        </TabsContent>

        {/* ── AUDIT LOG ── */}
        <TabsContent value="audit">
          <div className="section-card" style={{ marginTop: 16 }}>
            <div className="section-card-header"><span className="section-card-title">Denetim Kaydı</span></div>
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
              noBorder
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
