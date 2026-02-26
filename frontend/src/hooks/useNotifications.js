import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from '../api/notifications';
import { useSocketEvent } from '../contexts/SocketContext';
import { STALE_TIMES, GC_TIMES } from '../config/cache';

// Query key factory
export const notificationKeys = {
  all: ['notifications'],
  list: () => [...notificationKeys.all, 'list'],
  unreadCount: () => [...notificationKeys.all, 'unreadCount'],
};

/**
 * useNotifications
 *
 * Fetches the last 20 notifications for the current user.
 * Listens for real-time `notification_update` events to keep the list fresh.
 */
export function useNotifications() {
  const queryClient = useQueryClient();

  useSocketEvent('notification_update', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
  }, [queryClient]));

  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: getNotifications,
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
  const queryClient = useQueryClient();

  useSocketEvent('notification_update', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
  }, [queryClient]));

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
