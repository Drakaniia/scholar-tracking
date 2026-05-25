'use client';

import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? dynamic(
        () =>
          import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools),
        { ssr: false }
      )
    : null;

export function TanStackProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 5 * 60 * 1000, // 5 minutes - data is reasonably static
            gcTime: 30 * 60 * 1000, // 30 minutes - keeps data in memory longer
            retry: 1,
            refetchOnWindowFocus: false, // Prevents refetch on page navigation
            refetchOnMount: false, // Don't refetch if data exists in cache
            refetchOnReconnect: true, // Refetch when internet reconnects
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {ReactQueryDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
