import { api } from './client';

export async function getNotifications() {
  return api.get('/notifications');
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
