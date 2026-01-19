/**
 * BaseModal Component
 *
 * A reusable modal wrapper that provides standard modal behaviors:
 * - ESC key to close
 * - Click outside to close (optional)
 * - Body scroll lock when open
 * - Accessible with proper ARIA attributes
 * - Configurable sizes
 *
 * @component
 *
 * @example
 * <BaseModal isOpen={isOpen} onClose={() => setIsOpen(false)} title="My Modal">
 *   <p>Modal content here</p>
 * </BaseModal>
 *
 * @example
 * // Large modal without close button
 * <BaseModal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Settings"
 *   size="lg"
 *   showCloseButton={false}
 * >
 *   <SettingsForm />
 * </BaseModal>
 */

import { useModal } from '../../../hooks';
import { CloseButton } from '../buttons';

/**
 * Size configurations for modal widths
 */
const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full mx-8',
};

export default function BaseModal({
  isOpen = false,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = '',
}) {
  // Use the combined modal hook for ESC, scroll lock, and click outside
  const { containerRef } = useModal(isOpen, onClose, {
    closeOnEscape,
    closeOnClickOutside: closeOnBackdrop,
    lockScroll: true,
  });

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={containerRef}
        className={`bg-card border border-border rounded-xl shadow-card w-full ${sizeClass} mx-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 ${className}`}
      >
        {/* Header - only render if title or close button */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-border">
            {title && (
              <h2
                id="modal-title"
                className="text-xl font-semibold text-foreground"
              >
                {title}
              </h2>
            )}
            {!title && <div />}
            {showCloseButton && (
              <CloseButton
                onClick={onClose}
                ariaLabel="Close modal"
                className="-mr-2"
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
