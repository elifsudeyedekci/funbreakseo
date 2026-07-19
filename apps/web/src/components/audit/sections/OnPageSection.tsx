'use client';

import { SerpPreview } from '../SerpPreview';
import { CharacterLimitBar } from '../CharacterLimitBar';
import { HeadingDistributionBars } from '../HeadingDistributionBars';
import { KeywordConsistencyMatrix } from '../KeywordConsistencyMatrix';
import { CheckRow } from './CheckRow';

export interface OnPageJson {
  serpPreview?: { url: string; title: string | null; description: string | null };
  headingDistribution?: Record<'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6', number>;
  h1Text?: string | null;
  hreflang?: { lang: string; url: string }[];
  lang?: string | null;
  canonicalUrl?: string | null;
  noindexMeta?: boolean;
  noindexHeader?: boolean;
  schemaTypes?: string[];
  analytics?: { ga4: boolean; gtm: boolean; universalAnalytics: boolean };
  wordCount?: number;
  sslValid?: boolean;
  keywordMatrix?: { phrase: string; inTitle: boolean; inMeta: boolean; inH1: boolean; inH2: boolean }[];
  sitemap?: { found: boolean; url: string };
  robotsTxt?: { url: string; found: boolean; blocking: boolean };
}

export interface OnPageSectionProps {
  data: OnPageJson | null;
}

export function OnPageSection({ data }: OnPageSectionProps) {
  if (!data) {
    return <div className="rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm">Sayfa içi SEO verisi için bir denetim çalıştırın.</div>;
  }

  const title = data.serpPreview?.title ?? '';
  const description = data.serpPreview?.description ?? '';
  const headingCounts = data.headingDistribution
    ? (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'] as const).map((level) => ({ level, count: data.headingDistribution![level] }))
    : [];

  return (
    <div className="space-y-6">
      {data.serpPreview && (
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2">Google SERP Önizlemesi</h4>
          <SerpPreview url={data.serpPreview.url} title={title || '(başlık yok)'} description={description || '(açıklama yok)'} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CharacterLimitBar label="Başlık Etiketi (Title)" current={title.length} idealMin={50} idealMax={60} />
        <CharacterLimitBar label="Meta Açıklama" current={description.length} idealMin={120} idealMax={160} />
      </div>

      {headingCounts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2">Başlık (H1-H6) Dağılımı</h4>
          <HeadingDistributionBars counts={headingCounts} />
        </div>
      )}

      {data.keywordMatrix && data.keywordMatrix.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2">Anahtar Kelime Tutarlılık Matrisi</h4>
          <KeywordConsistencyMatrix rows={data.keywordMatrix} />
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-white/70 mb-2">Teknik Kontroller</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <CheckRow label="XML Sitemap" ok={!!data.sitemap?.found} detail={data.sitemap?.url} info="Arama motorlarının sitenizdeki sayfaları keşfetmesini kolaylaştıran URL listesi." />
          <CheckRow label="Robots.txt taramayı engellemiyor" ok={!data.robotsTxt?.blocking} detail={data.robotsTxt?.url} info="robots.txt dosyası tüm sitenin taranmasını engelliyorsa arama motorları sayfalarınızı göremez." />
          <CheckRow label="SSL / HTTPS" ok={!!data.sslValid} />
          <CheckRow label="Canonical Etiketi" ok={!!data.canonicalUrl} detail={data.canonicalUrl ?? undefined} />
          <CheckRow label="Noindex (meta etiketi)" ok={!data.noindexMeta} info="Sayfa işaretliyse arama motorları bu sayfayı indekslemez." />
          <CheckRow label="Noindex (HTTP başlığı / X-Robots-Tag)" ok={!data.noindexHeader} info="Meta etiketinden ayrı, sunucu seviyesinde gönderilen bir indeksleme direktifi." />
          <CheckRow label="Dil (lang) beyanı" ok={!!data.lang} detail={data.lang ?? undefined} />
          <CheckRow label="Analytics (GA4/GTM)" ok={!!(data.analytics?.ga4 || data.analytics?.gtm)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div className="rounded-xl border border-white/10 bg-white/2 p-4">
          <p className="text-white/40 text-xs mb-1">İçerik Miktarı</p>
          <p className="text-white font-semibold">{data.wordCount ?? 0} kelime</p>
          <p className="text-white/30 text-xs mt-1">Min: 300, İdeal: 1500+</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/2 p-4">
          <p className="text-white/40 text-xs mb-1">Schema.org Tipleri</p>
          <p className="text-white font-semibold">{data.schemaTypes && data.schemaTypes.length > 0 ? data.schemaTypes.join(', ') : 'Bulunamadı'}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/2 p-4">
          <p className="text-white/40 text-xs mb-1">Hreflang</p>
          <p className="text-white font-semibold">
            {data.hreflang && data.hreflang.length > 0 ? data.hreflang.map((h) => h.lang).join(', ') : 'Yok'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default OnPageSection;
