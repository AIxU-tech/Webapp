/**
 * Feed Item Hook Factories
 * Factory functions for creating React Query hooks with common patterns.
 * Used by Notes, Opportunities, and future feed-type features.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

/**
 * Creates query keys for a feed item type.
 * @param {string} baseKey - e.g., 'notes', 'opportunities'
 */
export function createFeedItemKeys(baseKey) {
  return {
    all: [baseKey],
    list: (params = {}) => [baseKey, 'list', params],
  };
}

/**
 * Creates a list query hook with standard configuration.
 * @param {object} config - { keys, fetchFn, staleTime }
 */
export function createListHook({ keys, fetchFn, staleTime }) {
  return function useList(params = {}) {
    return useQuery({
      queryKey: keys.list(params),
      queryFn: () => fetchFn(params),
      staleTime,
      placeholderData: keepPreviousData,
      select: (data) => (Array.isArray(data) ? data : []),
    });
  };
}

/**
 * Creates a create mutation hook that invalidates queries on success.
 * @param {object} config - { keys, createFn }
 */
export function createCreateHook({ keys, createFn }) {
  return function useCreate() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: createFn,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: keys.all });
      },
    });
  };
}

/**
 * Creates a bookmark toggle mutation with optimistic updates.
 * @param {object} config - { keys, toggleFn, bookmarkField? }
 */
export function createBookmarkHook({ keys, toggleFn, bookmarkField = 'isBookmarked' }) {
  return function useBookmark() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: toggleFn,

      onMutate: async (itemId) => {
        await queryClient.cancelQueries({ queryKey: keys.all });
        const previousQueries = queryClient.getQueriesData({ queryKey: keys.all });

        queryClient.setQueriesData({ queryKey: keys.all }, (oldData) => {
          if (!Array.isArray(oldData)) return oldData;
          return oldData.map((item) => {
            if (item.id === itemId) {
              return { ...item, [bookmarkField]: !item[bookmarkField] };
            }
            return item;
          });
        });

        return { previousQueries };
      },

      onError: (err, itemId, context) => {
        if (context?.previousQueries) {
          context.previousQueries.forEach(([queryKey, data]) => {
            queryClient.setQueryData(queryKey, data);
          });
        }
      },

      onSuccess: (result, itemId) => {
        queryClient.setQueriesData({ queryKey: keys.all }, (oldData) => {
          if (!Array.isArray(oldData)) return oldData;
          return oldData.map((item) => {
            if (item.id === itemId) {
              return { ...item, [bookmarkField]: result[bookmarkField] };
            }
            return item;
          });
        });
      },
    });
  };
}

/**
 * Creates a delete mutation with optimistic removal.
 * @param {object} config - { keys, deleteFn }
 */
export function createDeleteHook({ keys, deleteFn }) {
  return function useDelete() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: deleteFn,

      onMutate: async (itemId) => {
        await queryClient.cancelQueries({ queryKey: keys.all });
        const previousQueries = queryClient.getQueriesData({ queryKey: keys.all });

        queryClient.setQueriesData({ queryKey: keys.all }, (oldData) => {
          if (!Array.isArray(oldData)) return oldData;
          return oldData.filter((item) => item.id !== itemId);
        });

        return { previousQueries };
      },

      onError: (err, itemId, context) => {
        if (context?.previousQueries) {
          context.previousQueries.forEach(([queryKey, data]) => {
            queryClient.setQueryData(queryKey, data);
          });
        }
      },
    });
  };
}

/**
 * Creates a prefetch function for feed items.
 * @param {object} config - { keys, fetchFn, staleTime }
 */
export function createPrefetchFn({ keys, fetchFn, staleTime }) {
  return function prefetch(queryClient, params = {}) {
    return queryClient.prefetchQuery({
      queryKey: keys.list(params),
      queryFn: () => fetchFn(params),
      staleTime,
    });
  };
}

// =============================================================================
// Infinite Query Cache Utilities
// =============================================================================

/**
 * Creates a reusable function for updating items in infinite query caches.
 * 
 * This is useful for optimistic updates when you need to update a specific item
 * across all cached infinite query pages (e.g., toggling like/bookmark status).
 * 
 * @param {string} entityKey - The base query key (e.g., 'notes', 'opportunities')
 * @param {string} itemsKey - The key where items array is stored in each page
 * @returns {function} A function that updates a specific item in all matching infinite queries
 * 
 * @example
 * const updateNotesCache = createInfiniteQueryCacheUpdater('notes', 'notes');
 * 
 * // In a mutation's onMutate:
 * updateNotesCache(queryClient, noteId, (note) => ({
 *   ...note,
 *   isLiked: !note.isLiked,
 *   likes: note.isLiked ? note.likes - 1 : note.likes + 1,
 * }));
 */
export function createInfiniteQueryCacheUpdater(entityKey, itemsKey) {
  return function updateInfiniteQueryCache(queryClient, itemId, updater) {
    queryClient.setQueriesData(
      {
        predicate: (query) => {
          const key = query.queryKey;
          const isInfiniteQuery = key[0] === entityKey && key[1] === 'infinite';
          // Only update queries that have valid data (not invalidated)
          return isInfiniteQuery && query.state.dataUpdatedAt > 0;
        }
      },
      (oldData) => {
        if (!oldData?.pages) return oldData;
        return {
          pages: oldData.pages.map((page) => ({
            ...page,
            [itemsKey]: (page[itemsKey] || []).map((item) =>
              item.id === itemId ? updater(item) : item
            ),
          })),
          pageParams: oldData.pageParams || [],
        };
      }
    );
  };
}

/**
 * Creates a reusable function for removing items from infinite query caches.
 * 
 * This is useful for optimistic deletes when you need to remove an item
 * from all cached infinite query pages.
 * 
 * @param {string} entityKey - The base query key (e.g., 'notes', 'opportunities')
 * @param {string} itemsKey - The key where items array is stored in each page
 * @returns {function} A function that removes a specific item from all matching infinite queries
 * 
 * @example
 * const removeFromNotesCache = createInfiniteQueryCacheRemover('notes', 'notes');
 * 
 * // In a delete mutation's onMutate:
 * removeFromNotesCache(queryClient, noteId);
 */
export function createInfiniteQueryCacheRemover(entityKey, itemsKey) {
  return function removeFromInfiniteQueryCache(queryClient, itemId) {
    queryClient.setQueriesData(
      {
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === entityKey && key[1] === 'infinite';
        }
      },
      (oldData) => {
        if (!oldData?.pages) return oldData;
        return {
          pages: oldData.pages.map((page) => ({
            ...page,
            [itemsKey]: (page[itemsKey] || []).filter((item) => item.id !== itemId),
          })),
          pageParams: oldData.pageParams || [],
        };
      }
    );
  };
}
