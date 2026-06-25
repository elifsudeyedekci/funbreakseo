'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, CreditCard, BarChart3, FileText,
  Headphones, Settings, Tag, Globe, Bot, Heart, LogOut,
  Zap, TrendingUp, ShieldCheck, Megaphone, Activity,
  Receipt, UserCog, CheckSquare, PenTool
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAdminAuthStore } from '../store/auth.store';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Genel',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/analytics', label: 'Analitik', icon: BarChart3 },
    ],
  },
  {
    label: 'Müşteri Yönetimi',
    items: [
      { href: '/customers', label: 'Müşteriler', icon: Users },
      { href: '/subscriptions', label: 'Abonelikler', icon: CreditCard },
      { href: '/customer-health', label: 'Müşteri Sağlığı', icon: Activity },
    ],
  },
  {
    label: 'Gelir',
    items: [
      { href: '/finance', label: 'Finans', icon: TrendingUp },
      { href: '/invoices', label: 'Faturalar', icon: Receipt },
      { href: '/plans', label: 'Planlar', icon: Zap },
      { href: '/coupons', label: 'Kuponlar', icon: Tag },
    ],
  },
  {
    label: 'İçerik & Pazar',
    items: [
      { href: '/blog', label: 'Blog', icon: PenTool },
      { href: '/market', label: 'Pazar', icon: Globe },
      { href: '/content-review', label: 'İçerik İnceleme', icon: CheckSquare },
      { href: '/outreach-review', label: 'Outreach İnceleme', icon: Megaphone },
    ],
  },
  {
    label: 'Operasyon',
    items: [
      { href: '/autopilot', label: 'Autopilot', icon: Bot },
      { href: '/support', label: 'Destek', icon: Headphones },
      { href: '/affiliate', label: 'Affiliate', icon: Heart },
      { href: '/marketing', label: 'Pazarlama', icon: Megaphone },
      { href: '/cost-control', label: 'Maliyet Kontrolü', icon: ShieldCheck },
    ],
  },
  {
    label: 'Yönetim',
    items: [
      { href: '/staff', label: 'Personel', icon: UserCog },
      { href: '/consents', label: 'KVKK / Onaylar', icon: ShieldCheck },
      { href: '/legal', label: 'Yasal', icon: FileText },
      { href: '/system', label: 'Sistem & Ayarlar', icon: Settings },
    ],
  },
];

function NavItem({ href, label, icon: Icon }: NavItem) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150',
        isActive
          ? 'bg-[var(--accent-dim)] text-[var(--accent)] shadow-sm'
          : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]'
      )}
    >
      <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', isActive ? 'text-[var(--accent)]' : '')} />
      {label}
    </Link>
  );
}

export function AdminSidebar() {
  const { user, clearAuth } = useAdminAuthStore();

  const initials = user?.fullName
    ? user.fullName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  return (
    <aside className="admin-sidebar flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[var(--border-subtle)]">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--geo-accent)] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[11px] font-bold">FB</span>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">FunBreak</p>
          <p className="text-[10px] text-[var(--text-muted)] leading-tight">Admin Panel</p>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-[var(--border-subtle)] p-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
          <div className="w-7 h-7 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[11px] font-bold text-[var(--accent)] flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">{user?.fullName ?? 'Admin'}</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.role ?? 'ADMIN'}</p>
          </div>
          <button
            type="button"
            onClick={clearAuth}
            title="Çıkış Yap"
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-dim)] transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
