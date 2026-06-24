'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Menu, LogOut, User } from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { ProjectSelector } from '@/components/dashboard/ProjectSelector';
import { ConsentModal } from '@/components/dashboard/ConsentModal';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { user, subscription, clearAuth, pendingConsents } = useAuthStore();
  const localePath = (path: string) => locale === 'tr' ? path : `/${locale}${path}`;

  // Extract projectId from URL if present
  const projectId = params?.projectId as string | undefined;

  const isPastDue = subscription?.status === 'PAST_DUE';
  const hasPendingConsent = pendingConsents && pendingConsents.length > 0;

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {}
    clearAuth();
    router.push(localePath('/giris'));
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <DashboardSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentProjectId={projectId}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Past due warning */}
        {isPastDue && (
          <div className="bg-red-900/80 border-b border-red-700/50 px-4 py-2 text-center text-xs text-red-200">
            Ödemeniz alınamadı. Hesabınızın askıya alınmaması için lütfen faturalama bilgilerinizi güncelleyin.{' '}
            <a href={localePath('/dashboard/billing')} className="underline font-semibold text-white hover:text-red-100">
              Şimdi güncelle
            </a>
          </div>
        )}

        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/10 bg-black/40 backdrop-blur-xl px-4">
          {/* Mobile hamburger */}
          <button
            className="md:hidden flex-shrink-0 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Project selector */}
          <ProjectSelector currentProjectId={projectId} />

          <div className="flex-1" />

          {/* Right actions */}
          <NotificationBell />

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/10 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                {user?.fullName?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:block text-sm font-medium text-white/80 max-w-[120px] truncate">
                {user?.fullName || 'Kullanıcı'}
              </span>
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-10 z-50 w-48 glass rounded-xl border border-white/10 shadow-2xl overflow-hidden">
                  <div className="p-3 border-b border-white/10">
                    <p className="text-xs font-medium text-white truncate">{user?.fullName}</p>
                    <p className="text-[10px] text-white/40 truncate">{user?.email}</p>
                  </div>
                  <div className="p-1">
                    <a
                      href={localePath('/dashboard/account')}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Hesabım
                    </a>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Pending consent modal — cannot be dismissed */}
      {hasPendingConsent && <ConsentModal />}
    </div>
  );
}
