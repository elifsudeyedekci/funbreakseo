'use client';

import { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/cn';

interface TabsContextValue {
  active: string;
  setActive: (v: string) => void;
}

const TabsContext = createContext<TabsContextValue>({ active: '', setActive: () => {} });

interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [active, setActive] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={cn('flex flex-col', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 rounded-lg bg-[var(--bg-elevated)] p-1 border border-[var(--border-subtle)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const { active, setActive } = useContext(TabsContext);
  return (
    <button
      onClick={() => setActive(value)}
      className={cn(
        'flex-1 min-w-fit px-3 py-1.5 rounded-md text-sm font-medium transition-all',
        active === value
          ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  const { active } = useContext(TabsContext);
  if (active !== value) return null;
  return <div className="mt-4">{children}</div>;
}
