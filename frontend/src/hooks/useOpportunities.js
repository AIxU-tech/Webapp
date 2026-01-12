/**
 * Opportunities Hooks Module
 * React Query hooks for fetching and managing opportunities.
 */

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchOpportunities,
  createOpportunity,
  toggleBookmarkOpportunity,
  deleteOpportunity,
} from '../api/opportunities';
import { STALE_TIMES } from '../config/cache';
import {
  createFeedItemKeys,
  createListHook,
  createCreateHook,
  createBookmarkHook,
  createDeleteHook,
  createPrefetchFn,
} from './factories/feedItemHooks';

// Query Keys - extend factory keys with infinite key
const baseKeys = createFeedItemKeys('opportunities');
export const opportunityKeys = {
  ...baseKeys,
  infinite: (params = {}) => [...baseKeys.all, 'infinite', params],
};

// List hook (backward compatible)
export const useOpportunities = createListHook({
  keys: opportunityKeys,
  fetchFn: fetchOpportunities,
  staleTime: STALE_TIMES.OPPORTUNITIES,
});

/**
 * useInfiniteOpportunities Hook
 *
 * Fetches opportunities with infinite scroll pagination support.
 * Uses useInfiniteQuery to automatically handle page loading and caching.
 *
 * @param {object} params - Filter parameters (search, location, paid, myUniversity, tags, tag, university_id)
 * @returns {object} React Query infinite query result with:
 *   - data.pages: Array of page responses, each with { opportunities: [...], pagination: {...} }
 *   - fetchNextPage: Function to load next page
 *   - hasNextPage: Boolean indicating if more pages exist
 *   - isFetchingNextPage: Boolean indicating if next page is loading
 *
 * @example
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteOpportunities({ search: 'AI' });
 * const opportunities = data?.pages.flatMap(page => page.opportunities) || [];
 */
export function useInfiniteOpportunities(params = {}) {
  return useInfiniteQuery({
    queryKey: opportunityKeys.infinite(params),
    queryFn: ({ pageParam = 1 }) =>
      fetchOpportunities({ ...params, page: pageParam, page_size: 20 }),
    getNextPageParam: (lastPage) => {
      if (lastPage?.pagination?.hasMore) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: STALE_TIMES.OPPORTUNITIES,
  });
}

// Helper function to update infinite query cache
function updateInfiniteQueryCache(queryClient, opportunityId, updater) {
  // Update all infinite queries (matching the infinite key pattern)
  // Skip queries that are invalidated to prevent overwriting with stale data
  queryClient.setQueriesData(
    {
      predicate: (query) => {
        const key = query.queryKey;
        const isOpportunitiesInfinite = key[0] === 'opportunities' && key[1] === 'infinite';

        // Only update queries that are:
        // 1. Opportunities infinite queries
        // 2. Not invalidated (has valid data that should be updated)
        return isOpportunitiesInfinite && query.state.dataUpdatedAt > 0;
      }
    },
    (oldData) => {
      if (!oldData?.pages) return oldData;
      return {
        pages: oldData.pages.map((page) => {
          // All pages are paginated format: { opportunities: [...], pagination: {...} }
          const updatedOpportunities = (page.opportunities || []).map((opp) =>
            opp.id === opportunityId ? updater(opp) : opp
          );
          return { ...page, opportunities: updatedOpportunities };
        }),
        pageParams: oldData.pageParams || [],
      };
    }
  );
}

// Create mutation
export function useCreateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOpportunity,
    onSuccess: () => {
      // Invalidate all infinite opportunity queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: opportunityKeys.all });
    },
  });
}

// Bookmark mutation
export function useBookmarkOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleBookmarkOpportunity,

    onMutate: async (opportunityId) => {
      await queryClient.cancelQueries({ queryKey: opportunityKeys.all });
      const previousQueries = queryClient.getQueriesData({ queryKey: opportunityKeys.all });

      // Update infinite query cache
      updateInfiniteQueryCache(queryClient, opportunityId, (opp) => ({
        ...opp,
        isBookmarked: !opp.isBookmarked,
      }));

      return { previousQueries, opportunityId };
    },

    onError: (err, opportunityId, context) => {
      // Rollback infinite query caches
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSuccess: (result, opportunityId) => {
      // Update infinite query cache with server response
      updateInfiniteQueryCache(queryClient, opportunityId, (opp) => ({
        ...opp,
        isBookmarked: result.isBookmarked,
      }));

      // Remove bookmarked filter cache to force fresh fetch on next view
      queryClient.removeQueries({
        queryKey: opportunityKeys.infinite({ bookmarked: true }),
        exact: true,
      });
    },
  });
}

// Delete mutation
export function useDeleteOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOpportunity,

    onMutate: async (opportunityId) => {
      await queryClient.cancelQueries({ queryKey: opportunityKeys.all });
      const previousQueries = queryClient.getQueriesData({ queryKey: opportunityKeys.all });

      // Remove from infinite query cache
      queryClient.setQueriesData(
        {
          predicate: (query) => {
            const key = query.queryKey;
            return key[0] === 'opportunities' && key[1] === 'infinite';
          }
        },
        (oldData) => {
          if (!oldData?.pages) return oldData;
          return {
            pages: oldData.pages.map((page) => {
              // All pages are paginated format: { opportunities: [...], pagination: {...} }
              const filteredOpportunities = (page.opportunities || []).filter((opp) => opp.id !== opportunityId);
              return { ...page, opportunities: filteredOpportunities };
            }),
            pageParams: oldData.pageParams || [],
          };
        }
      );

      return { previousQueries, opportunityId };
    },

    onError: (err, opportunityId, context) => {
      // Rollback infinite query caches
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
  });
}

// Prefetch utility (backward compatible)
export const prefetchOpportunities = createPrefetchFn({
  keys: opportunityKeys,
  fetchFn: fetchOpportunities,
  staleTime: STALE_TIMES.OPPORTUNITIES,
});

/**
 * Prefetch infinite opportunities query (for hover prefetching)
 */
export function prefetchInfiniteOpportunities(queryClient, params = {}) {
  return queryClient.prefetchInfiniteQuery({
    queryKey: opportunityKeys.infinite(params),
    queryFn: () => fetchOpportunities({ ...params, page: 1, page_size: 20 }),
    initialPageParam: 1,
    staleTime: STALE_TIMES.OPPORTUNITIES,
  });
}
