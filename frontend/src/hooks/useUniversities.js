/**
 * Universities Hooks Module
 *
 * Provides React Query hooks for fetching and managing university data.
 * These hooks handle caching, loading states, and error handling automatically.
 *
 * Available Hooks:
 * - useUniversities(): Get all universities
 * - useUniversity(id): Get single university details
 * - useRemoveMember(): Mutation to remove a member (admin only)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUniversities,
  getUniversity,
  removeMember,
  updateMemberRole,
  updateUniversity,
} from '../api/universities';
import { STALE_TIMES, GC_TIMES } from '../config/cache';

// =============================================================================
// Query Keys
// =============================================================================
// Centralized query keys ensure consistent cache invalidation.
// Using a factory pattern allows for structured, type-safe keys.

export const universityKeys = {
  // Base key for all university queries
  all: ['universities'],

  // Key for the list of all universities
  list: () => [...universityKeys.all, 'list'],

  // Key for a specific university's details
  detail: (id) => [...universityKeys.all, 'detail', id],
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * useUniversities Hook
 *
 * Fetches and caches all universities.
 * Data is shared across RegisterPage, UniversitiesPage, and ProfilePage.
 *
 * @returns {object} React Query result
 * @returns {Array} data - Array of university objects
 * @returns {boolean} isLoading - True during initial fetch
 * @returns {boolean} isFetching - True during any fetch (including background)
 * @returns {Error|null} error - Error object if fetch failed
 * @returns {Function} refetch - Manually trigger a refetch
 *
 * Cache Behavior:
 * - staleTime: 10 minutes (universities rarely change)
 * - Data shown immediately from cache on subsequent visits
 * - Background refetch if data is stale
 *
 * @example
 * function UniversitiesPage() {
 *   const { data: universities, isLoading, error } = useUniversities();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return universities.map(uni => <UniversityCard key={uni.id} {...uni} />);
 * }
 */
export function useUniversities() {
  return useQuery({
    queryKey: universityKeys.list(),
    queryFn: getUniversities,

    // -------------------------------------------------------------------------
    // Cache Configuration
    // -------------------------------------------------------------------------
    // Universities change infrequently, so we use a longer stale time.
    // This prevents unnecessary API calls when navigating between pages.
    staleTime: STALE_TIMES.UNIVERSITIES,

    // Keep data in cache for 1 hour even after last subscriber unmounts
    gcTime: GC_TIMES.UNIVERSITIES,

    // -------------------------------------------------------------------------
    // Data Transformation
    // -------------------------------------------------------------------------
    // The API returns an array, ensure we always have an array
    select: (data) => Array.isArray(data) ? data : [],
  });
}

/**
 * useUniversity Hook
 *
 * Fetches and caches a single university's details.
 * Used on the UniversityDetailPage.
 *
 * @param {number|string} id - University ID
 * @returns {object} React Query result with university data
 *
 * @example
 * function UniversityDetailPage() {
 *   const { id } = useParams();
 *   const { data: university, isLoading } = useUniversity(id);
 *
 *   if (isLoading) return <Spinner />;
 *   return <UniversityDetails university={university} />;
 * }
 */
export function useUniversity(id) {
  return useQuery({
    queryKey: universityKeys.detail(id),
    queryFn: () => getUniversity(id),

    // Only fetch if we have a valid ID
    enabled: !!id,

    // Use same stale time as universities list
    staleTime: STALE_TIMES.UNIVERSITIES,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * useRemoveMember Hook
 *
 * Mutation hook for removing a member from a university (admin only).
 * Handles cache invalidation after successful removal.
 *
 * @returns {object} React Query mutation result
 * @returns {Function} mutate - Function to trigger the mutation
 * @returns {Function} mutateAsync - Async version of mutate
 * @returns {boolean} isPending - True while mutation is in progress
 * @returns {boolean} isError - True if mutation failed
 *
 * @example
 * function RemoveMemberButton({ universityId, userId }) {
 *   const removeMutation = useRemoveMember();
 *
 *   const handleRemove = async () => {
 *     try {
 *       await removeMutation.mutateAsync({ universityId, userId });
 *       toast.success('Member removed!');
 *     } catch (error) {
 *       toast.error('Failed to remove member');
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleRemove} disabled={removeMutation.isPending}>
 *       {removeMutation.isPending ? 'Removing...' : 'Remove'}
 *     </button>
 *   );
 * }
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ universityId, userId }) => removeMember(universityId, userId),

    // -------------------------------------------------------------------------
    // Cache Invalidation
    // -------------------------------------------------------------------------
    // After removing a member, invalidate relevant caches so data is refetched
    onSuccess: (_data, { universityId }) => {
      // Invalidate the specific university's cache
      queryClient.invalidateQueries({ queryKey: universityKeys.detail(universityId) });

      // Invalidate the universities list to update member counts
      queryClient.invalidateQueries({ queryKey: universityKeys.list() });
    },
  });
}

/**
 * useUpdateMemberRole Hook
 *
 * Mutation hook for updating a member's role at a university.
 * Handles cache invalidation after successful role update.
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * function RoleButton({ universityId, userId, newRole }) {
 *   const updateRole = useUpdateMemberRole();
 *
 *   const handleClick = async () => {
 *     try {
 *       await updateRole.mutateAsync({ universityId, userId, role: newRole });
 *       toast.success('Role updated!');
 *     } catch (error) {
 *       toast.error('Failed to update role');
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleClick} disabled={updateRole.isPending}>
 *       {updateRole.isPending ? 'Updating...' : 'Update Role'}
 *     </button>
 *   );
 * }
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ universityId, userId, role }) =>
      updateMemberRole(universityId, userId, role),

    onSuccess: (_data, { universityId }) => {
      // Invalidate the specific university's cache to refresh member roles
      queryClient.invalidateQueries({ queryKey: universityKeys.detail(universityId) });
    },
  });
}

/**
 * useUpdateUniversity Hook
 *
 * Mutation hook for updating university details (name, description, websiteUrl, etc.).
 * Handles cache invalidation after successful update.
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * const updateMutation = useUpdateUniversity();
 * updateMutation.mutate(
 *   { universityId: 5, updates: { clubName: 'New Name', websiteUrl: 'https://...' } },
 *   { onSuccess: () => toast.success('Updated!') }
 * );
 */
export function useUpdateUniversity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ universityId, updates }) => updateUniversity(universityId, updates),

    onSuccess: (_, { universityId }) => {
      // Invalidate the specific university's cache
      queryClient.invalidateQueries({ queryKey: universityKeys.detail(universityId) });

      // Invalidate the universities list to reflect any changes
      queryClient.invalidateQueries({ queryKey: universityKeys.list() });
    },
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Prefetch universities data
 *
 * Call this before navigating to a page that needs universities data.
 * Useful for preloading data during hover or before route transition.
 *
 * @param {QueryClient} queryClient - The query client instance
 *
 * @example
 * // Prefetch on hover
 * <Link
 *   to="/universities"
 *   onMouseEnter={() => prefetchUniversities(queryClient)}
 * >
 *   Universities
 * </Link>
 */
export function prefetchUniversities(queryClient) {
  return queryClient.prefetchQuery({
    queryKey: universityKeys.list(),
    queryFn: getUniversities,
    staleTime: STALE_TIMES.UNIVERSITIES,
  });
}
