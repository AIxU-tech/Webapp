/**
 * Opportunities Hooks Module
 * React Query hooks for fetching and managing opportunities.
 */

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

// Query Keys
export const opportunityKeys = createFeedItemKeys('opportunities');

// List hook
export const useOpportunities = createListHook({
  keys: opportunityKeys,
  fetchFn: fetchOpportunities,
  staleTime: STALE_TIMES.OPPORTUNITIES,
});

// Create mutation
export const useCreateOpportunity = createCreateHook({
  keys: opportunityKeys,
  createFn: createOpportunity,
});

// Bookmark mutation
export const useBookmarkOpportunity = createBookmarkHook({
  keys: opportunityKeys,
  toggleFn: toggleBookmarkOpportunity,
});

// Delete mutation
export const useDeleteOpportunity = createDeleteHook({
  keys: opportunityKeys,
  deleteFn: deleteOpportunity,
});

// Prefetch utility
export const prefetchOpportunities = createPrefetchFn({
  keys: opportunityKeys,
  fetchFn: fetchOpportunities,
  staleTime: STALE_TIMES.OPPORTUNITIES,
});
