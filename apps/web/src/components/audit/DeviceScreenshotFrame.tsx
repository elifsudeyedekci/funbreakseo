'use client';

import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DeviceScreenshotFrameProps {
  desktop?: string | null;
  tablet?: string | null;
  mobile?: string | null;
  className?: string;
}

function DeviceSlot({
  src,
  label,
  chrome,
}: {
  src?: string | null;
  label: string;
  chrome: 'desktop' | 'tablet' | 'mobile';
}) {
  const frameClass =
    chrome === 'desktop'
      ? 'rounded-lg border-[6px] border-b-[16px] border-white/15 bg-black/40 aspect-[16/10] w-full'
      : chrome === 'tablet'
        ? 'rounded-2xl border-[10px] border-white/15 bg-black/40 aspect-[3/4] w-full max-w-[220px]'
        : 'rounded-[1.75rem] border-[8px] border-white/15 bg-black/40 aspect-[9/19] w-full max-w-[150px]';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn('relative overflow-hidden', frameClass)}>
        {chrome === 'mobile' && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1.5 w-10 rounded-b-full bg-black/60 z-10" />
        )}
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} className="h-full w-full object-cover object-top" />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 bg-white/5 animate-pulse">
            <ImageOff className="h-6 w-6 text-white/20" />
            <span className="text-[10px] text-white/25">Görsel yok</span>
          </div>
        )}
      </div>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  );
}

export function DeviceScreenshotFrame({ desktop, tablet, mobile, className }: DeviceScreenshotFrameProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-4 overflow-x-auto', className)}>
      <div className="w-full sm:flex-1 sm:min-w-[220px]">
        <DeviceSlot src={desktop} label="Masaüstü" chrome="desktop" />
      </div>
      <DeviceSlot src={tablet} label="Tablet" chrome="tablet" />
      <DeviceSlot src={mobile} label="Mobil" chrome="mobile" />
    </div>
  );
}

export default DeviceScreenshotFrame;
