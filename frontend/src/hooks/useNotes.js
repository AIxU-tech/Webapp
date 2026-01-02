/**
 * Notes/Community Hooks Module
 * React Query hooks for fetching and managing community notes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotes,
  fetchNote,
  createNote,
  toggleLikeNote,
  toggleBookmarkNote,
  deleteNote,
  fetchComments,
  createComment,
  updateComment,
  deleteComment,
  toggleLikeComment,
} from '../api/notes';
import { STALE_TIMES } from '../config/cache';
import {
  createFeedItemKeys,
  createListHook,
  createCreateHook,
  createPrefetchFn,
} from './factories/feedItemHooks';

// Query Keys - extend factory keys with comments and detail keys
const baseKeys = createFeedItemKeys('notes');
export const noteKeys = {
  ...baseKeys,
  detail: (noteId) => [...baseKeys.all, 'detail', noteId],
  comments: (noteId) => [...baseKeys.all, noteId, 'comments'],
};

// List hook
export const useNotes = createListHook({
  keys: noteKeys,
  fetchFn: fetchNotes,
  staleTime: STALE_TIMES.NOTES,
});

// Detail hook
export function useNote(noteId) {
  return useQuery({
    queryKey: noteKeys.detail(noteId),
    queryFn: () => fetchNote(noteId),
    enabled: !!noteId,
    staleTime: STALE_TIMES.NOTES,
  });
}

// Create mutation
export const useCreateNote = createCreateHook({
  keys: noteKeys,
  createFn: createNote,
});

// Bookmark mutation - custom implementation to update both list and detail caches
export function useBookmarkNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleBookmarkNote,

    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.all });
      const previousQueries = queryClient.getQueriesData({ queryKey: noteKeys.all });
      const previousDetail = queryClient.getQueryData(noteKeys.detail(noteId));

      // Update list cache
      queryClient.setQueriesData({ queryKey: noteKeys.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((note) => {
          if (note.id === noteId) {
            return { ...note, isBookmarked: !note.isBookmarked };
          }
          return note;
        });
      });

      // Update detail cache
      queryClient.setQueryData(noteKeys.detail(noteId), (oldData) => {
        if (!oldData) return oldData;
        return { ...oldData, isBookmarked: !oldData.isBookmarked };
      });

      return { previousQueries, previousDetail, noteId };
    },

    onError: (err, noteId, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(noteKeys.detail(noteId), context.previousDetail);
      }
    },

    onSuccess: (result, noteId) => {
      // Update list cache with server response
      queryClient.setQueriesData({ queryKey: noteKeys.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((note) => {
          if (note.id === noteId) {
            return { ...note, isBookmarked: result.isBookmarked };
          }
          return note;
        });
      });

      // Update detail cache with server response
      queryClient.setQueryData(noteKeys.detail(noteId), (oldData) => {
        if (!oldData) return oldData;
        return { ...oldData, isBookmarked: result.isBookmarked };
      });
    },
  });
}

// Delete mutation - custom implementation to update both list and detail caches
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNote,

    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.all });
      const previousQueries = queryClient.getQueriesData({ queryKey: noteKeys.all });
      const previousDetail = queryClient.getQueryData(noteKeys.detail(noteId));

      // Remove from list cache
      queryClient.setQueriesData({ queryKey: noteKeys.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.filter((note) => note.id !== noteId);
      });

      // Remove detail cache
      queryClient.removeQueries({ queryKey: noteKeys.detail(noteId) });

      return { previousQueries, previousDetail, noteId };
    },

    onError: (err, noteId, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(noteKeys.detail(noteId), context.previousDetail);
      }
    },
  });
}

// Prefetch utility
export const prefetchNotes = createPrefetchFn({
  keys: noteKeys,
  fetchFn: fetchNotes,
  staleTime: STALE_TIMES.NOTES,
});

/**
 * useLikeNote Hook
 * Includes like count tracking with optimistic updates for both list and detail views.
 */
export function useLikeNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleLikeNote,

    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.all });
      const previousQueries = queryClient.getQueriesData({ queryKey: noteKeys.all });
      const previousDetail = queryClient.getQueryData(noteKeys.detail(noteId));

      // Update list cache
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

      // Update detail cache
      queryClient.setQueryData(noteKeys.detail(noteId), (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          isLiked: !oldData.isLiked,
          likes: oldData.isLiked ? oldData.likes - 1 : oldData.likes + 1,
        };
      });

      return { previousQueries, previousDetail, noteId };
    },

    onError: (err, noteId, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(noteKeys.detail(noteId), context.previousDetail);
      }
    },

    onSuccess: (result, noteId) => {
      // Update list cache with server response
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

      // Update detail cache with server response
      queryClient.setQueryData(noteKeys.detail(noteId), (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          isLiked: result.isLiked,
          likes: result.likes,
        };
      });
    },
  });
}

// =============================================================================
// Comment Query Hooks
// =============================================================================

/**
 * useComments Hook
 *
 * Fetches and caches comments for a specific note.
 * Only fetches when enabled (i.e., when comment section is expanded).
 *
 * @param {number} noteId - The note ID to fetch comments for
 * @param {object} options - Additional options
 * @param {boolean} [options.enabled=true] - Whether to fetch comments
 * @returns {object} React Query result with comments array
 *
 * @example
 * const { data: comments, isLoading } = useComments(noteId, { enabled: isExpanded });
 */
export function useComments(noteId, { enabled = true } = {}) {
  return useQuery({
    queryKey: noteKeys.comments(noteId),
    queryFn: () => fetchComments(noteId),
    enabled: enabled && !!noteId,
    staleTime: STALE_TIMES.NOTES,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

// =============================================================================
// Comment Mutation Hooks
// =============================================================================

/**
 * Resolve the parent ID for a reply based on threading rules.
 *
 * Threading model (max depth of 1):
 * - If replying to a top-level comment (parentId=null), use that comment's id
 * - If replying to a reply (parentId!=null), use that comment's parentId
 *
 * @param {Array} comments - Current comments array
 * @param {number|null} replyToId - ID of comment being replied to
 * @returns {number|null} The parentId to use for the new comment
 */
function resolveParentId(comments, replyToId) {
  if (!replyToId) return null;

  const repliedTo = comments.find((c) => c.id === replyToId);
  if (!repliedTo) return null;

  // If replied-to comment is top-level, use its id as parent
  // If it's already a reply, use its parentId (keeps depth at 1)
  return repliedTo.parentId === null ? repliedTo.id : repliedTo.parentId;
}

/**
 * useCreateComment Hook
 *
 * Mutation hook for creating a new comment with optimistic updates.
 * Supports replies with single-level threading.
 * Adds comment to the end of the list (oldest-first order), reverts on failure.
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * const createMutation = useCreateComment();
 * // Top-level comment
 * createMutation.mutate({ noteId: 123, text: 'Great post!', user: currentUser });
 * // Reply to a comment
 * createMutation.mutate({ noteId: 123, text: '@John Great point!', user: currentUser, replyToId: 456 });
 */
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, text, replyToId }) => createComment(noteId, text, replyToId),

    onMutate: async ({ noteId, text, user, replyToId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: noteKeys.comments(noteId) });
      await queryClient.cancelQueries({ queryKey: noteKeys.all });

      // Snapshot previous data
      const previousComments = queryClient.getQueryData(noteKeys.comments(noteId)) || [];
      const previousNotes = queryClient.getQueriesData({ queryKey: noteKeys.all });

      // Resolve parentId based on threading rules
      const parentId = resolveParentId(previousComments, replyToId);

      // Create optimistic comment (oldest-first order, so add to end)
      const optimisticComment = {
        id: `temp-${Date.now()}`,
        noteId,
        parentId,
        text,
        author: {
          id: user.id,
          name: user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.username,
          avatar: user.profile_picture_url || '/static/default-avatar.png',
        },
        likes: 0,
        timeAgo: 'Just now',
        isEdited: false,
        isLiked: false,
        isOptimistic: true,
      };

      // Add to comments list (at the end for oldest-first order)
      queryClient.setQueryData(noteKeys.comments(noteId), (old = []) => [
        ...old,
        optimisticComment,
      ]);

      // Update note's comment count
      queryClient.setQueriesData({ queryKey: noteKeys.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((note) =>
          note.id === noteId ? { ...note, comments: note.comments + 1 } : note
        );
      });

      return { previousComments, previousNotes, noteId };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousComments !== undefined) {
        queryClient.setQueryData(
          noteKeys.comments(context.noteId),
          context.previousComments
        );
      }
      if (context?.previousNotes) {
        context.previousNotes.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSuccess: (result, { noteId }) => {
      // Replace optimistic comment with real one
      queryClient.setQueryData(noteKeys.comments(noteId), (old = []) =>
        old.map((comment) =>
          comment.isOptimistic ? result.comment : comment
        )
      );

      // Update note's comment count with server value
      queryClient.setQueriesData({ queryKey: noteKeys.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((note) =>
          note.id === noteId ? { ...note, comments: result.commentCount } : note
        );
      });
    },
  });
}

/**
 * useUpdateComment Hook
 *
 * Mutation hook for updating a comment with optimistic updates.
 *
 * @returns {object} React Query mutation result
 */
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, commentId, text }) =>
      updateComment(noteId, commentId, text),

    onMutate: async ({ noteId, commentId, text }) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.comments(noteId) });

      const previousComments = queryClient.getQueryData(noteKeys.comments(noteId));

      // Optimistically update the comment
      queryClient.setQueryData(noteKeys.comments(noteId), (old = []) =>
        old.map((comment) =>
          comment.id === commentId
            ? { ...comment, text, isEdited: true }
            : comment
        )
      );

      return { previousComments, noteId };
    },

    onError: (err, variables, context) => {
      if (context?.previousComments !== undefined) {
        queryClient.setQueryData(
          noteKeys.comments(context.noteId),
          context.previousComments
        );
      }
    },

    onSuccess: (result, { noteId, commentId }) => {
      // Update with server response
      queryClient.setQueryData(noteKeys.comments(noteId), (old = []) =>
        old.map((comment) =>
          comment.id === commentId ? result.comment : comment
        )
      );
    },
  });
}

/**
 * useDeleteComment Hook
 *
 * Mutation hook for deleting a comment with optimistic removal.
 * If deleting a parent comment, also removes all its replies (cascade).
 *
 * @returns {object} React Query mutation result
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, commentId }) => deleteComment(noteId, commentId),

    onMutate: async ({ noteId, commentId }) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.comments(noteId) });
      await queryClient.cancelQueries({ queryKey: noteKeys.all });

      const previousComments = queryClient.getQueryData(noteKeys.comments(noteId)) || [];
      const previousNotes = queryClient.getQueriesData({ queryKey: noteKeys.all });

      // Find the comment being deleted
      const commentToDelete = previousComments.find((c) => c.id === commentId);

      // Count how many comments will be deleted (comment + its replies if it's a parent)
      let deleteCount = 1;
      if (commentToDelete && commentToDelete.parentId === null) {
        // It's a top-level comment, count its replies too
        const replyCount = previousComments.filter((c) => c.parentId === commentId).length;
        deleteCount += replyCount;
      }

      // Optimistically remove the comment and its replies (if parent)
      queryClient.setQueryData(noteKeys.comments(noteId), (old = []) =>
        old.filter((comment) => {
          // Remove the comment itself
          if (comment.id === commentId) return false;
          // If deleting a parent, also remove its replies
          if (commentToDelete?.parentId === null && comment.parentId === commentId) return false;
          return true;
        })
      );

      // Decrement note's comment count by total deleted
      queryClient.setQueriesData({ queryKey: noteKeys.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((note) =>
          note.id === noteId
            ? { ...note, comments: Math.max(0, note.comments - deleteCount) }
            : note
        );
      });

      return { previousComments, previousNotes, noteId };
    },

    onError: (err, variables, context) => {
      if (context?.previousComments !== undefined) {
        queryClient.setQueryData(
          noteKeys.comments(context.noteId),
          context.previousComments
        );
      }
      if (context?.previousNotes) {
        context.previousNotes.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSuccess: (result, { noteId }) => {
      // Update note's comment count with server value
      queryClient.setQueriesData({ queryKey: noteKeys.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((note) =>
          note.id === noteId ? { ...note, comments: result.commentCount } : note
        );
      });
    },
  });
}

/**
 * useLikeComment Hook
 *
 * Mutation hook for liking/unliking a comment with optimistic updates.
 *
 * @returns {object} React Query mutation result
 */
export function useLikeComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, commentId }) => toggleLikeComment(noteId, commentId),

    onMutate: async ({ noteId, commentId }) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.comments(noteId) });

      const previousComments = queryClient.getQueryData(noteKeys.comments(noteId));

      // Optimistically toggle like
      queryClient.setQueryData(noteKeys.comments(noteId), (old = []) =>
        old.map((comment) =>
          comment.id === commentId
            ? {
              ...comment,
              isLiked: !comment.isLiked,
              likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
            }
            : comment
        )
      );

      return { previousComments, noteId };
    },

    onError: (err, variables, context) => {
      if (context?.previousComments !== undefined) {
        queryClient.setQueryData(
          noteKeys.comments(context.noteId),
          context.previousComments
        );
      }
    },

    onSuccess: (result, { noteId, commentId }) => {
      // Update with server response
      queryClient.setQueryData(noteKeys.comments(noteId), (old = []) =>
        old.map((comment) =>
          comment.id === commentId
            ? { ...comment, isLiked: result.isLiked, likes: result.likes }
            : comment
        )
      );
    },
  });
}
