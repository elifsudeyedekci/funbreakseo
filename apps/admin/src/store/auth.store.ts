import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
}

interface AdminAuthState {
  user: AdminUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AdminUser, token: string) => void;
  clearAuth: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_access_token', accessToken);
        }
        set({ user, accessToken, isAuthenticated: true });
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_access_token');
        }
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'funbreakseo-admin-auth',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }),
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }),
    }
  )
);