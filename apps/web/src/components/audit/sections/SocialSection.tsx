'use client';

import { Facebook, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';
import { CheckRow } from './CheckRow';

export interface SocialJson {
  profiles?: { platform: string; url: string; found: boolean }[];
  openGraph?: { title: string | null; description: string | null; image: string | null; type: string | null };
  twitterCard?: { type: string | null };
  facebookPixel?: boolean;
}

export interface SocialSectionProps {
  data: SocialJson | null;
}

const PLATFORM_ICON: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
};

export function SocialSection({ data }: SocialSectionProps) {
  if (!data) {
    return <div className="rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm">Sosyal medya verisi için bir denetim çalıştırın.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-white/70 mb-2">Sosyal Medya Profilleri</h4>
        <div className="flex flex-wrap gap-2">
          {(data.profiles ?? []).map((p) => {
            const Icon = PLATFORM_ICON[p.platform] ?? Facebook;
            return (
              <div
                key={p.platform}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${p.found ? 'border-green-500/20 bg-green-500/10 text-green-300' : 'border-white/10 bg-white/2 text-white/30'}`}
              >
                <Icon className="h-4 w-4" />
                <span className="capitalize">{p.platform}</span>
                <span>{p.found ? '✅' : '❌'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {data.openGraph && (
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2">Open Graph Önizlemesi</h4>
          <div className="rounded-xl border border-white/10 bg-white/2 overflow-hidden max-w-sm">
            {data.openGraph.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.openGraph.image} alt="" className="w-full h-40 object-cover" />
            )}
            <div className="p-3">
              <p className="text-sm text-white/90 font-medium truncate">{data.openGraph.title ?? '(og:title yok)'}</p>
              <p className="text-xs text-white/50 mt-1 line-clamp-2">{data.openGraph.description ?? '(og:description yok)'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <CheckRow label="Open Graph etiketleri" ok={!!data.openGraph?.title} />
        <CheckRow label="Twitter/X Card" ok={!!data.twitterCard?.type} detail={data.twitterCard?.type ?? undefined} />
        <CheckRow label="Facebook Pixel" ok={!!data.facebookPixel} />
      </div>
    </div>
  );
}

export default SocialSection;
