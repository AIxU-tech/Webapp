/**
 * Users Hooks Module
 *
 * Provides React Query hooks for fetching and managing user data.
 * Used for profile pages and user-related operations.
 *
 * Available Hooks:
 * - useUser(userId): Get user profile by ID
 * - useUpdateProfile(): Mutation to update current user's profile
 *
 * Usage:
 *   const { data: user, isLoading } = useUser(userId);
 *   const updateMutation = useUpdateProfile();
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { STALE_TIMES } from '../config/cache';

// =============================================================================
// Query Keys
// =============================================================================

export const userKeys = {
  // Base key for all user queries
  all: ['users'],

  // Key for specific user profile
  detail: (userId) => [...userKeys.all, 'detail', userId],

  // Key for current user (from AuthContext)
  current: () => [...userKeys.all, 'current'],
};

// =============================================================================
// API Functions
// =============================================================================
// These are defined here to keep user-related API calls co-located with hooks

/**
 * Fetch user profile by ID
 */
async function fetchUser(userId) {
  return api.get(`/users/${userId}`);
}

/**
 * Update current user's profile
 */
async function updateProfile(updates) {
  // Use FormData for profile updates that might include files
  const response = await fetch('/api/profile', {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update profile');
  }

  return response.json();
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * useUser Hook
 *
 * Fetches and caches a user's profile by ID.
 * Used on profile pages to display user information.
 *
 * @param {number|string} userId - User ID to fetch
 * @returns {object} React Query result with user data
 *
 * @example
 * function ProfilePage() {
 *   const { userId } = useParams();
 *   const { data: user, isLoading, error } = useUser(userId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *
 *   return <ProfileDisplay user={user} />;
 * }
 */
export function useUser(userId) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => fetchUser(userId),

    // Only fetch if we have a valid userId
    enabled: !!userId,

    // User profiles don't change frequently
    staleTime: STALE_TIMES.USERS,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * useUpdateProfile Hook
 *
 * Mutation hook for updating the current user's profile.
 * Invalidates relevant caches after successful update.
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * const updateMutation = useUpdateProfile();
 *
 * const handleSave = async () => {
 *   try {
 *     await updateMutation.mutateAsync({
 *       first_name: 'John',
 *       last_name: 'Doe',
 *       about_section: 'AI researcher...',
 *     });
 *     toast.success('Profile updated!');
 *   } catch (error) {
 *     toast.error(error.message);
 *   }
 * };
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,

    onSuccess: (data, variables) => {
      // Invalidate user queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: userKeys.all });

      // If we have the user ID in the response, update that specific cache
      if (data?.user?.id) {
        queryClient.setQueryData(userKeys.detail(data.user.id), data.user);
      }
    },
  });
}

/**
 * useUploadProfilePicture Hook
 *
 * Mutation hook for uploading a profile picture.
 *
 * @returns {object} React Query mutation result
 */
export function useUploadProfilePicture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      // Provide a filename for the blob - backend requires valid extension
      const filename = file.name || 'profile_picture.jpg';
      formData.append('profile_picture', file, filename);

      const response = await fetch('/api/profile/picture', {
        method: 'PUT',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload picture');
      }

      return response.json();
    },

    onSuccess: () => {
      // Invalidate user queries to refetch with new picture
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/**
 * useDeleteProfilePicture Hook
 *
 * Mutation hook for deleting profile picture.
 *
 * @returns {object} React Query mutation result
 */
export function useDeleteProfilePicture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/profile/picture', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete picture');
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/**
 * useUploadProfileBanner Hook
 *
 * Mutation hook for uploading a profile banner image.
 * Banner is automatically cropped to 5:1 aspect ratio.
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * const uploadBannerMutation = useUploadProfileBanner();
 *
 * const handleUpload = async (blob) => {
 *   await uploadBannerMutation.mutateAsync(blob);
 * };
 */
export function useUploadProfileBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      const filename = file.name || 'banner.jpg';
      formData.append('banner', file, filename);

      const response = await fetch('/api/profile/banner', {
        method: 'PUT',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload banner');
      }

      return response.json();
    },

    // Update cache with new banner URL immediately on success (prevents flash)
    onSuccess: (data) => {
      if (data?.banner_image_url) {
        // Update all user detail queries that might have this user
        queryClient.setQueriesData({ queryKey: userKeys.all }, (oldData) => {
          if (oldData && typeof oldData === 'object') {
            return {
              ...oldData,
              banner_image_url: data.banner_image_url,
              hasBanner: true,
            };
          }
          return oldData;
        });
      }
      // Then invalidate to ensure full consistency
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

// =============================================================================
// Prefetch Utilities
// =============================================================================

/**
 * Prefetch a user's profile
 *
 * Call this to preload a user's profile data into cache before navigating
 * to their profile page. Useful for prefetching on hover over user avatars.
 *
 * @param {QueryClient} queryClient - The query client instance
 * @param {number|string} userId - The user ID to prefetch
 *
 * @example
 * // Prefetch user profile on hover
 * onMouseEnter={() => prefetchUser(queryClient, userId)}
 */
export function prefetchUser(queryClient, userId) {
  if (!userId) return;

  return queryClient.prefetchQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => fetchUser(userId),
    staleTime: STALE_TIMES.USERS,
  });
}
