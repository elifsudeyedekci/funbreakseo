import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string | null;
  locale: string;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  walletBalance: number;
  status: string;
}

interface Subscription {
  id: string;
  planId: string;
  status: string;
  billingCycle: string;
  currentPeriodEnd: string;
  plan: {
    id: string;
    name: string;
    slug: string;
    limits: Record<string, unknown>;
  };
}

interface AuthState {
  user: User | null;
  organization: Organization | null;
  subscription: Subscription | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hasPendingConsents: boolean;
  pendingConsents: string[];

  setAuth: (data: {
    user: User;
    organization: Organization | null;
    subscription: Subscription | null;
    accessToken: string;
    refreshToken: string;
    pendingConsents?: string[];
  }) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  updateOrg: (org: Partial<Organization>) => void;
  setSubscription: (sub: Subscription) => void;
  setPendingConsents: (val: boolean) => void;
  clearPendingConsent: (type: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      subscription: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasPendingConsents: false,
      pendingConsents: [],

      setAuth: ({ user, organization, subscription, accessToken, refreshToken, pendingConsents }) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
        }
        set({
          user,
          organization,
          subscription,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          pendingConsents: pendingConsents || [],
          hasPendingConsents: (pendingConsents || []).length > 0,
        });
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
        set({ user: null, organization: null, subscription: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),

      updateOrg: (updates) => set((state) => ({
        organization: state.organization ? { ...state.organization, ...updates } : null,
      })),

      setSubscription: (sub) => set({ subscription: sub }),

      setPendingConsents: (val) => set({ hasPendingConsents: val }),

      clearPendingConsent: (type) => set((state) => {
        const remaining = state.pendingConsents.filter((t) => t !== type);
        return { pendingConsents: remaining, hasPendingConsents: remaining.length > 0 };
      }),
    }),
    {
      name: 'funbreakseo-auth',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }),
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        subscription: state.subscription,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);