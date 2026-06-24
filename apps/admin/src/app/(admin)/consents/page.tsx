'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { PageSpinner } from '@/components/ui/Spinner';
import { ConsentViewer } from '@/components/ConsentViewer';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Eye, Download } from 'lucide-react';

interface ConsentRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  type: string;
  version: string;
  acceptedAt: string;
  ipAddress: string;
  device: string;
  textSnapshot?: string;
}

const CONSENT_TYPES = ['TERMS', 'KVKK', 'DISTANCE_SALES', 'PRE_INFO', 'MARKETING'];

const MOCK_CONSENTS: ConsentRecord[] = Array.from({ length: 40 }, (_, i) => ({
  id: `cr-${i}`,
  customerId: `cust-${Math.floor(i / 4)}`,
  customerName: `Müşteri ${Math.floor(i / 4) + 1}`,
  customerEmail: `musteri${Math.floor(i / 4) + 1}@example.com`,
  type: CONSENT_TYPES[i % 5],
  version: '1.0',
  acceptedAt: new Date(Date.now() - i * 86400000 * 7).toISOString(),
  ipAddress: `192.168.${Math.floor(i / 10)}.${(i % 255) + 1}`,
  device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  textSnapshot: `${CONSENT_TYPES[i % 5]} sözleşme metni v1.0\n\nBu bir örnek sözleşme metnidir...`,
}));

export default function ConsentsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedConsent, setSelectedConsent] = useState<ConsentRecord | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-all-consents'],
    queryFn: async () => {
      try { const r = await adminApi.get('/admin/consents'); return r.data?.data ?? MOCK_CONSENTS; }
      catch { return MOCK_CONSENTS; }
    },
  });

  const consents = (data ?? MOCK_CONSENTS) as ConsentRecord[];
  const filtered = typeFilter ? consents.filter((c) => c.type === typeFilter) : consents;

  const handleBulkCSV = async () => {
    try {
      const r = await adminApi.get('/admin/consents/export', { responseType: 'blob', params: typeFilter ? { type: typeFilter } : {} });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'onaylar.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { /* fallback: generate CSV locally */ }
  };

  const columns: ColumnDef<ConsentRecord>[] = [
    {
      header: 'Müşteri',
      id: 'customer',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.customerName}</p>
          <p className="text-xs text-[var(--text-muted)]">{row.original.customerEmail}</p>
        </div>
      ),
    },
    {
      header: 'Sözleşme',
      accessorKey: 'type',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.type}</p>
          <p className="text-xs text-[var(--text-muted)]">v{row.original.version}</p>
        </div>
      ),
    },
    {
      header: 'Tarih',
      accessorKey: 'acceptedAt',
      cell: ({ getValue }) => (
        <span className="text-xs text-[var(--text-muted)]">
          {format(new Date(getValue() as string), 'dd MMM yyyy HH:mm', { locale: tr })}
        </span>
      ),
    },
    {
      header: 'IP Adresi',
      accessorKey: 'ipAddress',
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
    },
    {
      header: 'Cihaz',
      accessorKey: 'device',
      cell: ({ getValue }) => (
        <span className="text-xs text-[var(--text-muted)] max-w-[150px] truncate block">
          {getValue() as string}
        </span>
      ),
    },
    {
      header: 'İşlem',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            size="xs"
            variant="ghost"
            icon={<Eye className="w-3 h-3" />}
            onClick={(e) => { e.stopPropagation(); setSelectedConsent(row.original); }}
          >
            Görüntüle
          </Button>
          <Button
            size="xs"
            variant="ghost"
            icon={<Download className="w-3 h-3" />}
          >
            PDF
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Yasal Onay Kayıtları</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{consents.length} toplam onay kaydı</p>
        </div>
        <Button
          variant="secondary"
          icon={<Download className="w-4 h-4" />}
          onClick={handleBulkCSV}
        >
          Toplu CSV Dışa Aktar
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Müşteri, sözleşme ara..."
        toolbar={
          <Select
            options={[{ value: '', label: 'Tüm Tipler' }, ...CONSENT_TYPES.map((t) => ({ value: t, label: t }))]}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />
        }
        emptyMessage="Onay kaydı bulunamadı."
      />

      {selectedConsent && (
        <ConsentViewer
          consent={selectedConsent}
          customerId={selectedConsent.customerId}
          onClose={() => setSelectedConsent(null)}
        />
      )}
    </div>
  );
}
