/**
 * Notes/Community Hooks Module
 * React Query hooks for fetching and managing community notes.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotes,
  createNote,
  toggleLikeNote,
  toggleBookmarkNote,
  deleteNote,
} from '../api/notes';
import { STALE_TIMES } from '../config/cache';
import {
  createFeedItemKeys,
  createListHook,
  createCreateHook,
  createBookmarkHook,
  createDeleteHook,
  createPrefetchFn,
} from './factories/feedItemHooks';

// Query Keys
export const noteKeys = createFeedItemKeys('notes');

// List hook
export const useNotes = createListHook({
  keys: noteKeys,
  fetchFn: fetchNotes,
  staleTime: STALE_TIMES.NOTES,
});

// Create mutation
export const useCreateNote = createCreateHook({
  keys: noteKeys,
  createFn: createNote,
});

// Bookmark mutation
export const useBookmarkNote = createBookmarkHook({
  keys: noteKeys,
  toggleFn: toggleBookmarkNote,
});

// Delete mutation
export const useDeleteNote = createDeleteHook({
  keys: noteKeys,
  deleteFn: deleteNote,
});

// Prefetch utility
export const prefetchNotes = createPrefetchFn({
  keys: noteKeys,
  fetchFn: fetchNotes,
  staleTime: STALE_TIMES.NOTES,
});

/**
 * useLikeNote Hook
 * Unique to notes - includes like count tracking with optimistic updates.
 */
export function useLikeNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleLikeNote,

    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.all });
      const previousQueries = queryClient.getQueriesData({ queryKey: noteKeys.all });

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
