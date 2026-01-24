/**
 * AppPrefetcher Component
 *
 * Invisible component that handles background data prefetching at app startup.
 * This component renders nothing - its only purpose is to trigger prefetching
 * of all main page data once the user is authenticated.
 *
 * Why This Approach:
 * ------------------
 * Traditional React apps fetch data when components mount, showing loading
 * spinners. By prefetching all essential data at startup, pages load instantly
 * from cache when the user navigates to them.
 *
 * How It Works:
 * -------------
 * 1. Component mounts inside the authenticated app shell
 * 2. useEffect triggers once when user is authenticated
 * 3. prefetchAllAppData() loads all main page data in parallel
 * 4. Data is stored in React Query cache
 * 5. When user navigates, pages render instantly from cache
 *
 * What Gets Prefetched:
 * ---------------------
 * - Universities list (UniversitiesPage, ProfilePage dropdown)
 * - Notes list (CommunityPage feed)
 * - Conversations list (MessagesPage)
 *
 * Performance Characteristics:
 * ----------------------------
 * - Non-blocking: Runs after initial render, doesn't delay first paint
 * - Parallel: All API calls happen simultaneously
 * - Resilient: Individual failures don't affect other prefetches
 * - Deduped: If a page already fetched data, prefetch is skipped
 *
 * Usage:
 * ------
 * Place this component inside AuthProvider so it has access to user state:
 *
 * <AuthProvider>
 *   <AppPrefetcher />
 *   <App />
 * </AuthProvider>
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { prefetchAllAppData } from '../services/prefetch';

function AppPrefetcher() {
  // Get authentication state and user to know when and what to prefetch
  const { isAuthenticated, loading, user } = useAuth();

  // Get React Query client for prefetching
  const queryClient = useQueryClient();

  // Track if we've already prefetched this session
  // Prevents re-prefetching on re-renders
  const hasPrefetchedRef = useRef(false);

  useEffect(() => {
    // ---------------------------------------------------------------------------
    // Guard Conditions
    // ---------------------------------------------------------------------------
    // Don't prefetch if:
    // - Still checking authentication status
    // - User is not authenticated
    // - Already prefetched this session
    if (loading || hasPrefetchedRef.current) {
      return;
    }

    // ---------------------------------------------------------------------------
    // Trigger Background Prefetch
    // ---------------------------------------------------------------------------
    // Mark as prefetched immediately to prevent duplicate calls
    hasPrefetchedRef.current = true;

    // Start prefetching in the background
    // Pass the current user so we can prefetch their profile data
    // This is intentionally not awaited - we don't want to block anything
    prefetchAllAppData(queryClient, user)
      .then(() => {
        // Optional: Log success for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('[AppPrefetcher] All app data prefetched successfully');
        }
      })
      .catch((error) => {
        // Prefetch failures are non-critical - log and continue
        console.warn('[AppPrefetcher] Some data failed to prefetch:', error);
      });

  }, [isAuthenticated, loading, queryClient, user]);

  // ---------------------------------------------------------------------------
  // Render Nothing
  // ---------------------------------------------------------------------------
  // This component exists only for its side effects (prefetching)
  // It renders no UI
  return null;
}

export default AppPrefetcher;
