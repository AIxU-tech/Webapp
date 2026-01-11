/**
 * React Query Provider
 *
 * This module sets up TanStack Query (React Query) for the entire application.
 * It provides centralized caching, background refetching, and state management
 * for all server data.
 *
 * Design Philosophy:
 * - Data is cached to prevent redundant API calls
 * - Stale data is shown immediately while fresh data loads in background
 * - Failed requests are automatically retried
 * - Cache is shared across all components
 *
 * Key Configuration Decisions:
 * - staleTime: How long data is considered "fresh" (no background refetch)
 * - gcTime: How long unused data stays in cache before garbage collection
 * - refetchOnWindowFocus: Whether to refetch when user returns to tab
 * - retry: Number of automatic retry attempts on failure
 *
 * Usage:
 *   Wrap your app with <QueryProvider> in main.jsx
 *   Use custom hooks (useUniversities, useInfiniteNotes, etc.) in components
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { DEFAULT_STALE_TIME, DEFAULT_GC_TIME } from '../config/cache';

// =============================================================================
// Query Client Configuration
// =============================================================================
// The QueryClient holds the cache and configuration for all queries.
// This instance is shared across the entire application.

const queryClient = new QueryClient({
  defaultOptions: {
    // -------------------------------------------------------------------------
    // Query Defaults (for useQuery hooks)
    // -------------------------------------------------------------------------
    queries: {
      // -----------------------------------------------------------------------
      // Stale Time (from config/cache.js)
      // -----------------------------------------------------------------------
      // Data is considered "fresh" for this duration after fetching.
      // During this time, no background refetch will occur.
      // This prevents unnecessary API calls when navigating between pages.
      //
      // Individual queries can override this with their own staleTime.
      staleTime: DEFAULT_STALE_TIME,

      // -----------------------------------------------------------------------
      // Garbage Collection Time (from config/cache.js)
      // -----------------------------------------------------------------------
      // Unused cached data is kept for this duration after the last subscriber
      // unmounts. This means if you leave a page and return within this time,
      // the data is still in cache (though may be stale and trigger refetch).
      gcTime: DEFAULT_GC_TIME,

      // -----------------------------------------------------------------------
      // Refetch on Window Focus: Disabled
      // -----------------------------------------------------------------------
      // By default, React Query refetches data when the user returns to the
      // browser tab. We disable this because:
      // 1. Our WebSocket handles real-time updates for messages
      // 2. Most data (universities, notes) doesn't need instant updates
      // 3. Reduces unnecessary API calls
      refetchOnWindowFocus: false,

      // -----------------------------------------------------------------------
      // Refetch on Mount: Smart
      // -----------------------------------------------------------------------
      // Only refetch on mount if data is stale. This provides a good balance:
      // - Fresh data: Shows immediately, no loading state
      // - Stale data: Shows immediately, refetches in background
      refetchOnMount: true,

      // -----------------------------------------------------------------------
      // Retry: Once
      // -----------------------------------------------------------------------
      // Automatically retry failed requests once. This handles transient
      // network issues without overwhelming the server.
      retry: 1,

      // -----------------------------------------------------------------------
      // Retry Delay: Exponential backoff
      // -----------------------------------------------------------------------
      // Wait longer between each retry attempt to give the server time to
      // recover if it's under load.
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },

    // -------------------------------------------------------------------------
    // Mutation Defaults (for useMutation hooks)
    // -------------------------------------------------------------------------
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

// =============================================================================
// Query Provider Component
// =============================================================================

/**
 * QueryProvider Component
 *
 * Wraps the application with React Query's context provider.
 * Also includes devtools for debugging in development mode.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Child components
 *
 * @example
 * // In main.jsx
 * <QueryProvider>
 *   <AuthProvider>
 *     <App />
 *   </AuthProvider>
 * </QueryProvider>
 */
export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {/* =====================================================================
          React Query Devtools
          =====================================================================
          Development-only tool for inspecting the query cache.

          Features:
          - View all cached queries and their states
          - Manually trigger refetches
          - Clear cache for testing
          - See query timing and error information

          The button appears in the bottom-left corner of the screen.
          Set initialIsOpen={false} to start collapsed.

          In production builds, devtools are automatically excluded. */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

// =============================================================================
// Export Query Client for Direct Access
// =============================================================================
// In rare cases, you may need direct access to the queryClient for:
// - Prefetching data before navigation
// - Manually invalidating cache from outside React components
// - Testing purposes

export { queryClient };
