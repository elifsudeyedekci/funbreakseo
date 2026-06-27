import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const adminApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

adminApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_access_token');
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

adminApi.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }); })
          .then((token) => { original.headers.Authorization = `Bearer ${token}`; return adminApi(original); });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('admin_refresh_token') : null;
        if (!refreshToken) throw new Error('no refresh token');
        const res = await adminApi.post('/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data.data.tokens ?? res.data.data;
        localStorage.setItem('admin_access_token', accessToken);
        if (newRefresh) localStorage.setItem('admin_refresh_token', newRefresh);
        document.cookie = `admin_token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return adminApi(original);
      } catch {
        processQueue(new Error('refresh failed'), null);
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_refresh_token');
        document.cookie = 'admin_token=; path=/; max-age=0; SameSite=Lax';
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Admin endpoints
export const admin = {
  dashboard: () => adminApi.get('/admin/dashboard'),
  customers: (p?: Record<string, unknown>) => adminApi.get('/admin/customers', { params: p }),
  getCustomer: (id: string) => adminApi.get(`/admin/customers/${id}`),
  adjustCredits: (id: string, d: Record<string, unknown>) => adminApi.post(`/admin/customers/${id}/add-credit`, d),
  impersonate: (id: string) => adminApi.post(`/admin/customers/${id}/impersonate`),
  suspendOrg: (id: string, d: Record<string, unknown>) => adminApi.post(`/admin/customers/${id}/suspend`, d),

  plans: () => adminApi.get('/admin/plans'),
  createPlan: (d: Record<string, unknown>) => adminApi.post('/admin/plans', d),
  updatePlan: (id: string, d: Record<string, unknown>) => adminApi.patch(`/admin/plans/${id}`, d),

  invoices: (p?: Record<string, unknown>) => adminApi.get('/admin/invoices', { params: p }),
  revenue: () => adminApi.get('/admin/revenue'),

  coupons: () => adminApi.get('/admin/coupons'),
  createCoupon: (d: Record<string, unknown>) => adminApi.post('/admin/coupons', d),
  deleteCoupon: (id: string) => adminApi.delete(`/admin/coupons/${id}`),

  auditLogs: (p?: Record<string, unknown>) => adminApi.get('/admin/audit-logs', { params: p }),
  apiUsage: () => adminApi.get('/admin/api-usage'),
  queueHealth: () => adminApi.get('/admin/queue-health'),
  systemHealth: () => adminApi.get('/admin/system-health'),

  blogList: (p?: Record<string, unknown>) => adminApi.get('/admin/blog', { params: p }),
  createBlog: (d: Record<string, unknown>) => adminApi.post('/admin/blog', d),
  updateBlog: (id: string, d: Record<string, unknown>) => adminApi.put(`/admin/blog/${id}`, d),
  deleteBlog: (id: string) => adminApi.delete(`/admin/blog/${id}`),

  tickets: (p?: Record<string, unknown>) => adminApi.get('/admin/support/tickets', { params: p }),
  getTicket: (id: string) => adminApi.get(`/admin/support/tickets/${id}`),
  updateTicket: (id: string, d: Record<string, unknown>) => adminApi.patch(`/admin/support/tickets/${id}`, d),
  replyTicket: (id: string, message: string) => adminApi.post(`/admin/support/tickets/${id}/reply`, { message }),

  settings: () => adminApi.get('/admin/settings'),
  updateSetting: (key: string, value: string) => adminApi.patch(`/admin/settings/${key}`, { value }),
  costControl: () => adminApi.get('/admin/cost-control'),
  updateCostControl: (id: string, limit: number, behavior: string) =>
    adminApi.patch(`/admin/cost-control/${id}`, { limit, behavior }),

  affiliates: () => adminApi.get('/admin/affiliates'),
  affiliatePayouts: () => adminApi.get('/admin/affiliates/payouts'),
  approvePayout: (id: string) => adminApi.post(`/admin/affiliates/payouts/${id}/approve`),

  marketListings: () => adminApi.get('/admin/market/listings'),
  approveListing: (id: string) => adminApi.post(`/admin/market/listings/${id}/approve`),
  rejectListing: (id: string) => adminApi.post(`/admin/market/listings/${id}/reject`),

  backlinkOrders: () => adminApi.get('/admin/market/orders'),
  verifyOrder: (id: string) => adminApi.post(`/admin/market/orders/${id}/verify`),

  testimonials: () => adminApi.get('/admin/testimonials'),
  approveTestimonial: (id: string) => adminApi.post(`/admin/testimonials/${id}/approve`),
  featureTestimonial: (id: string) => adminApi.post(`/admin/testimonials/${id}/feature`),

  legalDocs: () => adminApi.get('/admin/legal-docs'),
  updateLegal: (id: string, d: Record<string, unknown>) => adminApi.patch(`/admin/legal-docs/${id}`, d),

  subscriptions: (p?: Record<string, unknown>) => adminApi.get('/admin/subscriptions', { params: p }),
  staff: () => adminApi.get('/admin/staff'),
  createStaff: (d: Record<string, unknown>) => adminApi.post('/admin/staff', d),
  updateStaff: (id: string, d: Record<string, unknown>) => adminApi.put(`/admin/staff/${id}`, d),

  analytics: () => adminApi.get('/admin/analytics'),
};