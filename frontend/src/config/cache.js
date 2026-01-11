/**
 * Cache Configuration
 *
 * Single source of truth for all React Query cache timing values.
 * Import these constants in hooks and services to ensure consistency.
 *
 * Terminology:
 * - staleTime: How long data is considered "fresh" (no background refetch)
 * - gcTime: How long unused data stays in cache before garbage collection
 *
 * Guidelines for Setting Values:
 * - Data that rarely changes (universities) → longer staleTime
 * - Data with real-time updates (messages) → staleTime is just a fallback
 * - Frequently changing data (notes) → shorter staleTime
 *
 * Usage:
 *   import { STALE_TIMES, GC_TIMES } from '../config/cache';
 *
 *   useQuery({
 *     queryKey: ['universities'],
 *     queryFn: fetchUniversities,
 *     staleTime: STALE_TIMES.UNIVERSITIES,
 *     gcTime: GC_TIMES.UNIVERSITIES,
 *   });
 */

// =============================================================================
// Stale Times
// =============================================================================
// How long until data is considered stale and triggers a background refetch

export const STALE_TIMES = {
  // Universities rarely change - aggressive caching
  UNIVERSITIES: 10 * 60 * 1000, // 10 minutes

  // Notes change moderately - balance freshness and performance
  NOTES: 2 * 60 * 1000, // 2 minutes

  // Opportunities change less frequently than notes
  OPPORTUNITIES: 3 * 60 * 1000, // 3 minutes

  // Events change infrequently - can cache aggressively
  EVENTS: 5 * 60 * 1000, // 5 minutes

  // Conversations - WebSocket handles real-time, this is a safety net
  CONVERSATIONS: 2 * 60 * 1000, // 2 minutes

  // Individual conversation messages - slightly shorter for active chats
  CONVERSATION: 10 * 1000, // 10 seconds

  // User profiles rarely change
  USERS: 5 * 60 * 1000, // 5 minutes

  // User search results - cache briefly
  USER_SEARCH: 1 * 60 * 1000, // 1 minute

  // AI news content updates infrequently (admin-triggered refresh)
  NEWS: 5 * 60 * 1000, // 5 minutes
};

// =============================================================================
// Garbage Collection Times
// =============================================================================
// How long unused data stays in cache after last subscriber unmounts

export const GC_TIMES = {
  // Universities - keep longer since they're used on multiple pages
  UNIVERSITIES: 60 * 60 * 1000, // 1 hour

  // Notes - moderate retention
  NOTES: 30 * 60 * 1000, // 30 minutes (uses default)

  // Opportunities - moderate retention
  OPPORTUNITIES: 30 * 60 * 1000, // 30 minutes

  // Conversations - keep for quick access when switching chats
  CONVERSATIONS: 10 * 60 * 1000, // 10 minutes

  // Individual conversations - shorter retention
  CONVERSATION: 5 * 60 * 1000, // 5 minutes

  // User profiles - moderate retention
  USERS: 30 * 60 * 1000, // 30 minutes (uses default)
};

// =============================================================================
// Default Values (for QueryProvider)
// =============================================================================
// These are the global defaults used when hooks don't specify their own values

export const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_GC_TIME = 30 * 60 * 1000; // 30 minutes
