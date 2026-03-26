/**
 * Universities Hooks Module
 *
 * Provides React Query hooks for fetching and managing university data.
 * These hooks handle caching, loading states, and error handling automatically.
 *
 * Available Hooks:
 * - useUniversities(): Get all universities
 * - useUniversity(id): Get single university details
 * - useCreateUniversity(): Mutation to create a university (site admin only)
 * - useRemoveMember(): Mutation to remove a member (admin only)
 * - useUpdateMemberRole(): Mutation to update member role
 * - useUpdateUniversity(): Mutation to update university details
 * - useUploadUniversityLogo(): Mutation to upload university logo
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUniversities,
  getUniversity,
  createUniversity,
  removeMember,
  updateMemberRole,
  updateUniversity,
  uploadUniversityLogo,
  uploadUniversityBanner,
  getMemberAttendance,
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

  // Key for a member's attendance history at a university
  memberAttendance: (universityId, userId) => [
    ...universityKeys.all,
    'detail',
    universityId,
    'memberAttendance',
    userId,
  ],
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
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: universityKeys.detail(id),
    queryFn: () => getUniversity(id),

    // Only fetch if we have a valid ID
    enabled: !!id,

    // Use same stale time as universities list
    staleTime: STALE_TIMES.UNIVERSITIES,

    // Keep in cache to survive navigation
    gcTime: GC_TIMES.UNIVERSITIES,

    // Seed from list cache to avoid loading spinner while detail fetches.
    // List items lack detail-only fields (members, permissions, etc.) so add safe defaults.
    placeholderData: () => {
      const universities = queryClient.getQueryData(universityKeys.list());
      if (Array.isArray(universities)) {
        const match = universities.find((uni) => String(uni.id) === String(id));
        if (match) return { ...match, members: [], permissions: {}, isMember: false };
      }
      return undefined;
    },
  });
}

/**
 * useMemberAttendance Hook
 *
 * Fetches a member's event attendance history at a university.
 * Used on the executive portal member detail view.
 *
 * @param {number|string} universityId - University ID
 * @param {number|string} userId - Member's user ID
 * @returns {object} React Query result with { events: [...] }
 */
export function useMemberAttendance(universityId, userId) {
  return useQuery({
    queryKey: universityKeys.memberAttendance(universityId, userId),
    queryFn: () => getMemberAttendance(universityId, userId),
    enabled: !!universityId && !!userId,
    staleTime: STALE_TIMES.UNIVERSITIES,
    gcTime: GC_TIMES.UNIVERSITIES,
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

    // Optimistic update: update cache immediately before server responds
    onMutate: async ({ universityId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: universityKeys.detail(universityId) });

      // Snapshot the previous value
      const previousUniversity = queryClient.getQueryData(universityKeys.detail(universityId));

      // Optimistically update the cache
      if (previousUniversity) {
        queryClient.setQueryData(universityKeys.detail(universityId), {
          ...previousUniversity,
          ...updates,
        });
      }

      // Return context with the previous value
      return { previousUniversity, universityId };
    },

    // If mutation fails, roll back to previous value
    onError: (err, variables, context) => {
      if (context?.previousUniversity) {
        queryClient.setQueryData(
          universityKeys.detail(context.universityId),
          context.previousUniversity
        );
      }
    },

    // Always refetch after error or success to ensure data is in sync
    onSettled: (_, __, { universityId }) => {
      queryClient.invalidateQueries({ queryKey: universityKeys.detail(universityId) });
      queryClient.invalidateQueries({ queryKey: universityKeys.list() });
    },
  });
}

/**
 * useCreateUniversity Hook
 *
 * Mutation hook for creating a new university (site admin only).
 * Handles cache invalidation after successful creation.
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * const createMutation = useCreateUniversity();
 * createMutation.mutate(
 *   { name: 'MIT', clubName: 'MIT AI Club', emailDomain: 'mit' },
 *   { onSuccess: (data) => console.log('Created:', data.university.id) }
 * );
 */
export function useCreateUniversity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUniversity,

    onSuccess: () => {
      // Invalidate universities list to show new university
      queryClient.invalidateQueries({ queryKey: universityKeys.list() });
    },
  });
}

// =============================================================================
// Image Upload Helpers
// =============================================================================

/**
 * Snapshot a university detail query for optimistic rollback.
 */
async function _snapshotUniversityDetail(queryClient, universityId) {
  await queryClient.cancelQueries({ queryKey: universityKeys.detail(universityId) });
  return queryClient.getQueryData(universityKeys.detail(universityId));
}

function _rollbackUniversityDetail(queryClient, universityId, previousData) {
  if (previousData) {
    queryClient.setQueryData(universityKeys.detail(universityId), previousData);
  }
}

/**
 * useUploadUniversityLogo Hook
 *
 * Mutation hook for uploading a university logo.
 * Handles cache invalidation after successful upload.
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * const uploadMutation = useUploadUniversityLogo();
 * uploadMutation.mutate(
 *   { universityId: 1, file: imageBlob },
 *   { onSuccess: () => toast.success('Logo uploaded!') }
 * );
 */
export function useUploadUniversityLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ universityId, file }) => uploadUniversityLogo(universityId, file),

    onMutate: async ({ universityId }) => {
      const previousUniversity = await _snapshotUniversityDetail(queryClient, universityId);

      if (previousUniversity) {
        queryClient.setQueryData(universityKeys.detail(universityId), {
          ...previousUniversity,
          hasLogo: true,
        });
      }

      return { previousUniversity, universityId };
    },

    onError: (_err, _vars, ctx) => {
      _rollbackUniversityDetail(queryClient, ctx?.universityId, ctx?.previousUniversity);
    },

    onSuccess: (data, { universityId }) => {
      if (data?.hasLogo) {
        const currentData = queryClient.getQueryData(universityKeys.detail(universityId));
        if (currentData) {
          queryClient.setQueryData(universityKeys.detail(universityId), {
            ...currentData,
            hasLogo: true,
          });
        }
      }
    },

    onSettled: (_, __, { universityId }) => {
      queryClient.invalidateQueries({ queryKey: universityKeys.detail(universityId) });
    },
  });
}

/**
 * useUploadUniversityBanner Hook
 *
 * Mutation hook for uploading a university banner.
 * Banner is automatically cropped to 5:1 aspect ratio.
 * Handles cache invalidation after successful upload.
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * const uploadMutation = useUploadUniversityBanner();
 * uploadMutation.mutate(
 *   { universityId: 1, file: imageBlob },
 *   { onSuccess: () => toast.success('Banner uploaded!') }
 * );
 */
export function useUploadUniversityBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ universityId, file }) => uploadUniversityBanner(universityId, file),

    onMutate: async ({ universityId }) => {
      const previousUniversity = await _snapshotUniversityDetail(queryClient, universityId);

      if (previousUniversity) {
        queryClient.setQueryData(universityKeys.detail(universityId), {
          ...previousUniversity,
          hasBanner: true,
        });
      }

      return { previousUniversity, universityId };
    },

    onError: (_err, _vars, ctx) => {
      _rollbackUniversityDetail(queryClient, ctx?.universityId, ctx?.previousUniversity);
    },

    onSuccess: (data, { universityId }) => {
      if (data?.bannerUrl) {
        const currentData = queryClient.getQueryData(universityKeys.detail(universityId));
        if (currentData) {
          queryClient.setQueryData(universityKeys.detail(universityId), {
            ...currentData,
            hasBanner: true,
            bannerUrl: data.bannerUrl,
          });
        }
      }
    },

    onSettled: (_, __, { universityId }) => {
      queryClient.invalidateQueries({ queryKey: universityKeys.detail(universityId) });
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
