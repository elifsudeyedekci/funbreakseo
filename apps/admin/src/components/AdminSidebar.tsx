'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, CreditCard, BarChart3, FileText,
  Headphones, Settings, Tag, Globe, Bot, Heart, LogOut, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAdminAuthStore } from '../store/auth.store';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Müşteriler', icon: Users },
  { href: '/revenue', label: 'Gelir', icon: CreditCard },
  { href: '/plans', label: 'Planlar', icon: Zap },
  { href: '/coupons', label: 'Kuponlar', icon: Tag },
  { href: '/blog', label: 'Blog', icon: FileText },
  { href: '/market', label: 'Pazar', icon: Globe },
  { href: '/autopilot', label: 'Autopilot', icon: Bot },
  { href: '/support', label: 'Destek', icon: Headphones },
  { href: '/affiliate', label: 'Affiliate', icon: Heart },
  { href: '/legal', label: 'Yasal', icon: FileText },
  { href: '/analytics', label: 'Analitik', icon: BarChart3 },
  { href: '/settings', label: 'Ayarlar', icon: Settings },
];

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: typeof LayoutDashboard }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
          : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </Link>
  );
}

export function AdminSidebar() {
  const { user, clearAuth } = useAdminAuthStore();

  return (
    <aside className="admin-sidebar flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-[var(--border-subtle)]">
        <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
          <span className="text-white text-xs font-bold">FB</span>
        </div>
        <span className="text-sm font-semibold text-[var(--text-primary)]">FunBreak Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-[var(--border-subtle)] p-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-semibold text-[var(--accent)]">
            {user?.fullName?.charAt(0) ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{user?.fullName ?? 'Admin'}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{user?.role}</p>
          </div>
          <button type="button" onClick={clearAuth} className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
