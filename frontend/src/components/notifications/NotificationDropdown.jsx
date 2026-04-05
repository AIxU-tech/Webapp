import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications, useUnreadNotificationCount, useMarkAllNotificationsRead, useClickOutside } from '../../hooks';
import { NotificationsIcon } from '../icons';
import NotificationItem from './NotificationItem';

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
        className="relative p-2 rounded-md text-gray-700 hover:text-foreground hover:bg-gray-100 transition-all duration-150 cursor-pointer"
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
                <NotificationItem key={n.id} notification={n} onClick={close} />
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <Link
              to="/notifications"
              onClick={close}
              className="block px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-gray-50 border-t border-gray-100 transition-colors"
            >
              View all notifications
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
