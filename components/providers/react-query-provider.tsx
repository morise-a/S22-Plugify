'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // Lazily initialize QueryClient to prevent recreation on re-renders
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false, // Disable refetch on tab switches to conserve bandwidth
            retry: 1, // Minimize retry spam
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
