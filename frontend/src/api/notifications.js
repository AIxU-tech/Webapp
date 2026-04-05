import { api } from './client';

/**
 * Fetch notifications for the current user.
 *
 * @param {object} [params]
 * @param {number} [params.limit=20] - Max notifications to return.
 * @param {number} [params.offset=0] - Rows to skip (for pagination).
 * @returns {Promise<{ notifications: object[], total: number }>}
 */
export async function getNotifications({ limit = 20, offset = 0 } = {}) {
  const qs = new URLSearchParams();
  if (limit !== 20) qs.set('limit', limit);
  if (offset) qs.set('offset', offset);
  const query = qs.toString();
  return api.get(`/notifications${query ? `?${query}` : ''}`);
}

export async function getUnreadNotificationCount() {
  return api.get('/notifications/count');
}

export async function markNotificationRead(notificationId) {
  return api.patch(`/notifications/${notificationId}/read`);
}

export async function markAllNotificationsRead() {
  return api.patch('/notifications/read-all');
}
