/**
 * Prefetch Service
 *
 * Handles background data prefetching at the start of a user session.
 * All main page data is loaded asynchronously so the user never sees
 * loading screens when navigating between pages.
 *
 * How It Works:
 * -------------
 * 1. User logs in / app loads with existing session
 * 2. AppPrefetcher component calls prefetchAllAppData()
 * 3. Data for all main pages loads in parallel (non-blocking)
 * 4. When user navigates to any page, data is already cached
 * 5. Pages render instantly from cache
 *
 * What Gets Prefetched:
 * ---------------------
 * - Universities list (for UniversitiesPage, ProfilePage dropdown, RegisterPage)
 * - Notes list - first page (for CommunityPage, shared cache with infinite query)
 * - Opportunities list (for OpportunitiesPage)
 * - Conversations list (for MessagesPage)
 *
 * Performance Notes:
 * ------------------
 * - Uses Promise.allSettled() so one failure doesn't block others
 * - Runs after initial render, not blocking first paint
 * - React Query handles deduplication if a page fetches same data
 */

import { universityKeys } from '../hooks/useUniversities';
import { noteKeys } from '../hooks/useNotes';
import { messageKeys } from '../hooks/useMessages';
import { userKeys } from '../hooks/useUsers';
import { opportunityKeys } from '../hooks/useOpportunities';
import { getUniversities } from '../api/universities';
import { fetchNotes } from '../api/notes';
import { getConversations } from '../api/messages';
import { getUser } from '../api/users';
import { fetchOpportunities } from '../api/opportunities';
import { STALE_TIMES } from '../config/cache';

// =============================================================================
// Main Prefetch Function
// =============================================================================

/**
 * Prefetch all data needed for main application pages
 *
 * Call this once after user authentication is confirmed.
 * Runs asynchronously - does not block rendering.
 *
 * @param {QueryClient} queryClient - React Query client instance
 * @param {Object} currentUser - The currently authenticated user (optional)
 * @param {number} currentUser.id - User ID for prefetching profile data
 * @returns {Promise<void>} Resolves when all prefetching completes
 *
 * @example
 * // In AppPrefetcher component
 * useEffect(() => {
 *   if (isAuthenticated && !hasPrefetched) {
 *     prefetchAllAppData(queryClient, user);
 *     setHasPrefetched(true);
 *   }
 * }, [isAuthenticated]);
 */
export async function prefetchAllAppData(queryClient, currentUser = null) {
  // Build array of prefetch operations
  const prefetchOperations = [
    // -------------------------------------------------------------------------
    // Universities List
    // -------------------------------------------------------------------------
    // Used by: UniversitiesPage, ProfilePage (dropdown), RegisterPage (dropdown)
    queryClient.prefetchQuery({
      queryKey: universityKeys.list(),
      queryFn: getUniversities,
      staleTime: STALE_TIMES.UNIVERSITIES,
    }),

    // -------------------------------------------------------------------------
    // Notes List - First Page (default view - no filters)
    // -------------------------------------------------------------------------
    // Used by: CommunityPage (main feed)
    // Uses infinite query format to share cache with useInfiniteNotes()
    queryClient.prefetchInfiniteQuery({
      queryKey: noteKeys.infinite({}),
      queryFn: () => fetchNotes({ page: 1, page_size: 20 }),
      initialPageParam: 1,
      staleTime: STALE_TIMES.NOTES,
    }),

    // -------------------------------------------------------------------------
    // Opportunities List
    // -------------------------------------------------------------------------
    // Used by: OpportunitiesPage
    queryClient.prefetchQuery({
      queryKey: opportunityKeys.list({}),
      queryFn: () => fetchOpportunities({}),
      staleTime: STALE_TIMES.OPPORTUNITIES,
    }),

    // -------------------------------------------------------------------------
    // Conversations List
    // -------------------------------------------------------------------------
    // Used by: MessagesPage
    queryClient.prefetchQuery({
      queryKey: messageKeys.conversations(),
      queryFn: getConversations,
      staleTime: STALE_TIMES.CONVERSATIONS,
    }),
  ];

  // -------------------------------------------------------------------------
  // Current User Profile
  // -------------------------------------------------------------------------
  // Used by: ProfilePage (own profile view)
  // Only prefetch if we have a user ID
  if (currentUser?.id) {
    prefetchOperations.push(
      queryClient.prefetchQuery({
        queryKey: userKeys.detail(currentUser.id),
        queryFn: () => getUser(currentUser.id),
        staleTime: STALE_TIMES.USERS,
      })
    );
  }

  // All prefetch operations run in parallel
  const results = await Promise.allSettled(prefetchOperations);

  // Log any failures for debugging (won't break the app)
  const dataTypes = ['universities', 'notes', 'opportunities', 'conversations', 'user profile'];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`[Prefetch] Failed to prefetch ${dataTypes[index]}:`, result.reason);
    }
  });
}
