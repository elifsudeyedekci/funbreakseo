'use client';

import * as React from 'react';
import { useAdminAuthStore } from '../store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { cn } from '../lib/utils';
import { Bell, Settings, LogOut, ChevronDown, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface QueueHealth {
  pending: number;
  failed: number;
}

function useQueueHealth() {
  return useQuery<QueueHealth>({
    queryKey: ['admin-queue-health-header'],
    queryFn: async () => {
      try {
        const r = await adminApi.get('/admin/queue-health');
        return r.data?.data ?? { pending: 0, failed: 0 };
      } catch {
        return { pending: 0, failed: 0 };
      }
    },
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

function NotificationDot({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}

interface UserMenuProps {
  user: { fullName: string; email: string; role: string } | null;
  onLogout: () => void;
}

function UserMenu({ user, onLogout }: UserMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const initials = user?.fullName
    ? user.fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: 'Süper Admin',
    ADMIN: 'Admin',
    STAFF: 'Personel',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--bg-elevated)] transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-semibold text-[var(--accent)] flex-shrink-0">
          {initials}
        </div>
        <div className="hidden sm:block text-left min-w-0">
          <p className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[120px]">
            {user?.fullName ?? 'Admin'}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] truncate">
            {roleLabel[user?.role ?? ''] ?? user?.role ?? 'Admin'}
          </p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-[var(--text-muted)] transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-lg z-50 py-1">
          {/* User info */}
          <div className="px-3 py-2.5 border-b border-[var(--border-subtle)]">
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{user?.fullName}</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">{user?.email}</p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/system"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Sistem Ayarları
            </Link>
            <Link
              href="https://funbreakseo.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Siteyi Görüntüle
            </Link>
          </div>

          <div className="border-t border-[var(--border-subtle)] py-1">
            <button
              type="button"
              onClick={() => { setOpen(false); onLogout(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface AdminHeaderProps {
  /** Optional page title to display in the header */
  title?: string;
  /** Optional breadcrumb items */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Extra action buttons rendered on the right side (before user menu) */
  actions?: React.ReactNode;
}

export function AdminHeader({ title, breadcrumbs, actions }: AdminHeaderProps) {
  const { user, clearAuth } = useAdminAuthStore();
  const { data: queueHealth } = useQueueHealth();

  const alertCount = (queueHealth?.failed ?? 0);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/90 backdrop-blur-md px-4 md:px-6 h-14 shadow-[0_1px_0_0_rgba(255,255,255,0.03)]">
      {/* Left: breadcrumbs or title */}
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.label}>
                {i > 0 && (
                  <span className="text-[var(--text-muted)] flex-shrink-0">/</span>
                )}
                {crumb.href && i < breadcrumbs.length - 1 ? (
                  <Link
                    href={crumb.href}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cn('truncate', i === breadcrumbs.length - 1 ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]')}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : title ? (
          <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</h1>
        ) : null}
      </div>

      {/* Right: actions + notifications + user */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Extra actions slot */}
        {actions}

        {/* Queue status indicator */}
        {alertCount > 0 && (
          <Link
            href="/system"
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
            title={`${alertCount} kuyruk hatası`}
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">{alertCount} hata</span>
          </Link>
        )}

        {/* Notification bell */}
        <Link
          href="/system"
          className="relative p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
          title="Bildirimler"
        >
          <Bell className="w-4 h-4" />
          <NotificationDot count={alertCount} />
        </Link>

        {/* Settings shortcut */}
        <Link
          href="/system"
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
          title="Sistem Ayarları"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--border-subtle)] mx-1" />

        {/* User menu */}
        <UserMenu user={user} onLogout={clearAuth} />
      </div>
    </header>
  );
}

export default AdminHeader;
