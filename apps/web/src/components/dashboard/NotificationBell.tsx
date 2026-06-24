'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notificationApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatDate } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadNotifications();
  }, [isAuthenticated]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadNotifications() {
    try {
      const res = await notificationApi.list({ limit: 20 });
      const items = res.data.data || [];
      setNotifications(items);
      setUnread(items.filter((n: Notification) => !n.read).length);
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {}
  }

  const TYPE_COLORS: Record<string, string> = {
    CRAWL_COMPLETE: 'bg-blue-500',
    PAYMENT_SUCCESS: 'bg-emerald-500',
    PAYMENT_FAILED: 'bg-red-500',
    CONTENT_READY: 'bg-purple-500',
    LINK_VERIFIED: 'bg-green-500',
    WARNING: 'bg-orange-500',
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
        className="relative flex items-center justify-center h-8 w-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Bildirimler"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 glass rounded-xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Bildirimler</h3>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-white/40">Bildirim yok</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors',
                    !n.read && 'bg-indigo-500/5'
                  )}
                >
                  <div className={cn('mt-1 h-2 w-2 rounded-full flex-shrink-0', TYPE_COLORS[n.type] || 'bg-gray-500')} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{n.title}</p>
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-white/25 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
