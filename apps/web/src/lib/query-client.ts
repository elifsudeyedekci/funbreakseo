'use client';

import { QueryClient } from '@tanstack/react-query';

let queryClientInstance: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          retry: 2,
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return queryClientInstance;
}
