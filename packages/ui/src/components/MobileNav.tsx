'use client';
import * as React from 'react';
import { X, Menu } from 'lucide-react';
import { cn } from '../utils';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface MobileNavProps {
  items: NavItem[];
  logo?: React.ReactNode;
  cta?: React.ReactNode;
  className?: string;
}

export function MobileNav({ items, logo, cta, className }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('inline-flex items-center justify-center rounded-md p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors md:hidden', className)}
        aria-label="Menüyü aç"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-[var(--bg-elevated)] border-l border-[var(--border-subtle)] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              {logo}
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {item.icon}
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            {cta && <div className="p-4 border-t border-[var(--border-subtle)]">{cta}</div>}
          </div>
        </div>
      )}
    </>
  );
}
