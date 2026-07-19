// ---------------------------------------------------------------------------
// Performance-audit engine — shared data shapes.
// This exact shape is the contract the frontend renders against — field
// names must stay identical to what monthly-report / dashboard expect.
// ---------------------------------------------------------------------------

export type CwvRating = 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR'

export interface PsiStrategyResult {
  score: number
  fcp: number
  speedIndex: number
  lcp: number
  tti: number
  tbt: number
  cls: number
}

export interface CoreWebVitalMetric {
  value: number
  rating: CwvRating
}

export interface CoreWebVitalsStrategyResult {
  lcp: CoreWebVitalMetric
  inp: CoreWebVitalMetric
  cls: CoreWebVitalMetric
}

export interface PerformanceOpportunity {
  id: string
  title: string
  savingsMs: number
}

export interface SizeBreakdown {
  html: number
  css: number
  js: number
  images: number
  fonts: number
  other: number
}

export interface CompressionByType {
  type: string
  ratio: number
}

export interface RequestsByType {
  type: string
  count: number
}

export interface PerformanceReport {
  serverResponseMs: number
  pageLoadMs: number
  scriptsCompleteMs: number
  downloadSizeBytes: number
  sizeBreakdown: SizeBreakdown
  compressionRatio: number
  compressionByType: CompressionByType[]
  requestCount: number
  requestsByType: RequestsByType[]
  opportunities: PerformanceOpportunity[]
  usesHttp2: boolean
  isAmp: boolean
  hasConsoleErrors: boolean
  minified: { js: boolean; css: boolean }
  deprecatedHtml: boolean
  hasInlineStyles: boolean
  psi: {
    mobile: PsiStrategyResult | null
    desktop: PsiStrategyResult | null
  }
  coreWebVitals: {
    mobile: CoreWebVitalsStrategyResult | null
    desktop: CoreWebVitalsStrategyResult | null
  }
  recommendations: import('@funbreakseo/shared').PriorityRecommendation[]
}

// Internal shape captured from performance.getEntriesByType() inside the page.
export interface RawResourceEntry {
  name: string
  transferSize: number
  encodedBodySize: number
  decodedBodySize: number
  initiatorType: string
  nextHopProtocol: string
  duration: number
}

export interface RawNavigationEntry {
  transferSize: number
  encodedBodySize: number
  decodedBodySize: number
  responseStart: number
  requestStart: number
  loadEventEnd: number
  domContentLoadedEventEnd: number
  fetchStart: number
  nextHopProtocol: string
}

export interface RawPerfSnapshot {
  nav: RawNavigationEntry | null
  resources: RawResourceEntry[]
}
