'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  LayoutDashboard,
  FolderOpen,
  Search,
  FileText,
  Brain,
  Link2,
  Mail,
  BarChart2,
  CreditCard,
  User,
  Bell,
  Code,
  HelpCircle,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { icon: FolderOpen, label: 'Projeler', path: '/dashboard/projects' },
  { icon: Search, label: 'Anahtar Kelimeler', path: '/dashboard/keywords', projectScoped: true },
  { icon: LayoutDashboard, label: 'Teknik SEO', path: '/dashboard/audit', projectScoped: true },
  { icon: FileText, label: 'İçerik', path: '/dashboard/content', projectScoped: true },
  { icon: Brain, label: 'GEO', path: '/dashboard/geo', projectScoped: true, geo: true },
  { icon: Link2, label: 'Backlinkler', path: '/dashboard/backlinks', projectScoped: true },
  { icon: Mail, label: 'Outreach', path: '/dashboard/outreach', projectScoped: true },
  { icon: BarChart2, label: 'Raporlar', path: '/dashboard/reports', projectScoped: true },
];

const ACCOUNT_ITEMS = [
  { icon: CreditCard, label: 'Faturalama', path: '/dashboard/billing' },
  { icon: User, label: 'Hesabım', path: '/dashboard/account' },
  { icon: Bell, label: 'Bildirimler', path: '/dashboard/notifications' },
  { icon: Code, label: 'Developer', path: '/dashboard/developer' },
  { icon: HelpCircle, label: 'Destek', path: '/dashboard/support' },
  { icon: Users, label: 'Affiliate', path: '/dashboard/affiliate' },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  currentProjectId?: string;
}

export function DashboardSidebar({ mobileOpen, onClose, currentProjectId }: SidebarProps) {
  const locale = useLocale();
  const pathname = usePathname();

  const localePath = (path: string) => locale === 'tr' ? path : `/${locale}${path}`;

  function getNavHref(item: typeof NAV_ITEMS[0]): string {
    if (item.projectScoped && currentProjectId) {
      // Route to project-scoped version
      const suffix = item.path.replace('/dashboard/', '');
      return localePath(`/dashboard/projects/${currentProjectId}/${suffix}`);
    }
    return localePath(item.path);
  }

  function isActive(path: string): boolean {
    const localizedPath = localePath(path);
    return pathname.startsWith(localizedPath);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center justify-between border-b border-white/10">
        <Link href={localePath('/dashboard')} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-white">FunBreak SEO</span>
        </Link>
        <button
          onClick={onClose}
          className="md:hidden p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const href = getNavHref(item);
          const active = isActive(item.projectScoped && currentProjectId
            ? `/dashboard/projects/${currentProjectId}/${item.path.replace('/dashboard/', '')}`
            : item.path
          );
          return (
            <Link
              key={item.path}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? item.geo
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-indigo-500/20 text-indigo-300'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              )}
            >
              <item.icon className={cn(
                'h-4 w-4 flex-shrink-0',
                active && item.geo ? 'text-purple-400' : active ? 'text-indigo-400' : ''
              )} />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-4 pb-1">
          <p className="px-3 text-xs font-medium text-white/25 uppercase tracking-wider">Hesap</p>
        </div>

        {ACCOUNT_ITEMS.map((item) => {
          const href = localePath(item.path);
          const active = pathname.startsWith(href);
          return (
            <Link
              key={item.path}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-black/30 border-r border-white/10 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={onClose}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0a0a0f] border-r border-white/10 z-50 md:hidden overflow-y-auto">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
