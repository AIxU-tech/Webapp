/**
 * BaseModal Component
 *
 * A reusable modal wrapper that provides standard modal behaviors:
 * - ESC key to close
 * - Click outside to close (optional)
 * - Body scroll lock when open
 * - Accessible with proper ARIA attributes
 * - Configurable sizes and z-index
 *
 * @component
 *
 * @param {boolean} [isOpen=false] - Whether the modal is visible
 * @param {Function} onClose - Callback when modal should close
 * @param {string} [title] - Optional modal title (renders in header)
 * @param {React.ReactNode} children - Modal content
 * @param {string} [size='md'] - Modal width: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
 * @param {boolean} [showCloseButton=true] - Whether to show close button in header
 * @param {boolean} [closeOnBackdrop=true] - Whether clicking backdrop closes modal
 * @param {boolean} [closeOnEscape=true] - Whether ESC key closes modal
 * @param {string} [className=''] - Additional classes for modal container
 * @param {number} [zIndex=50] - Z-index for modal (use 60 for modals over other modals)
 *
 * @example
 * <BaseModal isOpen={isOpen} onClose={() => setIsOpen(false)} title="My Modal">
 *   <p>Modal content here</p>
 * </BaseModal>
 *
 * @example
 * // Modal with higher z-index (for stacking over other modals)
 * <BaseModal isOpen={isOpen} onClose={handleClose} zIndex={60}>
 *   <TermsContent />
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
  zIndex = 50,
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm"
      style={{ zIndex }}
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
