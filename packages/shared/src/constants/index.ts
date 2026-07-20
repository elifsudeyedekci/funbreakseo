export const PLANS = {
  STARTER: 'starter',
  GROWTH: 'growth',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export const DEFAULT_PLAN_LIMITS = {
  starter: {
    projects: 1,
    keywords: 50,
    monthlyCrawls: 5,
    aiBlogsPerProject: 5,
    geoQueries: 25,
    outreachCampaigns: 0,
    teamSeats: 1,
    technicalFixSites: 1,
    whitelabelReports: false,
    customerApi: false,
    prioritySupport: false,
    trackingDepth: 'FIRST_PAGE',
    backlinkSyncsPerMonth: 2,
    competitorComparisonsPerMonth: 3,
    fullAuditReport: false,
    crawlPageLimit: 100,
  },
  growth: {
    projects: 5,
    keywords: 250,
    monthlyCrawls: 25,
    aiBlogsPerProject: 25,
    geoQueries: 150,
    outreachCampaigns: 2,
    teamSeats: 3,
    technicalFixSites: 5,
    whitelabelReports: true,
    customerApi: false,
    prioritySupport: false,
    trackingDepth: 'TOP_100',
    backlinkSyncsPerMonth: 10,
    competitorComparisonsPerMonth: 20,
    fullAuditReport: true,
    crawlPageLimit: 500,
  },
  pro: {
    projects: 15,
    keywords: 1000,
    monthlyCrawls: 100,
    aiBlogsPerProject: 100,
    geoQueries: 750,
    outreachCampaigns: 10,
    teamSeats: 10,
    technicalFixSites: 15,
    whitelabelReports: true,
    customerApi: true,
    prioritySupport: true,
    trackingDepth: 'TOP_100',
    backlinkSyncsPerMonth: 60,
    competitorComparisonsPerMonth: 100,
    fullAuditReport: true,
    crawlPageLimit: 999999,
  },
  enterprise: {
    projects: 999999,
    keywords: 999999,
    monthlyCrawls: 999999,
    aiBlogsPerProject: 999999,
    geoQueries: 999999,
    outreachCampaigns: 999999,
    teamSeats: 999999,
    technicalFixSites: 999999,
    whitelabelReports: true,
    customerApi: true,
    prioritySupport: true,
    trackingDepth: 'TOP_100',
    backlinkSyncsPerMonth: 999999,
    competitorComparisonsPerMonth: 999999,
    fullAuditReport: true,
    crawlPageLimit: 999999,
  },
};

export const PLAN_PRICES_TRY = {
  starter: { monthly: 499, yearly: 4990 },
  growth: { monthly: 999, yearly: 9990 },
  pro: { monthly: 2499, yearly: 24990 },
  enterprise: { monthly: 0, yearly: 0 }, // custom
};

export const VAT_RATE = 0.20;

export const WHATSAPP_URL = 'https://wa.me/905334488253?text=Merhaba%2C%20FunBreak%20SEO%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum.';
export const SUPPORT_PHONE = '0533 448 82 53';
export const SUPPORT_EMAIL = 'destek@funbreakseo.com';
export const OUTREACH_EMAIL = 'pr@funbreakseo.com';
export const ADMIN_EMAIL = 'doganizzetcan@gmail.com';
export const COMPANY_NAME = 'FunBreak Global Teknoloji Ltd. Şti.';
export const APP_URL = 'https://funbreakseo.com';
export const ADMIN_URL = 'https://admin.funbreakseo.com';
export const API_URL = 'https://api.funbreakseo.com';

export const TRIAL_DAYS = 14;
export const PAST_DUE_SUSPEND_DAYS = 7;
export const ARCHIVED_AFTER_DAYS = 30;

export const ONBOARDING_STEPS = [
  'add_project',
  'connect_gsc',
  'add_keywords',
  'start_crawl',
  'generate_content',
] as const;

export const GEO_PLATFORMS = [
  'CHATGPT',
  'GEMINI',
  'PERPLEXITY',
  'CLAUDE',
  'GOOGLE_AI_OVERVIEW',
  'GOOGLE_AI_MODE',
] as const;

export const CONTENT_SCORE_CRITERIA = [
  'KEYWORD_USAGE',
  'HEADING_STRUCTURE',
  'META',
  'INTERNAL_LINKS',
  'SCHEMA',
  'ENTITY_COVERAGE',
  'ANSWER_FIRST',
  'READABILITY',
] as const;

export const DR_TIERS = [
  { label: 'DR 0-20', min: 0, max: 20 },
  { label: 'DR 20-30', min: 20, max: 30 },
  { label: 'DR 30-50', min: 30, max: 50 },
  { label: 'DR 50-70', min: 50, max: 70 },
  { label: 'DR 70+', min: 70, max: 100 },
] as const;

export const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'RUB', 'INR'] as const;

export const LEGAL_DOCUMENT_TYPES = [
  'DISTANCE_SALES',
  'PRE_INFO',
  'TERMS',
  'KVKK',
  'PRIVACY',
  'COOKIE',
  'REFUND',
] as const;

export const CONSENT_TYPES_FOR_REGISTRATION = ['TERMS', 'KVKK'] as const;
export const CONSENT_TYPES_FOR_PAYMENT = ['DISTANCE_SALES', 'PRE_INFO', 'TERMS', 'KVKK'] as const;
