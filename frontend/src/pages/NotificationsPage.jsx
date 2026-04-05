import { useAllNotifications, useMarkAllNotificationsRead, usePageTitle } from '../hooks';
import { NotificationsIcon } from '../components/icons';
import { EmptyState, LoadingState, ErrorState } from '../components/ui';
import NotificationItem from '../components/notifications/NotificationItem';

export default function NotificationsPage() {
  usePageTitle('Notifications');

  const { data, isLoading, error } = useAllNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const hasUnread = notifications.some((n) => !n.isRead);

  if (isLoading) {
    return <LoadingState fullPage text="Loading notifications..." />;
  }

  if (error) {
    return (
      <ErrorState
        fullPage
        message="Failed to load notifications"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        {hasUnread && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer disabled:opacity-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<NotificationsIcon className="h-12 w-12" />}
          title="No notifications yet"
          description="When someone likes or comments on your posts, you'll see it here."
        />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </div>
      )}
    </div>
  );
}
