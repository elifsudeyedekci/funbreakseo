'use client';
import * as React from 'react';
import { cn } from '../utils';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue = '', value, onValueChange, children, className }: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const activeTab = isControlled ? value : internal;

  const setActiveTab = (tab: string) => {
    if (!isControlled) setInternal(tab);
    onValueChange?.(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-[var(--border-subtle)]', className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext)!;
  const isActive = ctx.activeTab === value;
  return (
    <button
      type="button"
      onClick={() => ctx.setActiveTab(value)}
      className={cn(
        'relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none',
        isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
        className
      )}
    >
      {children}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />
      )}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext)!;
  if (ctx.activeTab !== value) return null;
  return <div className={cn('mt-4', className)}>{children}</div>;
}
