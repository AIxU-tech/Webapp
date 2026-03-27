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
import { STALE_TIMES, GC_TIMES } from '../config/cache';
import {
  getUser,
  updateProfile,
  deleteProfileBanner,
  createEducation,
  updateEducation,
  deleteEducation,
  createExperience,
  updateExperience,
  deleteExperience,
  createProject,
  updateProject,
  deleteProject,
} from '../api/users';

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
/**
 * Map a university member object to the user profile schema so it can
 * safely serve as placeholderData while the full profile fetches.
 *
 * Member schema (from GET /api/universities/:id):
 *   {id, name, email, avatar, about, location, skills, postCount, role, roleName, eventsAttendedCount}
 *
 * Profile schema (from GET /api/users/:id):
 *   {id, full_name, first_name, last_name, email, profile_picture_url, about_section, location, skills, ...}
 */
function memberToUserPlaceholder(member) {
  if (!member) return undefined;

  const nameParts = (member.name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  return {
    id: member.id,
    email: member.email,
    first_name: firstName,
    last_name: lastName,
    full_name: member.name || '',
    profile_picture_url: member.avatar || null,
    about_section: member.about || '',
    location: member.location || '',
    skills: member.skills || [],
    post_count: member.postCount || 0,
    // Fields unavailable from member data — safe defaults
    university: undefined,
    headline: undefined,
    hasBanner: false,
    hasResume: false,
    socialLinks: [],
    education: [],
    experience: [],
    projects: [],
    recent_activity: [],
    follower_count: 0,
    following_count: 0,
    permissionLevel: 0,
    isExecutiveAnywhere: false,
  };
}

export function useUser(userId) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => getUser(userId),

    // Only fetch if we have a valid userId
    enabled: !!userId,

    // User profiles don't change frequently
    staleTime: STALE_TIMES.USERS,
    gcTime: GC_TIMES.USERS,

    // Seed from university member lists in cache (mapped to profile schema)
    placeholderData: () => {
      const uniQueries = queryClient.getQueriesData({
        queryKey: ['universities', 'detail'],
      });
      for (const [, data] of uniQueries) {
        if (!data?.members) continue;
        const match = data.members.find((m) => String(m.id) === String(userId));
        if (match) return memberToUserPlaceholder(match);
      }
      return undefined;
    },
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

    onMutate: async (updates) => {
      const previousQueries = await _snapshotUserQueries(queryClient);
      // Merge partial updates into all cached user objects
      queryClient.setQueriesData({ queryKey: userKeys.all }, (old) => {
        if (old && typeof old === 'object' && !Array.isArray(old) && old.id) {
          return { ...old, ...updates };
        }
        return old;
      });
      return { previousQueries };
    },

    onError: (_err, _vars, ctx) => _rollback(queryClient, ctx?.previousQueries),

    onSuccess: (data) => {
      // If we have the user ID in the response, update that specific cache
      if (data?.user?.id) {
        queryClient.setQueryData(userKeys.detail(data.user.id), data.user);
      }
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
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

    onMutate: async (file) => {
      const previousQueries = await _snapshotUserQueries(queryClient);
      // Create a local blob URL for optimistic display
      const previewUrl = URL.createObjectURL(file);
      queryClient.setQueriesData({ queryKey: userKeys.all }, (oldData) => {
        if (oldData && typeof oldData === 'object' && !Array.isArray(oldData) && oldData.id) {
          return { ...oldData, profile_picture_url: previewUrl };
        }
        return oldData;
      });
      return { previousQueries, previewUrl };
    },

    onError: (_err, _vars, ctx) => {
      _rollback(queryClient, ctx?.previousQueries);
      if (ctx?.previewUrl) URL.revokeObjectURL(ctx.previewUrl);
    },

    onSuccess: (data, _vars, ctx) => {
      // Replace blob URL with server URL in cache
      if (data?.profile_picture_url) {
        queryClient.setQueriesData({ queryKey: userKeys.all }, (oldData) => {
          if (oldData && typeof oldData === 'object' && !Array.isArray(oldData) && oldData.id) {
            return { ...oldData, profile_picture_url: data.profile_picture_url };
          }
          return oldData;
        });
      }
      if (ctx?.previewUrl) URL.revokeObjectURL(ctx.previewUrl);
    },

    onSettled: () => {
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

    onMutate: async () => {
      const previousQueries = await _snapshotUserQueries(queryClient);
      queryClient.setQueriesData({ queryKey: userKeys.all }, (oldData) => {
        if (oldData && typeof oldData === 'object' && !Array.isArray(oldData) && oldData.id) {
          return { ...oldData, hasBanner: true };
        }
        return oldData;
      });
      return { previousQueries };
    },

    onError: (_err, _vars, ctx) => _rollback(queryClient, ctx?.previousQueries),

    onSuccess: (data) => {
      if (data?.banner_image_url) {
        queryClient.setQueriesData({ queryKey: userKeys.all }, (oldData) => {
          if (oldData && typeof oldData === 'object' && !Array.isArray(oldData) && oldData.id) {
            return {
              ...oldData,
              banner_image_url: data.banner_image_url,
              hasBanner: true,
            };
          }
          return oldData;
        });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/**
 * useDeleteProfileBanner Hook
 *
 * Mutation hook for deleting profile banner.
 *
 * @returns {object} React Query mutation result
 */
export function useDeleteProfileBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProfileBanner,

    onMutate: async () => {
      const previousQueries = await _snapshotUserQueries(queryClient);
      queryClient.setQueriesData({ queryKey: userKeys.all }, (oldData) => {
        if (oldData && typeof oldData === 'object' && !Array.isArray(oldData) && oldData.id) {
          return { ...oldData, hasBanner: false, banner_image_url: null };
        }
        return oldData;
      });
      return { previousQueries };
    },

    onError: (_err, _vars, ctx) => _rollback(queryClient, ctx?.previousQueries),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

// =============================================================================
// Profile Section Mutation Hooks (Education, Experience, Projects)
// =============================================================================

/**
 * Snapshot all user queries for optimistic rollback.
 * Follows the pattern from useEvents.js (onMutate/onError/onSettled).
 */
async function _snapshotUserQueries(queryClient) {
  await queryClient.cancelQueries({ queryKey: userKeys.all });
  return queryClient.getQueriesData({ queryKey: userKeys.all });
}

function _rollback(queryClient, previousQueries) {
  if (previousQueries) {
    previousQueries.forEach(([key, data]) => queryClient.setQueryData(key, data));
  }
}

function useCreateSectionMutation(createFn, sectionKey) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFn,
    onMutate: async (newEntry) => {
      const previousQueries = await _snapshotUserQueries(queryClient);
      const tempEntry = { ...newEntry, id: Date.now(), display_order: 0 };
      queryClient.setQueriesData({ queryKey: userKeys.all }, (old) => {
        if (old && Array.isArray(old[sectionKey])) {
          return { ...old, [sectionKey]: [...old[sectionKey], tempEntry] };
        }
        return old;
      });
      return { previousQueries };
    },
    onError: (_err, _vars, ctx) => _rollback(queryClient, ctx?.previousQueries),
    onSettled: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

function useUpdateSectionMutation(updateFn, sectionKey) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFn,
    onMutate: async (updatedEntry) => {
      const previousQueries = await _snapshotUserQueries(queryClient);
      queryClient.setQueriesData({ queryKey: userKeys.all }, (old) => {
        if (old && Array.isArray(old[sectionKey])) {
          return {
            ...old,
            [sectionKey]: old[sectionKey].map((item) =>
              item.id === updatedEntry.id ? { ...item, ...updatedEntry } : item
            ),
          };
        }
        return old;
      });
      return { previousQueries };
    },
    onError: (_err, _vars, ctx) => _rollback(queryClient, ctx?.previousQueries),
    onSettled: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

function useDeleteSectionMutation(deleteFn, sectionKey) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFn,
    onMutate: async (id) => {
      const previousQueries = await _snapshotUserQueries(queryClient);
      queryClient.setQueriesData({ queryKey: userKeys.all }, (old) => {
        if (old && Array.isArray(old[sectionKey])) {
          return { ...old, [sectionKey]: old[sectionKey].filter((item) => item.id !== id) };
        }
        return old;
      });
      return { previousQueries };
    },
    onError: (_err, _vars, ctx) => _rollback(queryClient, ctx?.previousQueries),
    onSettled: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useCreateEducation() {
  return useCreateSectionMutation(createEducation, 'education');
}

export function useUpdateEducation() {
  return useUpdateSectionMutation(({ id, ...data }) => updateEducation(id, data), 'education');
}

export function useDeleteEducation() {
  return useDeleteSectionMutation(deleteEducation, 'education');
}

export function useCreateExperience() {
  return useCreateSectionMutation(createExperience, 'experience');
}

export function useUpdateExperience() {
  return useUpdateSectionMutation(({ id, ...data }) => updateExperience(id, data), 'experience');
}

export function useDeleteExperience() {
  return useDeleteSectionMutation(deleteExperience, 'experience');
}

export function useCreateProject() {
  return useCreateSectionMutation(createProject, 'projects');
}

export function useUpdateProject() {
  return useUpdateSectionMutation(({ id, ...data }) => updateProject(id, data), 'projects');
}

export function useDeleteProject() {
  return useDeleteSectionMutation(deleteProject, 'projects');
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
    queryFn: () => getUser(userId),
    staleTime: STALE_TIMES.USERS,
  });
}
