'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { outreachApi } from '@/lib/api';

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalProspects: number;
  contacted: number;
  replied: number;
  positiveReplies: number;
  createdAt: string;
}

export default function OutreachPage({ params }: { params: { projectId: string } }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('BACKLINK');

  const { data, isLoading } = useQuery({
    queryKey: ['outreach', params.projectId],
    queryFn: () => outreachApi.campaigns(params.projectId).then((r) => r.data.data as Campaign[]),
  });

  const createMutation = useMutation({
    mutationFn: () => outreachApi.createCampaign(params.projectId, { name, goal }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach', params.projectId] });
      setShowModal(false);
      setName('');
    },
  });

  const campaigns = data || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Outreach Kampanyalari</h1>
        <button onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all">
          <Plus className="h-4 w-4" /> Yeni Kampanya
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-xl border border-white/10 h-24 animate-pulse" />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center">
          <p className="text-white/50 mb-4">Henuz kampanya yok</p>
          <button onClick={() => setShowModal(true)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-all">
            Ilk Kampanyayi Olustur
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => {
            const funnel = [
              { label: 'Toplam', value: c.totalProspects, color: 'text-white' },
              { label: 'Iletisime Gecildi', value: c.contacted, color: 'text-indigo-400' },
              { label: 'Yanit Alindi', value: c.replied, color: 'text-yellow-400' },
              { label: 'Olumlu', value: c.positiveReplies, color: 'text-emerald-400' },
            ];
            return (
              <div key={c.id} className="rounded-2xl border border-white/10 bg-white/2 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-white">{c.name}</h2>
                    <p className="text-xs text-white/40 mt-0.5">{c.createdAt ? new Date(c.createdAt).toLocaleDateString('tr-TR') : ''}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{c.status}</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {funnel.map((f) => (
                    <div key={f.label} className="text-center rounded-lg bg-white/3 py-2">
                      <div className={['text-xl font-bold', f.color].join(' ')}>{f.value}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">{f.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Yeni Kampanya</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Kampanya Adi</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none"
                  placeholder="Q3 Backlink Kampanyasi" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Hedef</label>
                <select value={goal} onChange={(e) => setGoal(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none">
                  <option value="BACKLINK">Backlink Kazanimi</option>
                  <option value="PARTNERSHIP">Ortaklik</option>
                  <option value="GUEST_POST">Misafir Yazi</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-white/20 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10">Iptal</button>
                <button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                  {createMutation.isPending ? 'Olusturuluyor...' : 'Olustur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}