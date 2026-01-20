/**
 * UI Utility Hooks
 *
 * Reusable hooks for common UI behaviors like modal handling,
 * keyboard events, scroll management, and page titles.
 *
 * @module hooks/useUI
 *
 * @example
 * import { useEscapeKey, useScrollLock, usePageTitle } from '../hooks';
 *
 * function MyModal({ isOpen, onClose }) {
 *   useEscapeKey(isOpen, onClose);
 *   useScrollLock(isOpen);
 *   // ...
 * }
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// =============================================================================
// KEYBOARD HOOKS
// =============================================================================

/**
 * Handle ESC key press to trigger a callback
 *
 * Commonly used to close modals, dropdowns, or popovers.
 *
 * @param {boolean} isActive - Whether the handler should be active
 * @param {Function} callback - Function to call when ESC is pressed
 *
 * @example
 * useEscapeKey(isModalOpen, () => setIsModalOpen(false));
 */
export function useEscapeKey(isActive, callback) {
  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isActive, callback]);
}

// =============================================================================
// CLICK DETECTION HOOKS
// =============================================================================

/**
 * Detect clicks outside of a referenced element
 *
 * Commonly used to close dropdowns, popovers, or modals.
 *
 * @param {React.RefObject} ref - Ref to the element to detect outside clicks from
 * @param {Function} callback - Function to call when clicking outside
 * @param {boolean} [isActive=true] - Whether the handler should be active
 *
 * @example
 * const menuRef = useRef(null);
 * useClickOutside(menuRef, () => setIsMenuOpen(false), isMenuOpen);
 */
export function useClickOutside(ref, callback, isActive = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback, isActive]);
}

// =============================================================================
// SCROLL MANAGEMENT HOOKS
// =============================================================================

/**
 * Global scroll lock counter
 * Tracks how many components are requesting scroll lock.
 * Only unlocks when count reaches zero.
 */
let scrollLockCount = 0;
let originalBodyOverflow = '';

/**
 * Lock body scroll when a condition is true
 *
 * Uses ref-counting to handle nested modals correctly.
 * Only unlocks scrolling when ALL components have released the lock.
 *
 * @param {boolean} isLocked - Whether to lock scrolling
 *
 * @example
 * useScrollLock(isModalOpen);
 */
export function useScrollLock(isLocked) {
  useEffect(() => {
    if (isLocked) {
      // First lock - store original overflow
      if (scrollLockCount === 0) {
        originalBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      scrollLockCount++;

      return () => {
        scrollLockCount--;
        // Last unlock - restore original overflow
        if (scrollLockCount === 0) {
          document.body.style.overflow = originalBodyOverflow;
        }
      };
    }
  }, [isLocked]);
}

// =============================================================================
// PAGE TITLE HOOKS
// =============================================================================

/**
 * Set the document title with consistent formatting
 *
 * Automatically appends " - AIxU" to the title.
 * Cleans up when the component unmounts.
 *
 * @param {string} title - The page title (without the app name suffix)
 *
 * @example
 * usePageTitle('Community Notes');
 * // Sets document.title to "Community Notes - AIxU"
 */
export function usePageTitle(title) {
  useEffect(() => {
    const fullTitle = title ? `${title} - AIxU` : 'AIxU';
    document.title = fullTitle;
  }, [title]);
}

// =============================================================================
// DEBOUNCE HOOKS
// =============================================================================

/**
 * Debounce a value, updating it only after a delay
 *
 * Commonly used for search inputs to reduce API calls.
 *
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {*} The debounced value
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 300);
 *
 * // Use debouncedSearch for API calls
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     fetchResults(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// COUNTDOWN HOOKS
// =============================================================================

/**
 * Countdown timer hook
 *
 * Commonly used for verification code expiry, rate limiting, etc.
 *
 * @param {number} initialSeconds - Starting countdown value in seconds
 * @returns {Object} { timeLeft, isExpired, reset, formatTime }
 *
 * @example
 * const { timeLeft, isExpired, reset, formatTime } = useCountdown(300);
 * // <span>{formatTime(timeLeft)}</span> // "5:00"
 * // {isExpired && <button onClick={reset}>Resend</button>}
 */
export function useCountdown(initialSeconds) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const reset = useCallback(() => {
    setTimeLeft(initialSeconds);
  }, [initialSeconds]);

  const formatTime = useCallback((seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  return {
    timeLeft,
    isExpired: timeLeft <= 0,
    reset,
    formatTime,
  };
}

// =============================================================================
// DELAYED LOADING HOOK
// =============================================================================

/**
 * Returns true only after isLoading has been true for the specified delay.
 * Prevents flash of loading state on fast loads.
 */
export function useDelayedLoading(isLoading, delay = 200) {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowLoading(true), delay);
      return () => clearTimeout(timer);
    } else {
      setShowLoading(false);
    }
  }, [isLoading, delay]);

  return showLoading;
}

// =============================================================================
// INFINITE SCROLL HOOK
// =============================================================================

/**
 * Returns a ref for a sentinel element that triggers fetchNextPage when visible.
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '200px',
}) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin }
    );

    const currentRef = sentinelRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin]);

  return sentinelRef;
}

// =============================================================================
// COMBINED MODAL HOOK
// =============================================================================

/**
 * Combined modal management hook
 *
 * Provides all common modal behaviors in one hook:
 * - ESC key to close
 * - Scroll lock
 * - Click outside to close (if containerRef provided)
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Function to close the modal
 * @param {Object} [options] - Optional configuration
 * @param {boolean} [options.closeOnEscape=true] - Close on ESC key
 * @param {boolean} [options.closeOnClickOutside=true] - Close when clicking outside
 * @param {boolean} [options.lockScroll=true] - Lock body scroll
 * @returns {Object} { containerRef } - Ref to attach to modal container
 *
 * @example
 * function Modal({ isOpen, onClose }) {
 *   const { containerRef } = useModal(isOpen, onClose);
 *
 *   if (!isOpen) return null;
 *
 *   return (
 *     <div className="fixed inset-0 bg-black/50">
 *       <div ref={containerRef} className="modal-content">
 *         Modal content here
 *       </div>
 *     </div>
 *   );
 * }
 */
export function useModal(isOpen, onClose, options = {}) {
  const {
    closeOnEscape = true,
    closeOnClickOutside = true,
    lockScroll = true,
  } = options;

  const containerRef = useRef(null);

  // ESC key handling
  useEscapeKey(isOpen && closeOnEscape, onClose);

  // Scroll lock
  useScrollLock(isOpen && lockScroll);

  // Click outside handling
  useClickOutside(containerRef, onClose, isOpen && closeOnClickOutside);

  return { containerRef };
}

// =============================================================================
// UNSAVED CHANGES HOOKS
// =============================================================================

/**
 * Warns user when attempting to close/refresh browser with unsaved changes.
 * Shows the browser's native "Leave site?" confirmation dialog.
 *
 * @param {boolean} hasUnsavedChanges - Whether there are unsaved changes
 *
 * @example
 * const [isDirty, setIsDirty] = useState(false);
 * useBeforeUnload(isDirty);
 */
export function useBeforeUnload(hasUnsavedChanges) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      // Modern browsers ignore custom messages but still show a generic dialog
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
}
