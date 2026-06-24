"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Copy, Code2 } from "lucide-react";
import { developerApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

const AVAILABLE_SCOPES = [
  "projects:read", "projects:write",
  "keywords:read", "keywords:write",
  "content:read", "content:write",
  "geo:read", "reports:read",
];

export default function DeveloperPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["projects:read"]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => developerApi.apiKeys().then((r) => r.data.data as ApiKey[]),
  });

  const createMutation = useMutation({
    mutationFn: () => developerApi.createApiKey({ name: newKeyName, scopes: selectedScopes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setShowModal(false);
      setNewKeyName("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => developerApi.deleteApiKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  function copyKey(key: string, id: string) {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const keys = data || [];

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Developer</h1>
          <p className="text-white/50 text-sm mt-1">API anahtarlarini yonetin</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all">
          <Plus className="h-4 w-4" />Yeni Anahtar
        </button>
      </div>
      <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex items-start gap-3">
        <Code2 className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-white mb-1">API Dokumantasyonu</p>
          <a href="https://docs.funbreakseo.com/api" target="_blank" rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 underline">docs.funbreakseo.com/api</a>
        </div>
      </div>
      {keys.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center text-white/30 text-sm">Henuz API anahtari olusturulmamis</div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k.id} className="rounded-2xl border border-white/10 bg-white/2 p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-semibold text-white">{k.name}</h3>
                  <p className="text-xs text-white/40 mt-0.5">Olusturuldu: {formatDate(k.createdAt)}</p>
                </div>
                <button onClick={() => deleteMutation.mutate(k.id)}
                  className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2 font-mono text-xs mb-3">
                <span className="flex-1 text-white/60 truncate">{k.key.slice(0,8)}{"x".repeat(24)}</span>
                <button onClick={() => copyKey(k.key, k.id)} className="text-white/30 hover:text-white"><Copy className="h-3.5 w-3.5" /></button>
                {copiedId === k.id && <span className="text-emerald-400 text-xs">Kopyalandi!</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {k.scopes.map((s) => (<span key={s} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50 font-mono">{s}</span>))}
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Yeni API Anahtari</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Anahtar Adi</label>
                <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-500/50 focus:outline-none"
                  placeholder="Production API" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Yetkiler</label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <label key={scope} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={selectedScopes.includes(scope)}
                        onChange={(e) => setSelectedScopes((prev) => e.target.checked ? [...prev, scope] : prev.filter((s) => s !== scope))}
                        className="rounded border border-white/20 bg-white/5 text-indigo-600 cursor-pointer h-3.5 w-3.5" />
                      <span className="text-xs font-mono text-white/60">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-white/20 py-2.5 text-sm font-medium text-white/60 hover:bg-white/10">Iptal</button>
                <button onClick={() => createMutation.mutate()} disabled={!newKeyName || createMutation.isPending}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                  {createMutation.isPending ? "Olusturuluyor..." : "Olustur"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}