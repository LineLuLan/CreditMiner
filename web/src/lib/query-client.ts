import { QueryClient } from "@tanstack/react-query";

/**
 * Centralized TanStack Query client factory.
 *
 * <p>Used by the Providers wrapper in {@code app/layout.tsx}. Configured
 * with conservative defaults appropriate for a dashboard (long stale time,
 * no automatic refetch on focus).</p>
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: (failureCount, error: unknown) => {
          const code = (error as { code?: string } | undefined)?.code;
          // Don't retry validation/not-found errors.
          if (code === "VALIDATION_ERROR" || code === "NOT_FOUND") return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
