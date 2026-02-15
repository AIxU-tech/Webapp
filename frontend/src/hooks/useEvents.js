/**
 * Events Hooks Module
 *
 * React Query hooks for fetching and managing university events.
 * Provides hooks for listing events, creating, deleting, and RSVP functionality.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchUniversityEvents,
  createEvent,
  updateEvent,
  getEvent,
  deleteEvent,
  toggleRsvp,
} from '../api/events';
import { STALE_TIMES, GC_TIMES } from '../config/cache';

// =============================================================================
// Query Keys
// =============================================================================
// Centralized query keys ensure consistent cache invalidation.

export const eventKeys = {
  // Base key for all event queries
  all: ['events'],

  // Key for events of a specific university
  university: (universityId) => [...eventKeys.all, 'university', universityId],

  // Key for a single event's details
  detail: (eventId) => [...eventKeys.all, 'detail', eventId],
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * useUniversityEvents Hook
 *
 * Fetches and caches events for a specific university.
 *
 * @param {number} universityId - University ID
 * @param {object} options - Query options (limit, upcoming)
 * @returns {object} React Query result with events array
 *
 * @example
 * const { data: events, isLoading } = useUniversityEvents(5);
 * const { data: upcomingEvents } = useUniversityEvents(5, { limit: 3 });
 */
export function useUniversityEvents(universityId, options = {}) {
  return useQuery({
    queryKey: [...eventKeys.university(universityId), options],
    queryFn: () => fetchUniversityEvents(universityId, options),
    enabled: !!universityId,
    staleTime: STALE_TIMES.EVENTS,
    gcTime: GC_TIMES.EVENTS,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

/**
 * useEvent Hook
 *
 * Fetches a single event with attendee details.
 *
 * @param {number} eventId - Event ID
 * @returns {object} React Query result with event object
 */
export function useEvent(eventId) {
  return useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => getEvent(eventId),
    enabled: !!eventId,
    staleTime: STALE_TIMES.EVENTS,
    gcTime: GC_TIMES.EVENTS,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * useCreateEvent Hook
 *
 * Mutation hook for creating a new event.
 * Invalidates the university's events cache on success.
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * const createMutation = useCreateEvent();
 * createMutation.mutate(
 *   { universityId: 5, eventData: { title: 'Workshop', startTime: '...' } },
 *   { onSuccess: () => closeModal() }
 * );
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ universityId, eventData }) => createEvent(universityId, eventData),
    onSuccess: (_, { universityId }) => {
      // Invalidate all events for this university (all option variations)
      queryClient.invalidateQueries({
        queryKey: eventKeys.university(universityId),
      });
    },
  });
}

/**
 * useUpdateEvent Hook
 *
 * Mutation hook for updating an existing event.
 * Invalidates all event caches on success for immediate UI sync.
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * const updateMutation = useUpdateEvent();
 * updateMutation.mutate(
 *   { eventId: 123, eventData: { title: 'Updated', startTime: '...' } },
 *   { onSuccess: () => closeModal() }
 * );
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, eventData }) => updateEvent(eventId, eventData),
    onSuccess: () => {
      // Invalidate all event queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

/**
 * useDeleteEvent Hook
 *
 * Mutation hook for deleting an event.
 * Invalidates all event caches on success.
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * const deleteMutation = useDeleteEvent();
 * deleteMutation.mutate(eventId);
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      // Invalidate all event queries since we don't know which university
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

/**
 * useToggleRsvp Hook
 *
 * Mutation hook for toggling RSVP status on an event.
 * Optimistically updates the UI and invalidates caches on success.
 *
 * @returns {object} React Query mutation result
 *
 * @example
 * const rsvpMutation = useToggleRsvp();
 * rsvpMutation.mutate({ eventId: 123 });
 * rsvpMutation.mutate({ eventId: 123, status: 'maybe' });
 */
export function useToggleRsvp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, status }) => toggleRsvp(eventId, status),

    // Optimistic update for immediate UI feedback
    onMutate: async ({ eventId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: eventKeys.all });

      // Snapshot previous data for rollback
      const previousQueries = queryClient.getQueriesData({ queryKey: eventKeys.all });

      // Optimistically toggle isAttending and adjust count
      queryClient.setQueriesData({ queryKey: eventKeys.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((event) => {
          if (event.id === eventId) {
            const newIsAttending = !event.isAttending;
            return {
              ...event,
              isAttending: newIsAttending,
              attendeeCount: newIsAttending
                ? (event.attendeeCount || 0) + 1
                : Math.max(0, (event.attendeeCount || 0) - 1),
            };
          }
          return event;
        });
      });

      return { previousQueries };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // Sync with server response
    onSuccess: (result, { eventId }) => {
      queryClient.setQueriesData({ queryKey: eventKeys.all }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((event) => {
          if (event.id === eventId) {
            return {
              ...event,
              isAttending: result.isAttending,
              attendeeCount: result.attendeeCount,
            };
          }
          return event;
        });
      });
    },
  });
}
