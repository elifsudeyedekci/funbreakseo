'use client';

import { DeviceScreenshotFrame } from '../DeviceScreenshotFrame';
import { CheckRow } from './CheckRow';

export interface UsabilityJson {
  hasViewportMeta?: boolean;
  smallFontCount?: number;
  smallTouchTargetCount?: number;
  hasFlashOrIframe?: boolean;
  hasFavicon?: boolean;
  plainTextEmailExposed?: boolean;
}

export interface UsabilitySectionProps {
  data: UsabilityJson | null;
  screenshots?: { desktop: string | null; mobile: string | null; tablet: string | null };
}

export function UsabilitySection({ data, screenshots }: UsabilitySectionProps) {
  if (!data) {
    return <div className="rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm">Kullanılabilirlik verisi için bir denetim çalıştırın.</div>;
  }

  return (
    <div className="space-y-6">
      {screenshots && (screenshots.desktop || screenshots.tablet || screenshots.mobile) && (
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-3">Cihaz Görünümleri</h4>
          <DeviceScreenshotFrame desktop={screenshots.desktop} tablet={screenshots.tablet} mobile={screenshots.mobile} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <CheckRow label="Viewport meta etiketi" ok={!!data.hasViewportMeta} info="Mobil cihazlarda doğru ölçeklendirme için gereklidir." />
        <CheckRow label="Okunabilir font boyutu" ok={(data.smallFontCount ?? 0) === 0} detail={(data.smallFontCount ?? 0) > 0 ? `${data.smallFontCount} öğe 16px altında` : undefined} />
        <CheckRow label="Dokunmatik hedef boyutu (44×44px)" ok={(data.smallTouchTargetCount ?? 0) === 0} detail={(data.smallTouchTargetCount ?? 0) > 0 ? `${data.smallTouchTargetCount} öğe çok küçük` : undefined} />
        <CheckRow label="Flash / iFrame yok" ok={!data.hasFlashOrIframe} />
        <CheckRow label="Favicon mevcut" ok={!!data.hasFavicon} />
        <CheckRow label="E-posta gizliliği (düz metin yok)" ok={!data.plainTextEmailExposed} info="Düz metin e-posta adresleri spam botları tarafından toplanabilir." />
      </div>
    </div>
  );
}

export default UsabilitySection;
