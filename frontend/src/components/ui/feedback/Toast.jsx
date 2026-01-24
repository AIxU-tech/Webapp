/**
 * Toast Component
 *
 * Simple toast notification component for displaying temporary messages.
 * Auto-dismisses after a specified duration.
 *
 * @component
 *
 * @example
 * <Toast
 *   message="Link copied!"
 *   isVisible={showToast}
 *   onDismiss={() => setShowToast(false)}
 * />
 */

import { useEffect } from 'react';
import { CheckCircleIcon } from '../../icons';
import { CloseButton } from '../buttons';

export default function Toast({ message, isVisible, onDismiss, duration = 3000 }) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-200"
      role="alert"
      aria-live="polite"
    >
      <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
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

