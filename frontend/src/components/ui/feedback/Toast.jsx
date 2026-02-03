/**
 * Toast Component
 *
 * Simple toast notification component for displaying temporary messages.
 * Auto-dismisses after a specified duration.
 *
 * @component
 *
 * @param {string} message - The message to display
 * @param {boolean} isVisible - Whether the toast is visible
 * @param {function} onDismiss - Callback when toast is dismissed
 * @param {number} [duration=3000] - Auto-dismiss duration in ms (0 to disable)
 * @param {'success'|'error'} [variant='success'] - Visual style variant
 *
 * @example
 * // Success toast (default)
 * <Toast
 *   message="Link copied!"
 *   isVisible={showToast}
 *   onDismiss={() => setShowToast(false)}
 * />
 *
 * @example
 * // Error toast
 * <Toast
 *   message="Failed to save changes"
 *   isVisible={showError}
 *   onDismiss={() => setShowError(false)}
 *   variant="error"
 * />
 */

import { useEffect } from 'react';
import { CheckCircleIcon, AlertCircleIcon } from '../../icons';
import { CloseButton } from '../buttons';

const variants = {
  success: {
    icon: CheckCircleIcon,
    iconClass: 'text-green-600',
  },
  error: {
    icon: AlertCircleIcon,
    iconClass: 'text-red-600',
  },
};

export default function Toast({ message, isVisible, onDismiss, duration = 3000, variant = 'success' }) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onDismiss]);

  if (!isVisible) return null;

  const { icon: Icon, iconClass } = variants[variant] || variants.success;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-200"
      role="alert"
      aria-live="polite"
    >
      <Icon className={`h-5 w-5 ${iconClass} flex-shrink-0`} />
      <span className="text-sm font-medium text-foreground">{message}</span>
      <CloseButton
        onClick={onDismiss}
        size="sm"
        variant="subtle"
        ariaLabel="Dismiss"
        className="ml-2"
      />
    </div>
  );
}

