import { z } from 'zod';

// Auth
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  organizationName: z.string().min(2),
  locale: z.string().default('tr'),
  consentTerms: z.literal(true, { errorMap: () => ({ message: 'Kullanım şartlarını kabul etmelisiniz' }) }),
  consentKvkk: z.literal(true, { errorMap: () => ({ message: 'KVKK metnini kabul etmelisiniz' }) }),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

// Project
export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  domain: z.string().url(),
  country: z.string().default('TR'),
  language: z.string().default('tr'),
  searchEngine: z.string().default('google.com.tr'),
});

// Keyword
export const AddKeywordSchema = z.object({
  phrase: z.string().min(1),
  location: z.string().optional(),
  language: z.string().optional(),
  trackingDepth: z.enum(['FIRST_PAGE', 'TOP_100']).optional(),
  tagId: z.string().uuid().optional(),
});

export const BulkAddKeywordsSchema = z.object({
  keywords: z.array(AddKeywordSchema),
});

// Content
export const GenerateContentSchema = z.object({
  type: z.enum(['BLOG', 'PRODUCT_DESC', 'META', 'FAQ', 'LANDING']).default('BLOG'),
  focusKeyword: z.string().min(1),
  secondaryKeywords: z.array(z.string()).optional(),
  tone: z.string().default('professional'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  language: z.string().default('tr'),
});

// GEO
export const AddGeoQuerySchema = z.object({
  prompt: z.string().min(3),
  location: z.string().optional(),
  language: z.string().optional(),
});

// Outreach
export const CreateCampaignSchema = z.object({
  name: z.string().min(1),
  targetUrl: z.string().url(),
  anchorText: z.string().optional(),
  topic: z.string().optional(),
});

// Billing
export const SubscribeSchema = z.object({
  planId: z.string().uuid(),
  cycle: z.enum(['MONTHLY', 'YEARLY']),
  couponCode: z.string().optional(),
  billingProfile: z.object({
    invoiceType: z.enum(['INDIVIDUAL', 'CORPORATE']),
    companyTitle: z.string().optional(),
    taxOffice: z.string().optional(),
    taxNumber: z.string().optional(),
    tckn: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().default('TR'),
  }).optional(),
  consentDistanceSales: z.literal(true),
  consentPreInfo: z.literal(true),
  consentTerms: z.literal(true),
  consentKvkk: z.literal(true),
});

export const ApplyCouponSchema = z.object({
  code: z.string(),
  planId: z.string().uuid(),
  cycle: z.enum(['MONTHLY', 'YEARLY']),
});

// Market
export const CreateOrderSchema = z.object({
  listingId: z.string().uuid(),
  targetUrl: z.string().url(),
  anchorText: z.string().optional(),
  contentBrief: z.string().optional(),
});

// Support
export const CreateTicketSchema = z.object({
  subject: z.string().min(3),
  category: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  message: z.string().min(10),
});

// Admin approvals
export const ApproveOfferSchema = z.object({
  salePrice: z.number().positive(),
  drTier: z.string().optional(),
  adminNote: z.string().optional(),
});

export const ChangePlanSchema = z.object({
  planId: z.string().uuid(),
  isComplimentary: z.boolean().default(false),
  complimentaryReason: z.string().optional(),
  complimentaryUntil: z.string().datetime().optional(),
});

// Pagination
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
export type AddKeywordDto = z.infer<typeof AddKeywordSchema>;
export type GenerateContentDto = z.infer<typeof GenerateContentSchema>;
export type AddGeoQueryDto = z.infer<typeof AddGeoQuerySchema>;
export type CreateCampaignDto = z.infer<typeof CreateCampaignSchema>;
export type SubscribeDto = z.infer<typeof SubscribeSchema>;
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
export type CreateTicketDto = z.infer<typeof CreateTicketSchema>;
export type PaginationDto = z.infer<typeof PaginationSchema>;
