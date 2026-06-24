'use client';
import { AdminSidebar } from '@/components/AdminSidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="admin-content overflow-auto">
          {children}
        </main>
      </div>
    </QueryClientProvider>
  );
}
