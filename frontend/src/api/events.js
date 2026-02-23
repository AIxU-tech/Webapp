/**
 * Events API Module
 *
 * Handles all event-related API calls for university club events.
 * Events are associated with universities and support RSVP functionality.
 */

import { api } from './client';

/**
 * Get events for a university
 *
 * @param {number} universityId - University ID
 * @param {object} params - Query parameters
 * @param {boolean} [params.upcoming=true] - If true, only return future events
 * @param {number} [params.limit=20] - Max number of events to return
 * @returns {Promise<Array>} Array of event objects
 *
 * @example
 * const events = await fetchUniversityEvents(5);
 * const limitedEvents = await fetchUniversityEvents(5, { limit: 3 });
 */
export async function fetchUniversityEvents(universityId, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = queryString
    ? `/universities/${universityId}/events?${queryString}`
    : `/universities/${universityId}/events`;
  const data = await api.get(endpoint);
  return data.events || [];
}

/**
 * Create a new event for a university
 *
 * Requires authentication. Must be executive+ at the university or site admin.
 *
 * @param {number} universityId - University ID
 * @param {object} eventData - Event data
 * @param {string} eventData.title - Event title (required)
 * @param {string} [eventData.description] - Event description
 * @param {string} [eventData.location] - Event location
 * @param {string} eventData.startTime - Event start time in ISO format (required)
 * @param {string} [eventData.endTime] - Event end time in ISO format
 * @returns {Promise<object>} Created event object
 * @throws {ApiError} If not authorized or validation fails
 *
 * @example
 * const event = await createEvent(5, {
 *   title: 'AI Workshop',
 *   description: 'Learn about neural networks',
 *   location: 'Room 101',
 *   startTime: '2025-01-15T15:00:00Z',
 *   endTime: '2025-01-15T17:00:00Z',
 * });
 */
export async function createEvent(universityId, eventData) {
  return api.post(`/universities/${universityId}/events`, eventData);
}

/**
 * Get a single event with attendee details
 *
 * @param {number} eventId - Event ID
 * @returns {Promise<object>} Event object with attendees array
 *
 * @example
 * const event = await getEvent(123);
 * console.log(event.attendees); // Array of attendee info
 */
export async function getEvent(eventId) {
  return api.get(`/events/${eventId}`);
}

/**
 * Update an existing event
 *
 * Requires authentication. Must be executive+ at the event's university or site admin.
 *
 * @param {number} eventId - Event ID
 * @param {object} eventData - Updated event data
 * @param {string} eventData.title - Event title (required)
 * @param {string} [eventData.description] - Event description
 * @param {string} [eventData.location] - Event location
 * @param {string} eventData.startTime - Event start time in ISO format (required)
 * @param {string} [eventData.endTime] - Event end time in ISO format
 * @returns {Promise<object>} Updated event object
 * @throws {ApiError} If not authorized or validation fails
 *
 * @example
 * const updated = await updateEvent(123, {
 *   title: 'Updated Workshop',
 *   description: 'New description',
 *   startTime: '2025-01-15T15:00:00Z',
 * });
 */
export async function updateEvent(eventId, eventData) {
  return api.put(`/events/${eventId}`, eventData);
}

/**
 * Delete an event
 *
 * Requires authentication. Must be executive+ at the event's university or site admin.
 *
 * @param {number} eventId - Event ID
 * @returns {Promise<object>} Response with success status
 * @throws {ApiError} If not authorized (403) or not found (404)
 *
 * @example
 * await deleteEvent(123);
 */
export async function deleteEvent(eventId) {
  return api.delete(`/events/${eventId}`);
}

/**
 * Toggle RSVP status for an event
 *
 * Requires authentication. Any authenticated user can RSVP.
 * If no status provided, toggles between attending and not attending.
 *
 * @param {number} eventId - Event ID
 * @param {string} [status] - RSVP status: 'attending', 'maybe', or 'declined'
 * @returns {Promise<object>} Response with updated attendance status and count
 *
 * @example
 * // Toggle attendance
 * const result = await toggleRsvp(123);
 * console.log(result.isAttending, result.attendeeCount);
 *
 * // Set specific status
 * const result = await toggleRsvp(123, 'maybe');
 */
export async function toggleRsvp(eventId, status = null) {
  const body = status ? { status } : {};
  return api.post(`/events/${eventId}/rsvp`, body);
}
