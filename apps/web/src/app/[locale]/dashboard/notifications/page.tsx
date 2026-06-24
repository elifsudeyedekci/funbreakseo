'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { notificationApi } from '@/lib/api';

const PREF_GROUPS = [
  { label: 'Teknik SEO', prefs: [
    { key: 'crawl_complete', label: 'Tarama tamamlandı' },
    { key: 'critical_issue_found', label: 'Kritik sorun tespit edildi' },
    { key: 'health_score_change', label: 'Sağlık skoru değişimi' },
  ]},
  { label: 'İçerik & GEO', prefs: [
    { key: 'content_ready', label: 'İçerik üretimi tamamlandı' },
    { key: 'geo_mention', label: 'Yeni GEO mention tespit edildi' },
  ]},
  { label: 'Backlink & Outreach', prefs: [
    { key: 'link_verified', label: 'Backlink doğrulandı' },
    { key: 'outreach_reply', label: 'Outreach yanıtı alındı' },
  ]},
  { label: 'Faturalama', prefs: [
    { key: 'payment_success', label: 'Ödeme başarılı' },
    { key: 'payment_failed', label: 'Ödeme başarısız' },
    { key: 'trial_ending', label: 'Deneme süresi bitiyor (3 gün önce)' },
  ]},
];

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: () => notificationApi.preferences().then((r) => r.data.data as Record<string, boolean>),
    initialData: {} as Record<string, boolean>,
  });

  const updateMutation = useMutation({
    mutationFn: (prefs: Record<string, boolean>) => notificationApi.updatePreferences(prefs),
    onMutate: async (newPrefs) => {
      await queryClient.cancelQueries({ queryKey: ['notification-prefs'] });
      queryClient.setQueryData(['notification-prefs'], (old: Record<string, boolean>) => ({ ...old, ...newPrefs }));
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: () => notificationApi.unsubscribeMarketing(),
  });

  function toggle(key: string) {
    updateMutation.mutate({ [key]: !data?.[key] });
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Bildirim Tercihleri</h1>
      <p className="text-white/50 text-sm mb-8">E-posta bildirimlerini özelleştirin</p>

      <div className="space-y-6">
        {PREF_GROUPS.map((group) => (
          <div key={group.label} className="rounded-2xl border border-white/10 bg-white/2 p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-indigo-400" />
              {group.label}
            </h2>
            <div className="space-y-3">
              {group.prefs.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-white/70">{label}</span>
                  <button
                    onClick={() => toggle(key)}
                    role="switch"
                    aria-checked={!!data?.[key]}
                    className={`relative h-5 w-9 rounded-full transition-colors ${data?.[key] ? 'bg-indigo-600' : 'bg-white/20'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${data?.[key] ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-white/10 bg-white/2 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Pazarlama E-postaları</p>
              <p className="text-xs text-white/40 mt-0.5">Ürün güncellemeleri, kampanyalar ve ipuçları</p>
            </div>
            <button
              onClick={() => unsubscribeMutation.mutate()}
              disabled={unsubscribeMutation.isSuccess}
              className="rounded-xl border border-white/20 px-4 py-1.5 text-xs font-medium text-white/50 hover:bg-white/10 disabled:opacity-40 transition-colors"
            >
              {unsubscribeMutation.isSuccess ? 'Abonelikten Çıkıldı' : 'Tümünü Durdur'}
            </button>
          </div>
        </div>

        <p className="text-xs text-white/25">
          Not: Zorunlu işlem bildirimleri bu ayarlardan etkilenmez.
        </p>
      </div>
    </div>
  );
}
