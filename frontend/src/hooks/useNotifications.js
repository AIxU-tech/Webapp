import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from '../api/notifications';
import { useSocketEvent } from '../contexts/SocketContext';
import { STALE_TIMES, GC_TIMES } from '../config/cache';
import { invalidateNoteCachesFromNotificationSocketPayload } from './useNotes';

// Query key factory
export const notificationKeys = {
  all: ['notifications'],
  list: (params = {}) => [...notificationKeys.all, 'list', params],
  unreadCount: () => [...notificationKeys.all, 'unreadCount'],
};

/**
 * Shared socket listener for notification_update events.
 * Invalidates notification list/count caches and note caches for the affected post.
 */
function useNotificationSocket() {
  const queryClient = useQueryClient();

  useSocketEvent('notification_update', useCallback((data) => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    invalidateNoteCachesFromNotificationSocketPayload(queryClient, data);
  }, [queryClient]));
}

/**
 * useNotifications
 *
 * Fetches the most recent 20 notifications (used by the dropdown).
 * Listens for real-time `notification_update` to keep fresh.
 */
export function useNotifications() {
  useNotificationSocket();

  return useQuery({
    queryKey: notificationKeys.list({ limit: 20 }),
    queryFn: () => getNotifications({ limit: 20 }),
    staleTime: STALE_TIMES.CONVERSATIONS,
    gcTime: GC_TIMES.CONVERSATIONS,
    select: (data) => data?.notifications ?? [],
  });
}

/**
 * useAllNotifications
 *
 * Fetches all notifications for the full /notifications page.
 * Uses a large limit to pull the full history in one request.
 */
export function useAllNotifications() {
  useNotificationSocket();

  return useQuery({
    queryKey: notificationKeys.list({ limit: 500 }),
    queryFn: () => getNotifications({ limit: 500 }),
    staleTime: STALE_TIMES.CONVERSATIONS,
    gcTime: GC_TIMES.CONVERSATIONS,
  });
}

/**
 * useUnreadNotificationCount
 *
 * Tracks the number of unread notifications. Designed to live in the NavBar
 * so the badge updates in real-time regardless of which page the user is on.
 *
 * Seeded from the server, then incremented via WebSocket events and
 * reset when the user marks all as read.
 */
export function useUnreadNotificationCount() {
  // Unread count is refreshed via the shared notification_update listener
  // registered by useNotificationSocket (invoked from useNotifications / useAllNotifications).

  const { data: count = 0 } = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const res = await getUnreadNotificationCount();
      return res.count;
    },
    staleTime: STALE_TIMES.CONVERSATIONS,
    gcTime: GC_TIMES.CONVERSATIONS,
  });

  return count;
}

/**
 * useMarkAllNotificationsRead
 *
 * Mutation that marks every unread notification as read.
 * Resets the unread count to 0 and refreshes the notification list.
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.setQueryData(notificationKeys.unreadCount(), 0);
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}
