import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications, useUnreadNotificationCount, useMarkAllNotificationsRead, useClickOutside } from '../../hooks';
import { NotificationsIcon } from '../icons';
import { getTimeAgo } from '../../utils/time';

function buildNotificationText(notification) {
  const { verb, metadata } = notification;
  const actorName = metadata?.actor_name || 'Someone';
  const count = metadata?.count || 1;
  const others = count - 1;
  const othersText = others === 1 ? '1 other' : `${others} others`;

  if (verb === 'like') {
    const prefix = others > 0 ? `${actorName} and ${othersText}` : actorName;
    return `${prefix} liked your post`;
  }

  if (verb === 'comment') {
    const prefix = others > 0 ? `${actorName} and ${othersText}` : actorName;
    return `${prefix} commented on your post`;
  }

  return `${actorName} interacted with your post`;
}

function NotificationItem({ notification }) {
  const text = buildNotificationText(notification);
  const time = getTimeAgo(notification.updatedAt);
  const postTitle = notification.metadata?.post_title;
  const snippet = notification.verb === 'comment' ? notification.metadata?.snippet : null;

  return (

    /* Note for the future:
    
    If the destination of a note is not a note, then we need to handle that appropriately.
    */
    <Link
      to={`/notes/${notification.targetId}`}
      className={`
        block px-4 py-3 transition-colors duration-100
        hover:bg-gray-50
        ${notification.isRead ? 'bg-transparent' : 'bg-primary/5'}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          {notification.verb === 'like' ? (
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-500">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
            </span>
          ) : (
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 leading-snug">{text}</p>
          {postTitle && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{postTitle}</p>
          )}
          {snippet && (
            <p className="text-xs text-gray-400 mt-0.5 truncate italic">"{snippet}"</p>
          )}
          <p className="text-xs text-gray-400 mt-1">{time}</p>
        </div>

        {!notification.isRead && (
          <span className="mt-2 w-2 h-2 bg-primary rounded-full flex-shrink-0" />
        )}
      </div>
    </Link>
  );
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const unreadCount = useUnreadNotificationCount();
  const hasUnread = unreadCount > 0;
  const { data: notifications = [] } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  const close = useCallback(() => setIsOpen(false), []);
  useClickOutside(dropdownRef, close, isOpen);

  const handleToggle = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening && hasUnread) {
      markAllRead.mutate();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-md text-gray-700 hover:text-foreground hover:bg-gray-100 transition-all duration-150"
        aria-label="Notifications"
      >
        <NotificationsIcon />
        {hasUnread && (
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-white"
            aria-label="Unread notifications"
          />
        )}
      </button>

      {isOpen && (
        <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 bg-white rounded-xl shadow-lg ring-1 ring-black/5 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
