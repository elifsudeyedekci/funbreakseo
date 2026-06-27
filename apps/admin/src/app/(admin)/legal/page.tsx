'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toaster';
import { FileText, Edit3, Save, X, Clock } from 'lucide-react';

interface LegalDoc {
  id: string;
  key: string;
  title: string;
  content: string;
  version: string;
  updatedAt: string;
}

const MOCK_DOCS: LegalDoc[] = [
  {
    id: '1', key: 'terms', title: 'Kullanım Şartları', version: '2.1',
    updatedAt: '2026-03-15T10:00:00Z',
    content: 'FunBreak SEO platformunu kullanarak bu şartları kabul etmiş sayılırsınız. Platform yalnızca yasal amaçlar için kullanılabilir...',
  },
  {
    id: '2', key: 'privacy', title: 'Gizlilik Politikası', version: '1.8',
    updatedAt: '2026-04-01T14:30:00Z',
    content: 'Kişisel verileriniz KVKK kapsamında işlenmektedir. Toplanan veriler: e-posta, isim, kullanım logları...',
  },
  {
    id: '3', key: 'kvkk', title: 'KVKK Aydınlatma Metni', version: '1.3',
    updatedAt: '2026-04-01T14:30:00Z',
    content: '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu sıfatıyla FunBreak Global Teknoloji Ltd. Şti...',
  },
  {
    id: '4', key: 'cookie', title: 'Çerez Politikası', version: '1.1',
    updatedAt: '2026-02-20T09:00:00Z',
    content: 'Sitemizde zorunlu, analitik ve pazarlama amaçlı çerezler kullanılmaktadır...',
  },
  {
    id: '5', key: 'distance_sales', title: 'Mesafeli Satış Sözleşmesi', version: '2.0',
    updatedAt: '2026-01-10T11:00:00Z',
    content: '6502 sayılı Tüketicinin Korunması Hakkında Kanun kapsamında mesafeli satış sözleşmesi...',
  },
  {
    id: '6', key: 'refund', title: 'İptal & İade Politikası', version: '1.5',
    updatedAt: '2026-03-01T08:00:00Z',
    content: 'Yıllık planlar için 30 gün içinde iade talep edilebilir. Aylık planlar için iade yapılmamaktadır...',
  },
];

export default function LegalPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const { data: docs, isLoading } = useQuery({
    queryKey: ['admin-legal-docs'],
    queryFn: async () => {
      try {
        const r = await adminApi.get('/admin/legal-docs');
        return (r.data?.data ?? []) as LegalDoc[];
      } catch {
        return [];
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      adminApi.patch(`/admin/legal-docs/${id}`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-legal-docs'] });
      toast('Belge güncellendi', 'success');
      setEditingId(null);
    },
    onError: () => toast('Güncelleme başarısız', 'error'),
  });

  const startEdit = (doc: LegalDoc) => {
    setEditingId(doc.id);
    setEditContent(doc.content);
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Yasal Belgeler</h1>
          <p>Kullanım şartları, gizlilik politikaları ve diğer yasal metinler</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(docs ?? []).map((doc) => (
          <Card key={doc.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{doc.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary">v{doc.version}</Badge>
                      <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                        <Clock className="w-3 h-3" />
                        {new Date(doc.updatedAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                </div>
                {editingId !== doc.id ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={() => startEdit(doc)}
                  >
                    Düzenle
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Save className="w-3.5 h-3.5" />}
                      loading={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: doc.id, content: editContent })}
                    >
                      Kaydet
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<X className="w-3.5 h-3.5" />}
                      onClick={() => setEditingId(null)}
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingId === doc.id ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={8}
                  className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-y font-mono"
                />
              ) : (
                <p className="text-sm text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                  {doc.content}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
