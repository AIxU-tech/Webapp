/**
 * Notes/Community Hooks Module
 *
 * Provides React Query hooks for fetching and managing community notes.
 * Includes optimistic updates for like/bookmark actions.
 *
 * Key Features:
 * - Optimistic updates: Like/bookmark feel instant
 * - Automatic rollback: Reverts on API failure
 * - Search integration: Cached by search params
 *
 * Available Hooks:
 * - useNotes(params): Get notes with optional filters
 * - useCreateNote(): Mutation to create a note
 * - useLikeNote(): Mutation to like/unlike with optimistic update
 * - useBookmarkNote(): Mutation to bookmark/unbookmark with optimistic update
 * - useDeleteNote(): Mutation to delete a note
 *
 * Usage:
 *   const { data: notes, isLoading } = useNotes({ search: 'AI' });
 *   const likeMutation = useLikeNote();
 *   likeMutation.mutate(noteId);
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotes,
  createNote,
  toggleLikeNote,
  toggleBookmarkNote,
  deleteNote,
} from '../api/notes';
import { STALE_TIMES } from '../config/cache';

// =============================================================================
// Query Keys
// =============================================================================

export const noteKeys = {
  // Base key for all note queries
  all: ['notes'],

  // Key for notes list with filters
  list: (params = {}) => [...noteKeys.all, 'list', params],
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * useNotes Hook
 *
 * Fetches and caches notes with optional search/filter parameters.
 * Different param combinations are cached separately.
 *
 * @param {object} params - Query parameters
 * @param {string} [params.search] - Search query
 * @param {number} [params.user] - Filter by user ID
 * @returns {object} React Query result with notes array
 *
 * Cache Behavior:
 * - 2 minute stale time (notes change more frequently)
 * - Each unique params combination has its own cache entry
 *
 * @example
 * // All notes
 * const { data: notes } = useNotes();
 *
 * // Filtered notes
 * const { data: userNotes } = useNotes({ user: userId });
 * const { data: searchResults } = useNotes({ search: 'transformers' });
 */
export function useNotes(params = {}) {
  return useQuery({
    queryKey: noteKeys.list(params),
    queryFn: () => fetchNotes(params),

    // Notes change more frequently than universities
    staleTime: STALE_TIMES.NOTES,

    // Transform data to ensure array
    select: (data) => Array.isArray(data) ? data : [],
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * useCreateNote Hook
 *
 * Mutation hook for creating a new note.
 * Invalidates notes cache to show the new note.
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * const createMutation = useCreateNote();
 *
 * const handleCreate = async () => {
 *   await createMutation.mutateAsync({
 *     title: 'My Note',
 *     content: 'Note content...',
 *     tags: ['AI', 'Research']
 *   });
 * };
 */
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNote,

    // After creating, invalidate all notes queries to show the new note
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
}

/**
 * useLikeNote Hook
 *
 * Mutation hook for liking/unliking a note with optimistic updates.
 * UI updates instantly, reverts if API call fails.
 *
 * Optimistic Update Flow:
 * 1. User clicks like → UI updates immediately
 * 2. API call sent in background
 * 3a. Success → Update with server data (handles any discrepancy)
 * 3b. Failure → Revert to previous state
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * const likeMutation = useLikeNote();
 *
 * <button onClick={() => likeMutation.mutate(note.id)}>
 *   {note.isLiked ? 'Unlike' : 'Like'}
 * </button>
 */
export function useLikeNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleLikeNote,

    // -------------------------------------------------------------------------
    // Optimistic Update
    // -------------------------------------------------------------------------
    onMutate: async (noteId) => {
      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: noteKeys.all });

      // Snapshot current data for potential rollback
      const previousQueries = queryClient.getQueriesData({ queryKey: noteKeys.all });

      // Optimistically update all notes queries that contain this note
      queryClient.setQueriesData({ queryKey: noteKeys.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;

        return oldData.map((note) => {
          if (note.id === noteId) {
            return {
              ...note,
              isLiked: !note.isLiked,
              likes: note.isLiked ? note.likes - 1 : note.likes + 1,
            };
          }
          return note;
        });
      });

      // Return context for rollback
      return { previousQueries };
    },

    // -------------------------------------------------------------------------
    // Error Handling (Rollback)
    // -------------------------------------------------------------------------
    onError: (err, noteId, context) => {
      // Rollback to previous state on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // -------------------------------------------------------------------------
    // Success Handler
    // -------------------------------------------------------------------------
    onSuccess: (result, noteId) => {
      // Update with actual server response to ensure consistency
      queryClient.setQueriesData({ queryKey: noteKeys.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;

        return oldData.map((note) => {
          if (note.id === noteId) {
            return {
              ...note,
              isLiked: result.isLiked,
              likes: result.likes,
            };
          }
          return note;
        });
      });
    },
  });
}

/**
 * useBookmarkNote Hook
 *
 * Mutation hook for bookmarking/unbookmarking a note with optimistic updates.
 * Same pattern as useLikeNote.
 *
 * @returns {object} React Query mutation result
 */
export function useBookmarkNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleBookmarkNote,

    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.all });

      const previousQueries = queryClient.getQueriesData({ queryKey: noteKeys.all });

      queryClient.setQueriesData({ queryKey: noteKeys.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;

        return oldData.map((note) => {
          if (note.id === noteId) {
            return {
              ...note,
              isBookmarked: !note.isBookmarked,
            };
          }
          return note;
        });
      });

      return { previousQueries };
    },

    onError: (err, noteId, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSuccess: (result, noteId) => {
      queryClient.setQueriesData({ queryKey: noteKeys.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;

        return oldData.map((note) => {
          if (note.id === noteId) {
            return {
              ...note,
              isBookmarked: result.isBookmarked,
            };
          }
          return note;
        });
      });
    },
  });
}

/**
 * useDeleteNote Hook
 *
 * Mutation hook for deleting a note with optimistic removal.
 * Note is immediately removed from UI, restored if delete fails.
 *
 * @returns {object} React Query mutation result
 */
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNote,

    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.all });

      const previousQueries = queryClient.getQueriesData({ queryKey: noteKeys.all });

      // Optimistically remove the note
      queryClient.setQueriesData({ queryKey: noteKeys.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.filter((note) => note.id !== noteId);
      });

      return { previousQueries };
    },

    onError: (err, noteId, context) => {
      // Restore the note on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
  });
}

// =============================================================================
// Prefetch Utilities
// =============================================================================

/**
 * Prefetch notes data
 *
 * Call this to preload notes into the cache before the user navigates
 * to the CommunityPage. Data will be instantly available when the page loads.
 *
 * @param {QueryClient} queryClient - The query client instance
 * @param {Object} params - Optional filter parameters (search, user, etc.)
 *
 * @example
 * // Prefetch default notes list
 * prefetchNotes(queryClient);
 *
 * // Prefetch filtered notes
 * prefetchNotes(queryClient, { search: 'AI' });
 */
export function prefetchNotes(queryClient, params = {}) {
  return queryClient.prefetchQuery({
    queryKey: noteKeys.list(params),
    queryFn: () => fetchNotes(params),
    staleTime: STALE_TIMES.NOTES,
  });
}
