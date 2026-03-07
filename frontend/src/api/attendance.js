/**
 * Attendance API Client
 *
 * API functions for event attendance tracking via QR code check-in.
 */

import { api } from './client';

export async function getEventByAttendanceToken(token) {
  return api.get(`/attendance/${token}`);
}

export async function submitAttendance(token, data) {
  return api.post(`/attendance/${token}`, data);
}

export async function getEventAttendance(eventId) {
  return api.get(`/events/${eventId}/attendance`);
}

/**
 * Get the attendance token for an event (for QR code display).
 * Requires executive+ at the event's university or site admin.
 * Generates token if it doesn't exist yet.
 *
 * @param {number} eventId - Event ID
 * @returns {Promise<{ token: string }>}
 */
export async function getEventAttendanceToken(eventId) {
  return api.get(`/events/${eventId}/attendance-token`);
}
