import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => { if (error) reject(error); else resolve(token!); });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }); })
          .then((token) => { originalRequest.headers.Authorization = `Bearer ${token}`; return api(originalRequest); });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await api.post('/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRT } = data.data;
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', newRT);
        document.cookie = `access_token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/giris';
        return Promise.reject(err);
      } finally { isRefreshing = false; }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (d: Record<string, unknown>) => api.post('/auth/register', d),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  me: () => api.get('/auth/me'),
  pendingConsents: () => api.get('/auth/pending-consents'),
  acceptConsents: (d: Record<string, unknown>) => api.post('/auth/accept-consents', d),
  verify2fa: (code: string) => api.post('/auth/2fa/verify', { code }),
};

export const billingApi = {
  getPlans: (currency?: string) => api.get('/plans', { params: { currency } }),
  subscribe: (d: Record<string, unknown>) => api.post('/billing/subscribe', d),
  changePlan: (d: Record<string, unknown>) => api.post('/billing/change-plan', d),
  cancel: (d?: Record<string, unknown>) => api.post('/billing/cancel', d),
  applyCoupon: (d: Record<string, unknown>) => api.post('/billing/apply-coupon', d),
  getInvoices: () => api.get('/billing/invoices'),
  getInvoicePdf: (id: string) => api.get(`/billing/invoices/${id}/pdf`),
  walletTopup: (amount: number) => api.post('/billing/wallet/topup', { amount }),
  getWalletTx: () => api.get('/billing/wallet/transactions'),
  // Aliases used in billing page
  subscription: () => api.get('/billing/subscription'),
  usage: () => api.get('/billing/usage'),
  invoices: (params?: Record<string, unknown>) => api.get('/billing/invoices', { params }),
  wallet: () => api.get('/billing/wallet'),
};

export const projectApi = {
  list: () => api.get('/projects'),
  create: (d: Record<string, unknown>) => api.post('/projects', d),
  get: (id: string) => api.get(`/projects/${id}`),
  update: (id: string, d: Record<string, unknown>) => api.patch(`/projects/${id}`, d),
  delete: (id: string) => api.delete(`/projects/${id}`),
  overview: (id: string) => api.get(`/projects/${id}/overview`),
  dashboard: (id: string) => api.get(`/projects/${id}/overview`),
  connectGsc: (id: string) => api.post(`/projects/${id}/connect-gsc`),
};

export const keywordApi = {
  list: (projectId: string, p?: Record<string, unknown>) => api.get(`/projects/${projectId}/keywords`, { params: p }),
  add: (projectId: string, d: Record<string, unknown> | string[]) => api.post(`/projects/${projectId}/keywords`, Array.isArray(d) ? { phrases: d } : d),
  bulkAdd: (projectId: string, keywords: string[]) => api.post(`/projects/${projectId}/keywords`, { phrases: keywords }),
  delete: (projectId: string, id: string) => api.delete(`/projects/${projectId}/keywords/${id}`),
  history: (id: string) => api.get(`/keywords/${id}/history`),
  research: (projectId: string, d: Record<string, unknown>) => api.post('/keywords/research', d),
  summary: (projectId: string) => api.get(`/projects/${projectId}/keywords/summary`),
  refreshRank: (id: string) => api.post(`/keywords/${id}/refresh-rank`),
  refreshMetrics: (projectId: string) => api.post(`/projects/${projectId}/keywords/refresh-metrics`),
  suggestions: (projectId: string) => api.get(`/projects/${projectId}/keywords/suggestions`),
};

export const crawlerApi = {
  start: (projectId: string) => api.post(`/projects/${projectId}/crawl`),
  history: (projectId: string) => api.get(`/projects/${projectId}/crawls`),
  result: (id: string) => api.get(`/crawls/${id}`),
  issues: (id: string, p?: Record<string, unknown>) => api.get(`/crawls/${id}/issues`, { params: p }),
  pages: (id: string) => api.get(`/crawls/${id}/pages`),
  markFixed: (issueId: string) => api.post(`/issues/${issueId}/mark-fixed`),
};

export const contentApi = {
  generate: (projectId: string, d: Record<string, unknown>) => api.post(`/projects/${projectId}/content/generate`, d),
  list: (projectId: string, p?: Record<string, unknown>) => api.get(`/projects/${projectId}/content`, { params: p }),
  get: (id: string) => api.get(`/content/${id}`),
  update: (id: string, d: Record<string, unknown>) => api.patch(`/content/${id}`, d),
  approve: (id: string) => api.post(`/content/${id}/approve`),
  reject: (id: string, reason?: string) => api.post(`/content/${id}/reject`, { reason }),
  publish: (id: string) => api.post(`/content/${id}/publish`),
};

export const geoApi = {
  addQuery: (projectId: string, d: Record<string, unknown>) => api.post(`/projects/${projectId}/geo/queries`, d),
  listQueries: (projectId: string) => api.get(`/projects/${projectId}/geo/queries`),
  triggerScan: (projectId: string) => api.post(`/projects/${projectId}/geo/scan`),
  overview: (projectId: string) => api.get(`/projects/${projectId}/geo/overview`),
  competitors: (projectId: string) => api.get(`/projects/${projectId}/geo/competitors`),
  recommendations: (projectId: string) => api.get(`/projects/${projectId}/geo/recommendations`),
  history: (projectId: string, days?: number) => api.get(`/projects/${projectId}/geo/history`, { params: { days } }),
};

export const outreachApi = {
  list: (projectId: string) => api.get(`/projects/${projectId}/outreach/campaigns`),
  campaigns: (projectId: string) => api.get(`/projects/${projectId}/outreach/campaigns`),
  create: (projectId: string, d: Record<string, unknown>) => api.post(`/projects/${projectId}/outreach/campaigns`, d),
  createCampaign: (projectId: string, d: Record<string, unknown>) => api.post(`/projects/${projectId}/outreach/campaigns`, d),
  get: (id: string) => api.get(`/campaigns/${id}`),
  generateEmails: (id: string) => api.post(`/campaigns/${id}/generate-emails`),
  start: (id: string) => api.post(`/campaigns/${id}/start`),
  backlinks: (projectId: string, params?: Record<string, unknown>) => api.get(`/projects/${projectId}/backlinks`, { params }),
  syncBacklinks: (projectId: string) => api.post(`/projects/${projectId}/backlinks/sync`),
  marketListings: (params?: Record<string, unknown>) => api.get('/market/listings', { params }),
  orders: (projectId: string) => api.get(`/projects/${projectId}/backlink-orders`),
};

export const marketApi = {
  listListings: (p?: Record<string, unknown>) => api.get('/market/listings', { params: p }),
  getListing: (id: string) => api.get(`/market/listings/${id}`),
  createOrder: (d: Record<string, unknown>) => api.post('/market/orders', d),
  getOrders: () => api.get('/market/orders'),
  disputeOrder: (id: string, reason: string) => api.post(`/market/orders/${id}/dispute`, { reason }),
};

export const notificationApi = {
  list: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  preferences: () => api.get('/notifications/preferences'),
  updatePreferences: (d: Record<string, unknown>) => api.patch('/notifications/preferences', d),
  unsubscribeMarketing: () => api.post('/notifications/unsubscribe-marketing'),
};

export const supportApi = {
  list: () => api.get('/support/tickets'),
  create: (d: Record<string, unknown>) => api.post('/support/tickets', d),
  get: (id: string) => api.get(`/support/tickets/${id}`),
  addMessage: (id: string, d: Record<string, unknown>) => api.post(`/support/tickets/${id}/messages`, d),
};

export const publicApi = {
  getPlans: (currency?: string) => api.get('/public/plans', { params: { currency } }),
  getBlogList: (locale: string, p?: Record<string, unknown>) => api.get('/public/blog', { params: { locale, ...p } }),
  getBlogPost: (slug: string) => api.get(`/public/blog/${slug}`),
  contact: (d: Record<string, unknown>) => api.post('/public/contact', d),
  freeAudit: (domain: string) => api.post('/public/free-audit', { domain }),
};

export const reportsApi = {
  list: (projectId: string) => api.get(`/projects/${projectId}/reports`),
  generate: (projectId: string, d: Record<string, unknown>) => api.post(`/projects/${projectId}/reports/generate`, d),
  get: (projectId: string, reportId: string) => api.get(`/projects/${projectId}/reports/${reportId}`),
  scheduled: (projectId: string) => api.get(`/projects/${projectId}/reports/scheduled`),
  createSchedule: (projectId: string, d: Record<string, unknown>) => api.post(`/projects/${projectId}/reports/schedules`, d),
  deleteSchedule: (projectId: string, scheduleId: string) => api.delete(`/projects/${projectId}/reports/schedules/${scheduleId}`),
};

export const developerApi = {
  apiKeys: () => api.get('/developer/api-keys'),
  createApiKey: (d: Record<string, unknown>) => api.post('/developer/api-keys', d),
  deleteApiKey: (id: string) => api.delete(`/developer/api-keys/${id}`),
  webhooks: () => api.get('/developer/webhooks'),
  createWebhook: (d: Record<string, unknown>) => api.post('/developer/webhooks', d),
  deleteWebhook: (id: string) => api.delete(`/developer/webhooks/${id}`),
  usage: () => api.get('/developer/usage'),
};

export const affiliateApi = {
  me: () => api.get('/affiliate/me'),
  referrals: () => api.get('/affiliate/referrals'),
  payouts: () => api.get('/affiliate/payouts'),
  requestPayout: (amount: number) => api.post('/affiliate/payouts', { amount }),
};

export const accountApi = {
  me: () => api.get('/account/me'),
  update: (d: Record<string, unknown>) => api.patch('/account/me', d),
  organization: () => api.get('/account/organization'),
  updateOrganization: (d: Record<string, unknown>) => api.patch('/account/organization', d),
  changePassword: (d: Record<string, unknown>) => api.post('/account/change-password', d),
  enable2fa: () => api.post('/account/2fa/enable'),
  disable2fa: (d: Record<string, unknown>) => api.post('/account/2fa/disable', d),
  verify2fa: (code: string) => api.post('/account/2fa/verify', { code }),
  integrations: () => api.get('/account/integrations'),
  connectGsc: (d: Record<string, unknown>) => api.post('/account/integrations/gsc', d),
};

// Extend outreachApi with backlink-specific methods
export const backlinkApi = {
  list: (projectId: string, params?: Record<string, unknown>) => api.get(`/projects/${projectId}/backlinks`, { params }),
  marketListings: (params?: Record<string, unknown>) => api.get('/market/listings', { params }),
  orders: (projectId: string) => api.get(`/projects/${projectId}/backlink-orders`),
  createOrder: (projectId: string, d: Record<string, unknown>) => api.post(`/projects/${projectId}/backlink-orders`, d),
};

export const auditApi = {
  get: (projectId: string) => api.get(`/projects/${projectId}/audit`),
  start: (projectId: string) => api.post(`/projects/${projectId}/audit/start`),
  history: (projectId: string) => api.get(`/projects/${projectId}/audit/history`),
};

export const abTestApi = {
  list: (projectId: string) => api.get('/ab-tests', { params: { projectId } }),
  create: (d: Record<string, unknown>) => api.post('/ab-tests', d),
  get: (id: string) => api.get(`/ab-tests/${id}`),
  activate: (id: string) => api.patch(`/ab-tests/${id}/activate`),
  stop: (id: string, winnerVariantId?: string) => api.patch(`/ab-tests/${id}/stop`, { winnerVariantId }),
  results: (id: string) => api.get(`/ab-tests/${id}/results`),
  recordImpression: (id: string, variantId: string, sessionId: string) =>
    api.post(`/ab-tests/${id}/impression`, { variantId, sessionId }),
  recordConversion: (id: string, variantId: string, sessionId: string, conversionType: string) =>
    api.post(`/ab-tests/${id}/conversion`, { variantId, sessionId, conversionType }),
  assignVariant: (id: string, sessionId: string) =>
    api.post(`/ab-tests/${id}/assign`, { sessionId }),
};

export const apiClient = api;