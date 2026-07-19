'use client';

import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SerpPreviewProps {
  url: string;
  title: string;
  description: string;
  faviconUrl?: string;
  className?: string;
}

function getBreadcrumb(url: string): { host: string; path: string } {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const segments = u.pathname.split('/').filter(Boolean);
    return { host: u.hostname.replace(/^www\./, ''), path: segments.length ? segments.join(' › ') : '' };
  } catch {
    return { host: url, path: '' };
  }
}

export function SerpPreview({ url, title, description, faviconUrl, className }: SerpPreviewProps) {
  const { host, path } = getBreadcrumb(url);

  return (
    <div
      className={cn('rounded-2xl border border-white/10 bg-white p-4 max-w-xl', className)}
      style={{ fontFamily: 'Arial, Helvetica, "Segoe UI", sans-serif' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={faviconUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Globe className="h-3.5 w-3.5 text-gray-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] text-[#202124] leading-tight truncate">{host}</p>
          <p className="text-[12px] text-[#4d5156] leading-tight truncate">
            {url}
            {path && <span className="text-[#4d5156]"> › {path}</span>}
          </p>
        </div>
      </div>
      <h3
        className="text-[#1a0dab] text-[20px] leading-snug mt-1 overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ maxWidth: '600px' }}
      >
        {title || 'Başlık girilmedi'}
      </h3>
      <p className="text-[#4d5156] text-[14px] leading-snug mt-1 line-clamp-2">
        {description || 'Açıklama girilmedi.'}
      </p>
    </div>
  );
}

export default SerpPreview;
