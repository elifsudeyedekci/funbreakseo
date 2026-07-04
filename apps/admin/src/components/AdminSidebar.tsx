'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, CreditCard, BarChart3, FileText,
  Headphones, Settings, Globe, Bot, Heart, LogOut,
  Zap, TrendingUp, ShieldCheck, Megaphone, Activity,
  Receipt, UserCog, CheckSquare, PenTool, Menu, X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAdminAuthStore } from '../store/auth.store';

interface NavItem { href: string; label: string; icon: React.ElementType; }
interface NavGroup { label: string; items: NavItem[]; }

const navGroups: NavGroup[] = [
  { label: 'Genel', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/analytics', label: 'Analitik', icon: BarChart3 },
  ]},
  { label: 'Müşteri Yönetimi', items: [
    { href: '/customers', label: 'Müşteriler', icon: Users },
    { href: '/subscriptions', label: 'Abonelikler', icon: CreditCard },
    { href: '/customer-health', label: 'Müşteri Sağlığı', icon: Activity },
  ]},
  { label: 'Gelir', items: [
    { href: '/finance', label: 'Finans', icon: TrendingUp },
    { href: '/invoices', label: 'Faturalar', icon: Receipt },
    { href: '/plans', label: 'Planlar & Kuponlar', icon: Zap },
  ]},
  { label: 'İçerik & Pazar', items: [
    { href: '/blog', label: 'Blog', icon: PenTool },
    { href: '/market', label: 'Pazar', icon: Globe },
    { href: '/content-review', label: 'İçerik İnceleme', icon: CheckSquare },
    { href: '/outreach-review', label: 'Outreach İnceleme', icon: Megaphone },
  ]},
  { label: 'Operasyon', items: [
    { href: '/autopilot', label: 'Autopilot', icon: Bot },
    { href: '/support', label: 'Destek', icon: Headphones },
    { href: '/affiliate', label: 'Affiliate', icon: Heart },
    { href: '/marketing', label: 'Pazarlama', icon: Megaphone },
    { href: '/cost-control', label: 'Maliyet Kontrolü', icon: ShieldCheck },
  ]},
  { label: 'Yönetim', items: [
    { href: '/staff', label: 'Personel', icon: UserCog },
    { href: '/consents', label: 'KVKK / Onaylar', icon: ShieldCheck },
    { href: '/legal', label: 'Yasal', icon: FileText },
    { href: '/system', label: 'Sistem & API', icon: Settings },
  ]},
];

function NavItem({ href, label, icon: Icon }: NavItem) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link href={href} className={cn('nav-item', isActive && 'active')}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export function AdminSidebar() {
  const { user, clearAuth } = useAdminAuthStore();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = user?.fullName
    ? user.fullName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  // Sayfa değişince mobil menüyü kapat
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      {/* Mobil hamburger — masaüstünde gizli */}
      <button
        type="button"
        className="admin-mobile-toggle"
        aria-label={mobileOpen ? 'Menüyü kapat' : 'Menüyü aç'}
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      {mobileOpen && <div className="admin-mobile-overlay" onClick={() => setMobileOpen(false)} />}

    <aside className={cn('admin-sidebar', mobileOpen && 'mobile-open')}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg, #6366f1, #a855f7)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 16px rgba(99,102,241,0.4)' }}>
          <span style={{ color:'#fff', fontSize:11, fontWeight:700, letterSpacing:'-0.02em' }}>FB</span>
        </div>
        <div>
          <p style={{ fontSize:13, fontWeight:600, color:'#fff', lineHeight:1.2 }}>FunBreak SEO</p>
          <p style={{ fontSize:10, color:'rgba(255,255,255,0.35)', lineHeight:1.3, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:1 }}>Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:'auto', padding:'16px 12px', display:'flex', flexDirection:'column', gap:20 }}>
        {navGroups.map((group) => (
          <div key={group.label}>
            <p style={{ paddingLeft:8, marginBottom:6, fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(255,255,255,0.28)' }}>
              {group.label}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
              {group.items.map((item) => <NavItem key={item.href} {...item} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', padding:12, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, cursor:'default' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))', border:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0 }}>
            {initials}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:12, fontWeight:500, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.fullName ?? 'Admin'}</p>
            <p style={{ fontSize:10, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:1 }}>{user?.role ?? 'ADMIN'}</p>
          </div>
          <button
            type="button"
            onClick={clearAuth}
            title="Çıkış Yap"
            style={{ padding:6, borderRadius:6, color:'rgba(255,255,255,0.35)', background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', transition:'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <LogOut style={{ width:14, height:14 }} />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
