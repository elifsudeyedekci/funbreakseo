// ============================================================
// Shared Types — FunBreak SEO
// ============================================================

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'CUSTOMER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED';
export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type ContentStatus = 'DRAFT' | 'GENERATING' | 'REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';
export type IssueSeverity = 'CRITICAL' | 'WARNING' | 'NOTICE';
export type IssueCategory = 'TITLE' | 'META' | 'HEADING' | 'CONTENT' | 'TECHNICAL' | 'SPEED' | 'SCHEMA' | 'LINKS' | 'MOBILE' | 'SECURITY' | 'PERFORMANCE' | 'USABILITY' | 'SOCIAL' | 'TECHNOLOGY' | 'LOCAL_SEO';

/** 0-100 numeric score mapped to a competitor-style letter grade (A+ .. F-). */
export function scoreToLetterGrade(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  if (s >= 97) return 'A+';
  if (s >= 93) return 'A';
  if (s >= 90) return 'A-';
  if (s >= 87) return 'B+';
  if (s >= 83) return 'B';
  if (s >= 80) return 'B-';
  if (s >= 77) return 'C+';
  if (s >= 73) return 'C';
  if (s >= 70) return 'C-';
  if (s >= 67) return 'D+';
  if (s >= 63) return 'D';
  if (s >= 60) return 'D-';
  if (s >= 50) return 'F+';
  if (s >= 30) return 'F';
  return 'F-';
}

export interface CategoryScore {
  score: number;
  grade: string;
}

export interface PriorityRecommendation {
  code: string;
  title: string;
  category: IssueCategory;
  priority: 'CRITICAL' | 'MEDIUM' | 'LOW';
  howToFix: string;
  affectedCount?: number;
}

export interface SiteAuditReportDTO {
  id: string;
  crawlJobId: string;
  projectId: string;
  overallScore: number;
  overallGrade: string;
  categoryScores: {
    onPage: CategoryScore;
    geo: CategoryScore;
    backlink: CategoryScore;
    usability: CategoryScore;
    performance: CategoryScore;
  };
  recommendationsCount: number;
  recommendations: PriorityRecommendation[];
  onPage: Record<string, unknown> | null;
  geo: Record<string, unknown> | null;
  performance: Record<string, unknown> | null;
  usability: Record<string, unknown> | null;
  social: Record<string, unknown> | null;
  technology: Record<string, unknown> | null;
  localSeo: Record<string, unknown> | null;
  crawlList: Record<string, unknown> | null;
  screenshotDesktopUrl: string | null;
  screenshotMobileUrl: string | null;
  screenshotTabletUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
export type GeoPlatform = 'CHATGPT' | 'GEMINI' | 'PERPLEXITY' | 'CLAUDE' | 'GOOGLE_AI_OVERVIEW' | 'GOOGLE_AI_MODE';
export type OrderStatus = 'PENDING_PAYMENT' | 'ESCROW_HELD' | 'CONTENT_READY' | 'PUBLISHED' | 'VERIFIED' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED';
export type KeywordIntent = 'INFORMATIONAL' | 'NAVIGATIONAL' | 'TRANSACTIONAL' | 'COMMERCIAL';

// Supported locales
export const SUPPORTED_LOCALES = ['tr', 'en', 'de', 'fr', 'es', 'ar', 'ru', 'hi'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

// RTL locales
export const RTL_LOCALES: Locale[] = ['ar'];

// Currency per locale
export const LOCALE_CURRENCY: Record<Locale, string> = {
  tr: 'TRY',
  en: 'USD',
  de: 'EUR',
  fr: 'EUR',
  es: 'EUR',
  ar: 'SAR',
  ru: 'RUB',
  hi: 'INR',
};

// Currency symbols
export const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SAR: '﷼',
  AED: 'د.إ',
  RUB: '₽',
  INR: '₹',
};

// Plan limits type
export interface PlanLimits {
  projects: number;
  keywords: number;
  monthlyCrawls: number;
  aiBlogsPerProject: number;
  geoQueries: number;
  outreachCampaigns: number;
  teamSeats: number;
  technicalFixSites: number;
  whitelabelReports: boolean;
  customerApi: boolean;
  prioritySupport: boolean;
  trackingDepth: 'FIRST_PAGE' | 'TOP_100';
}

// API Response types
export interface ApiResponse<T = unknown> {
  data: T;
  meta?: PaginationMeta;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

// Auth types
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Dashboard summary
export interface DashboardSummary {
  healthScore: number;
  geoVisibilityScore: number;
  keywordsCount: number;
  firstPageKeywords: number;
  lastCrawlDate: string | null;
  backlinkCount: number;
  activeOutreach: number;
  avgPosition: number | null;
}

// Rank position distribution
export interface RankDistribution {
  top3: number;
  top10: number;
  top20: number;
  top50: number;
  top100: number;
  notRanking: number;
}

// SEO Score breakdown
export interface SeoScoreBreakdown {
  criterion: string;
  score: number;
  maxScore: number;
  note: string;
}

// GEO visibility
export interface GeoVisibilityData {
  mentionCount: number;
  citationCount: number;
  citationToMentionRatio: number;
  shareOfVoice: number;
  byPlatform: Record<GeoPlatform, { mentions: number; citations: number }>;
}

// Usage quota
export interface UsageQuota {
  keywords: { used: number; limit: number };
  crawls: { used: number; limit: number };
  aiBlogs: { used: number; limit: number };
  geoQueries: { used: number; limit: number };
  outreachCampaigns: { used: number; limit: number };
}

// Financial summary
export interface FinancialSummary {
  revenue: number;
  expenses: number;
  netProfit: number;
  mrr: number;
  profitMargin: number;
  revenueBreakdown: {
    subscriptions: number;
    renewals: number;
    backlinkMarket: number;
    walletTopups: number;
  };
  expenseBreakdown: {
    dataForSeo: number;
    llm: number;
    autopilot: number;
    server: number;
  };
}
