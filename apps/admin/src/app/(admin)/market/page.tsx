'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CheckCircle, XCircle, DollarSign, TrendingUp } from 'lucide-react';

// Types
interface PublisherOffer { id: string; domain: string; dr: number; organicTraffic: number; category: string; language: string; costPrice: number; linkType: string; deliveryDays: number; status: string; outreachReply?: string; createdAt: string; }
interface MarketListing { id: string; domain: string; dr: number; salePrice: number; costPrice: number; linkType: string; status: string; }
interface BacklinkOrder { id: string; customerName: string; domain: string; status: string; escrowAmount: number; publishedUrl?: string; createdAt: string; }

// Mock data
const MOCK_OFFERS: PublisherOffer[] = Array.from({ length: 8 }, (_, i) => ({
  id: `offer-${i}`, domain: `publisher${i + 1}.com`, dr: 30 + i * 5, organicTraffic: 5000 + i * 2000,
  category: ['tech', 'health', 'finance'][i % 3], language: ['tr', 'en', 'de'][i % 3],
  costPrice: 100 + i * 50, linkType: i % 2 === 0 ? 'DO_FOLLOW' : 'NO_FOLLOW', deliveryDays: 7 + i,
  status: 'PENDING', outreachReply: i % 2 === 0 ? 'Evet, link yayınlayabiliriz. $' + (100 + i * 50) + ' ücret alıyoruz.' : undefined,
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
}));

const MOCK_LISTINGS: MarketListing[] = Array.from({ length: 12 }, (_, i) => ({
  id: `listing-${i}`, domain: `site${i + 1}.com`, dr: 25 + i * 4,
  salePrice: 200 + i * 80, costPrice: 100 + i * 40, linkType: i % 2 === 0 ? 'DO_FOLLOW' : 'NO_FOLLOW',
  status: ['ACTIVE', 'ACTIVE', 'INACTIVE'][i % 3],
}));

const MOCK_ORDERS: BacklinkOrder[] = Array.from({ length: 10 }, (_, i) => ({
  id: `order-${i}`, customerName: `Müşteri ${i + 1}`, domain: `site${i + 1}.com`,
  status: ['PENDING_PAYMENT', 'ESCROW_HELD', 'PUBLISHED', 'DISPUTED', 'COMPLETED'][i % 5],
  escrowAmount: 200 + i * 80, publishedUrl: i % 5 === 2 ? `https://site${i + 1}.com/post-${i}` : undefined,
  createdAt: new Date(Date.now() - i * 86400000 * 3).toISOString(),
}));

const ApproveOfferSchema = z.object({ salePrice: z.coerce.number().positive('Satış fiyatı gerekli'), adminNote: z.string().optional() });

export default function MarketPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: offers = MOCK_OFFERS, isLoading: offersLoading } = useQuery({
    queryKey: ['admin-offers'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/market/offers'); return r.data?.data ?? MOCK_OFFERS; } catch { return MOCK_OFFERS; } },
  });

  const { data: listings = MOCK_LISTINGS } = useQuery({
    queryKey: ['admin-listings'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/market/listings'); return r.data?.data ?? MOCK_LISTINGS; } catch { return MOCK_LISTINGS; } },
  });

  const { data: orders = MOCK_ORDERS } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => { try { const r = await adminApi.get('/admin/market/orders'); return r.data?.data ?? MOCK_ORDERS; } catch { return MOCK_ORDERS; } },
  });

  // State for approve modal
  const [approveOffer, setApproveOffer] = useState<PublisherOffer | null>(null);
  const { register, handleSubmit, formState: { errors }, reset } = useForm({ resolver: zodResolver(ApproveOfferSchema) });

  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { salePrice: number; adminNote?: string } }) => adminApi.post(`/admin/market/offers/${id}/approve`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-offers'] }); toast('Teklif onaylandı, ilan oluşturuldu', 'success'); setApproveOffer(null); reset(); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => adminApi.post(`/admin/market/offers/${id}/reject`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-offers'] }); toast('Teklif reddedildi', 'warning'); },
    onError: () => toast('İşlem başarısız', 'error'),
  });

  const offerCols: ColumnDef<PublisherOffer>[] = [
    { header: 'Domain', accessorKey: 'domain', cell: ({ row }) => (
      <div><p className="font-medium">{row.original.domain}</p><p className="text-xs text-[var(--text-muted)]">{row.original.category} · {row.original.language.toUpperCase()}</p></div>
    )},
    { header: 'DR', accessorKey: 'dr', cell: ({ getValue }) => <span className="font-bold text-indigo-400">{getValue() as number}</span> },
    { header: 'Trafik', accessorKey: 'organicTraffic', cell: ({ getValue }) => <span>{((getValue() as number) / 1000).toFixed(0)}K</span> },
    { header: 'Maliyet', accessorKey: 'costPrice', cell: ({ getValue }) => <span className="font-medium">${getValue() as number}</span> },
    { header: 'Link', accessorKey: 'linkType', cell: ({ getValue }) => <Badge variant={getValue() === 'DO_FOLLOW' ? 'success' : 'default'}>{getValue() as string}</Badge> },
    { header: 'Teslim', accessorKey: 'deliveryDays', cell: ({ getValue }) => <span className="text-xs">{getValue() as number}g</span> },
    { header: 'Outreach Cevabı', accessorKey: 'outreachReply', cell: ({ getValue }) => {
      const v = getValue() as string | undefined;
      return v ? <span className="text-xs text-[var(--text-muted)] max-w-[120px] truncate block">{v}</span> : <span className="text-[var(--text-muted)]">—</span>;
    }},
    { header: '', id: 'actions', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="xs" variant="success" icon={<CheckCircle className="w-3 h-3" />}
          onClick={(e) => { e.stopPropagation(); setApproveOffer(row.original); }}>Onayla</Button>
        <Button size="xs" variant="danger" icon={<XCircle className="w-3 h-3" />}
          onClick={(e) => { e.stopPropagation(); rejectMutation.mutate({ id: row.original.id }); }}>Reddet</Button>
      </div>
    )},
  ];

  const listingCols: ColumnDef<MarketListing>[] = [
    { header: 'Domain', accessorKey: 'domain', cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
    { header: 'DR', accessorKey: 'dr', cell: ({ getValue }) => <span className="font-bold text-indigo-400">{getValue() as number}</span> },
    { header: 'Satış Fiyatı', accessorKey: 'salePrice', cell: ({ getValue }) => <span className="font-semibold">${getValue() as number}</span> },
    { header: 'Maliyet', accessorKey: 'costPrice', cell: ({ getValue }) => <span className="text-[var(--text-muted)]">${getValue() as number}</span> },
    { header: 'Kâr', id: 'profit', cell: ({ row }) => {
      const profit = row.original.salePrice - row.original.costPrice;
      const margin = Math.round((profit / row.original.salePrice) * 100);
      return <span className="text-emerald-400 font-semibold">${profit} (%{margin})</span>;
    }},
    { header: 'Durum', accessorKey: 'status', cell: ({ getValue }) => <Badge variant={getValue() === 'ACTIVE' ? 'success' : 'default'}>{getValue() as string}</Badge> },
  ];

  const orderCols: ColumnDef<BacklinkOrder>[] = [
    { header: 'Müşteri', accessorKey: 'customerName' },
    { header: 'Domain', accessorKey: 'domain', cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
    { header: 'Durum', accessorKey: 'status', cell: ({ getValue }) => {
      const s = getValue() as string;
      const v = s === 'COMPLETED' ? 'success' : s === 'DISPUTED' ? 'danger' : s === 'PUBLISHED' ? 'info' : 'default';
      return <Badge variant={v as 'success' | 'danger' | 'info' | 'default'}>{s}</Badge>;
    }},
    { header: 'Escrow', accessorKey: 'escrowAmount', cell: ({ getValue }) => <span>${getValue() as number}</span> },
    { header: 'Yayın Linki', accessorKey: 'publishedUrl', cell: ({ getValue }) => {
      const url = getValue() as string | undefined;
      return url ? <a href={url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline truncate block max-w-[120px]">{url}</a> : <span className="text-[var(--text-muted)]">—</span>;
    }},
    { header: 'Tarih', accessorKey: 'createdAt', cell: ({ getValue }) => <span className="text-xs text-[var(--text-muted)]">{format(new Date(getValue() as string), 'dd MMM', { locale: tr })}</span> },
    { header: '', id: 'actions', cell: ({ row }) => row.original.status === 'DISPUTED' ? (
      <Button size="xs" variant="warning" onClick={(e) => { e.stopPropagation(); }}>Çöz</Button>
    ) : null },
  ];

  if (offersLoading) return <PageSpinner />;

  // Summary stats
  const totalMargin = (listings as MarketListing[]).reduce((a, l) => a + (l.salePrice - l.costPrice), 0);
  const activeListings = (listings as MarketListing[]).filter((l) => l.status === 'ACTIVE').length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Backlink Market</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Yayıncı teklifleri, ilanlar ve siparişler</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="flex items-center gap-3 p-3">
          <div className="p-2 rounded-lg bg-yellow-500/15"><DollarSign className="w-4 h-4 text-yellow-400" /></div>
          <div><p className="text-xs text-[var(--text-muted)]">Bekleyen Teklifler</p><p className="text-xl font-bold">{(offers as PublisherOffer[]).length}</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-3">
          <div className="p-2 rounded-lg bg-emerald-500/15"><CheckCircle className="w-4 h-4 text-emerald-400" /></div>
          <div><p className="text-xs text-[var(--text-muted)]">Aktif İlanlar</p><p className="text-xl font-bold">{activeListings}</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-3">
          <div className="p-2 rounded-lg bg-indigo-500/15"><TrendingUp className="w-4 h-4 text-indigo-400" /></div>
          <div><p className="text-xs text-[var(--text-muted)]">Toplam Kâr Marjı</p><p className="text-xl font-bold">${totalMargin.toLocaleString()}</p></div>
        </Card>
      </div>

      <Tabs defaultValue="offers">
        <TabsList>
          <TabsTrigger value="offers">Yayıncı Teklifleri ({(offers as PublisherOffer[]).length})</TabsTrigger>
          <TabsTrigger value="listings">Aktif İlanlar ({(listings as MarketListing[]).length})</TabsTrigger>
          <TabsTrigger value="orders">Siparişler ({(orders as BacklinkOrder[]).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="offers">
          <DataTable columns={offerCols} data={offers as PublisherOffer[]} searchPlaceholder="Domain ara..." emptyMessage="Bekleyen teklif yok." />
        </TabsContent>

        <TabsContent value="listings">
          <DataTable columns={listingCols} data={listings as MarketListing[]} searchPlaceholder="Domain ara..." emptyMessage="İlan bulunamadı." />
        </TabsContent>

        <TabsContent value="orders">
          <DataTable columns={orderCols} data={orders as BacklinkOrder[]} searchPlaceholder="Müşteri, domain ara..." emptyMessage="Sipariş bulunamadı." />
        </TabsContent>
      </Tabs>

      {/* Approve Offer Modal */}
      <Modal
        open={!!approveOffer}
        onClose={() => { setApproveOffer(null); reset(); }}
        title={`Teklif Onayla — ${approveOffer?.domain}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setApproveOffer(null); reset(); }}>Vazgeç</Button>
            <Button variant="success" loading={approveMutation.isPending}
              onClick={handleSubmit((d) => { if (approveOffer) approveMutation.mutate({ id: approveOffer.id, data: d as { salePrice: number; adminNote?: string } }); })}>
              Onayla & İlan Oluştur
            </Button>
          </>
        }
      >
        {approveOffer && (
          <form className="space-y-3">
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">Maliyet:</span><span className="font-medium">${approveOffer.costPrice}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">DR:</span><span className="font-medium">{approveOffer.dr}</span></div>
            </div>
            <Input label="Satış Fiyatı ($)" type="number" step="1" {...register('salePrice')} error={errors.salePrice?.message} />
            <Input label="Admin Notu (opsiyonel)" placeholder="İç not..." {...register('adminNote')} />
          </form>
        )}
      </Modal>
    </div>
  );
}
