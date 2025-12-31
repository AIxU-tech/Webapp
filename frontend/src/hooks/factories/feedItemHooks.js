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
