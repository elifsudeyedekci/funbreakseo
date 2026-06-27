'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { PageSpinner } from '@/components/ui/Spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/DataTable';
import { CustomerActionBar } from '@/components/CustomerActionBar';
import { ConsentViewer } from '@/components/ConsentViewer';
import { type ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { User, Building2, Mail, Phone, MapPin, Receipt, Heart, Eye, Download, FileText, TrendingDown } from 'lucide-react';

/**
 * Safe date formatter — empty/invalid dates (e.g. ZERO_SUBSCRIPTION defaults
 * with '' periods) previously threw "Invalid time value" inside date-fns,
 * crashing the whole customer detail page. Returns '—' instead.
 */
function fmtDate(value: unknown, pattern = 'dd MMM yyyy'): string {
  if (!value) return '—';
  const d = new Date(value as string);
  if (isNaN(d.getTime())) return '—';
  return format(d, pattern, { locale: tr });
}

const MOCK_CUSTOMER = {
  id: 'cust-1', fullName: 'Ahmet Yılmaz', email: 'ahmet@example.com', phone: '+90 532 000 0001',
  company: 'Tech A.Ş.', taxNumber: '1234567890', address: 'Atatürk Cad. No:1', city: 'İstanbul', country: 'TR',
  plan: 'GROWTH', status: 'ACTIVE', healthScore: 78, churnRisk: 'LOW',
  createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
  lastLoginAt: new Date(Date.now() - 3600000 * 5).toISOString(),
};

const MOCK_CONSENTS = ['TERMS', 'KVKK', 'DISTANCE_SALES', 'PRE_INFO'].map((type, i) => ({
  id: `consent-${i}`, type, version: '1.0',
  acceptedAt: new Date(Date.now() - i * 86400000 * 30).toISOString(),
  ipAddress: `192.168.1.${i + 1}`,
  device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  textSnapshot: `${type} sözleşme metni v1.0\n\nBu sözleşme metnidir...`,
}));

const MOCK_AUDIT = [
  { id: 'a1', action: 'ADMIN_PLAN_CHANGE', actorEmail: 'admin@funbreakseo.com', createdAt: new Date(Date.now() - 3600000).toISOString(), meta: { from: 'STARTER', to: 'GROWTH' } },
  { id: 'a2', action: 'ADMIN_CREDIT_ADD', actorEmail: 'admin@funbreakseo.com', createdAt: new Date(Date.now() - 86400000).toISOString(), meta: { amount: 50 } },
  { id: 'a3', action: 'ADMIN_IMPERSONATE', actorEmail: 'super@funbreakseo.com', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
];

type ConsentRow = { id: string; type: string; version: string; acceptedAt: string; ipAddress: string; device: string; textSnapshot?: string };

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [selectedConsent, setSelectedConsent] = useState<ConsentRow | null>(null);

  const { data: customer, isLoading, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      try {
        const r = await adminApi.get(`/admin/customers/${id}`);
        const raw = r.data?.data ?? r.data;
        if (!raw?.id) return MOCK_CUSTOMER;
        return {
          id: raw.id,
          fullName: raw.users?.[0]?.fullName ?? raw.name ?? 'Bilinmiyor',
          email: raw.users?.[0]?.email ?? '',
          phone: raw.users?.[0]?.phone ?? raw.phone ?? '',
          company: raw.name ?? '',
          taxNumber: raw.taxNumber ?? '',
          address: raw.address ?? '',
          city: raw.city ?? '',
          country: raw.country ?? 'TR',
          plan: raw.subscription?.plan?.name ?? 'FREE',
          status: raw.subscription?.status ?? 'ACTIVE',
          healthScore: raw.healthScore ?? 50,
          churnRisk: raw.churnRisk ?? 'LOW',
          createdAt: raw.createdAt,
          lastLoginAt: raw.users?.[0]?.lastLoginAt ?? null,
        };
      }
      catch { return MOCK_CUSTOMER; }
    },
  });

  const { data: consents = [] } = useQuery({
    queryKey: ['customer-consents', id],
    queryFn: async () => {
      try { const r = await adminApi.get(`/admin/customers/${id}/consents`); return r.data?.data ?? r.data ?? []; }
      catch { return []; }
    },
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['customer-audit', id],
    queryFn: async () => {
      try { const r = await adminApi.get(`/admin/customers/${id}/audit-log`); return r.data?.data ?? r.data ?? []; }
      catch { return []; }
    },
  });

  const ZERO_SUBSCRIPTION = { planName: '', status: '', currentPeriodStart: '', currentPeriodEnd: '', cancelAtPeriodEnd: false, price: 0, interval: '' };
  const { data: subscription = ZERO_SUBSCRIPTION } = useQuery({
    queryKey: ['customer-subscription', id],
    queryFn: async () => {
      try { const r = await adminApi.get(`/admin/customers/${id}/subscription`); return r.data?.data ?? r.data ?? ZERO_SUBSCRIPTION; }
      catch { return ZERO_SUBSCRIPTION; }
    },
  });

  const MOCK_INVOICES = Array.from({ length: 3 }, (_, i) => ({ id: `inv-${i}`, number: `INV-2026-${String(i + 1).padStart(3, '0')}`, amount: 49, currency: 'USD', status: i === 0 ? 'PAID' : i === 1 ? 'PAID' : 'PAID', createdAt: new Date(Date.now() - 86400000 * 30 * (i + 1)).toISOString(), pdfUrl: null }));
  const { data: invoices = [] } = useQuery({
    queryKey: ['customer-invoices', id],
    queryFn: async () => {
      try { const r = await adminApi.get(`/admin/customers/${id}/invoices`); return r.data?.data ?? r.data ?? []; }
      catch { return []; }
    },
  });

  const ZERO_USAGE = { keywords: { used: 0, limit: 0 }, crawls: { used: 0, limit: 0 }, aiBlogs: { used: 0, limit: 0 }, geoQueries: { used: 0, limit: 0 } };
  const { data: usage = ZERO_USAGE } = useQuery({
    queryKey: ['customer-usage', id],
    queryFn: async () => {
      const r = await adminApi.get(`/admin/customers/${id}/usage`); return r.data?.data ?? r.data ?? ZERO_USAGE;
    },
  });

  const handleExportCSV = () => {
    const rows = (consents ?? []) as ConsentRow[];
    const header = ['Sözleşme', 'Versiyon', 'Tarih', 'IP', 'Cihaz'];
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      header.join(','),
      ...rows.map((r) => [r.type, r.version, r.acceptedAt, r.ipAddress, r.device].map(escape).join(',')),
    ].join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `onaylar-${id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !customer) return <PageSpinner />;

  const c = customer as typeof MOCK_CUSTOMER;

  const consentCols: ColumnDef<ConsentRow>[] = [
    { header: 'Sözleşme', accessorKey: 'type', cell: ({ row }) => (
      <div><p className="font-medium text-sm">{row.original.type}</p><p className="text-xs text-[var(--text-muted)]">v{row.original.version}</p></div>
    )},
    { header: 'Tarih', accessorKey: 'acceptedAt', cell: ({ getValue }) => fmtDate(getValue(), 'dd MMM yyyy HH:mm') },
    { header: 'IP', accessorKey: 'ipAddress', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span> },
    { header: 'Cihaz', accessorKey: 'device', cell: ({ getValue }) => <span className="text-xs text-[var(--text-muted)] max-w-[100px] truncate block">{getValue() as string}</span> },
    { header: '', id: 'actions', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="xs" variant="ghost" icon={<Eye className="w-3 h-3" />} onClick={() => setSelectedConsent(row.original)}>Görüntüle</Button>
      </div>
    )},
  ];

  type AuditRow = { id: string; action: string; actorEmail: string; createdAt: string; meta?: Record<string, unknown> };
  const auditCols: ColumnDef<AuditRow>[] = [
    { header: 'Aksiyon', accessorKey: 'action', cell: ({ getValue }) => <code className="text-xs bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">{getValue() as string}</code> },
    { header: 'Yapan', accessorKey: 'actorEmail', cell: ({ getValue }) => <span className="text-xs">{getValue() as string}</span> },
    { header: 'Tarih', accessorKey: 'createdAt', cell: ({ getValue }) => fmtDate(getValue(), 'dd MMM yyyy HH:mm') },
    { header: 'Detay', accessorKey: 'meta', cell: ({ getValue }) => {
      const m = getValue() as Record<string, unknown> | undefined;
      return m ? <span className="text-xs text-[var(--text-muted)] truncate max-w-[160px] block">{JSON.stringify(m)}</span> : null;
    }},
  ];

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#6366f1', flexShrink:0 }}>
            {c.fullName?.[0]}
          </div>
          <div>
            <h1>{c.fullName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="info">{c.plan}</Badge>
              <Badge variant={c.status === 'ACTIVE' ? 'success' : 'danger'}>{c.status}</Badge>
              <span className="text-xs text-[var(--text-muted)]">
                Son giriş: {c.lastLoginAt ? formatDistanceToNow(new Date(c.lastLoginAt), { addSuffix: true, locale: tr }) : '—'}
              </span>
            </div>
          </div>
        </div>
        <CustomerActionBar customerId={id} status={c.status} onRefresh={refetch} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Genel Bilgi</TabsTrigger>
          <TabsTrigger value="subscription">Abonelik</TabsTrigger>
          <TabsTrigger value="invoices">Faturalar</TabsTrigger>
          <TabsTrigger value="usage">Kullanım</TabsTrigger>
          <TabsTrigger value="consents">Yasal Onaylar</TabsTrigger>
          <TabsTrigger value="audit">Denetim Kaydı</TabsTrigger>
          <TabsTrigger value="health">Sağlık</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><User className="w-4 h-4" />İletişim Bilgileri</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { icon: Mail, label: 'E-posta', value: c.email },
                  { icon: Phone, label: 'Telefon', value: c.phone },
                  { icon: Building2, label: 'Şirket', value: c.company },
                  { icon: Receipt, label: 'Vergi No', value: c.taxNumber },
                  { icon: MapPin, label: 'Adres', value: c.address ? `${c.address}, ${c.city}` : undefined },
                ].map((row) => row.value ? (
                  <div key={row.label} className="flex items-start gap-2">
                    <row.icon className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                    <div><p className="text-[var(--text-muted)] text-xs">{row.label}</p><p className="text-[var(--text-primary)]">{row.value}</p></div>
                  </div>
                ) : null)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Özet</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Kayıt Tarihi</span><span>{fmtDate(c.createdAt)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Sağlık Skoru</span>
                  <span className={c.healthScore >= 70 ? 'text-emerald-400 font-bold' : c.healthScore >= 40 ? 'text-yellow-400 font-bold' : 'text-red-400 font-bold'}>{c.healthScore}/100</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Churn Riski</span>
                  <Badge variant={c.churnRisk === 'LOW' ? 'success' : c.churnRisk === 'MEDIUM' ? 'warning' : 'danger'}>{c.churnRisk}</Badge></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader><CardTitle className="text-sm">Abonelik Detayı</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const sub = subscription as typeof ZERO_SUBSCRIPTION;
                return (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex flex-col gap-1"><span className="text-[var(--text-muted)]">Plan</span><span className="font-semibold">{sub.planName}</span></div>
                    <div className="flex flex-col gap-1"><span className="text-[var(--text-muted)]">Durum</span><Badge variant={sub.status === 'ACTIVE' ? 'success' : 'warning'}>{sub.status}</Badge></div>
                    <div className="flex flex-col gap-1"><span className="text-[var(--text-muted)]">Dönem Başlangıcı</span><span>{fmtDate(sub.currentPeriodStart)}</span></div>
                    <div className="flex flex-col gap-1"><span className="text-[var(--text-muted)]">Dönem Bitişi</span><span>{fmtDate(sub.currentPeriodEnd)}</span></div>
                    <div className="flex flex-col gap-1"><span className="text-[var(--text-muted)]">Ücret</span><span className="font-semibold">${sub.price}/{sub.interval}</span></div>
                    <div className="flex flex-col gap-1"><span className="text-[var(--text-muted)]">Dönem Sonunda İptal</span><Badge variant={sub.cancelAtPeriodEnd ? 'warning' : 'success'}>{sub.cancelAtPeriodEnd ? 'Evet' : 'Hayır'}</Badge></div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Faturalar</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(invoices as typeof MOCK_INVOICES).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{inv.number}</span>
                      <span className="text-xs text-[var(--text-muted)]">{fmtDate(inv.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">${inv.amount} {inv.currency}</span>
                      <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'PENDING' ? 'warning' : 'danger'}>{inv.status}</Badge>
                      {inv.pdfUrl && <Button size="xs" variant="ghost" icon={<Download className="w-3 h-3" />} onClick={() => window.open(inv.pdfUrl!, '_blank')}>PDF</Button>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader><CardTitle className="text-sm">Kullanım Kotası</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const u = usage as typeof ZERO_USAGE;
                const items = [
                  { label: 'Anahtar Kelimeler', used: u.keywords.used, limit: u.keywords.limit },
                  { label: 'Site Taramaları', used: u.crawls.used, limit: u.crawls.limit },
                  { label: 'AI Blog İçerikleri', used: u.aiBlogs.used, limit: u.aiBlogs.limit },
                  { label: 'GEO Sorguları', used: u.geoQueries.used, limit: u.geoQueries.limit },
                ];
                return items.map(item => {
                  const pct = Math.round((item.used / item.limit) * 100);
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-semibold text-[var(--text-muted)]">{item.used} / {item.limit}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consents">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Yasal Onay Kayıtları</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExportCSV}>
                  CSV Dışa Aktar
                </Button>
              </div>
            </div>
            <DataTable columns={consentCols} data={consents as ConsentRow[]} emptyMessage="Onay kaydı yok." />
          </div>
          <ConsentViewer consent={selectedConsent} customerId={id} onClose={() => setSelectedConsent(null)} />
        </TabsContent>

        <TabsContent value="audit">
          <DataTable columns={auditCols} data={auditLog as AuditRow[]} emptyMessage="Denetim kaydı yok." />
        </TabsContent>

        <TabsContent value="health">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Heart className="w-4 h-4" />Sağlık Skoru</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <span className={`text-5xl font-bold ${c.healthScore >= 70 ? 'text-emerald-400' : c.healthScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {c.healthScore}
                  </span>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">/ 100</p>
                    <Badge variant={c.churnRisk === 'LOW' ? 'success' : c.churnRisk === 'MEDIUM' ? 'warning' : 'danger'}>
                      {c.churnRisk} CHURN RİSKİ
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><TrendingDown className="w-4 h-4" />Sinyaller</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--text-muted)]">Sağlık sinyalleri yükleniyor...</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
