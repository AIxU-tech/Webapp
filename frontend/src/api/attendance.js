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
