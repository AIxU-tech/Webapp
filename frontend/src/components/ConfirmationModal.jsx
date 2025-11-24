/**
 * ConfirmationModal Component
 *
 * A reusable modal dialog for confirmation actions (logout, delete, etc.).
 * Provides a consistent user experience across the application.
 *
 * Features:
 * - Customizable title, message, and button text
 * - Visual variants (info, warning, danger)
 * - Accessible with proper ARIA labels
 * - Click outside or ESC key to close
 * - Backdrop blur for better focus
 *
 * @component
 *
 * @example
 * // Logout confirmation
 * <ConfirmationModal
 *   isOpen={showLogoutModal}
 *   onClose={() => setShowLogoutModal(false)}
 *   onConfirm={handleLogout}
 *   title="Log Out"
 *   message="Are you sure you want to log out?"
 *   confirmText="Log Out"
 *   variant="warning"
 * />
 *
 * @example
 * // Delete confirmation
 * <ConfirmationModal
 *   isOpen={showDeleteModal}
 *   onClose={() => setShowDeleteModal(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Item"
 *   message="This action cannot be undone. Are you sure you want to delete this item?"
 *   confirmText="Delete"
 *   variant="danger"
 * />
 */

import { useEffect } from 'react';

/**
 * SVG Icon Components
 */

const XIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const InfoIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

/**
 * Get variant-specific styling
 *
 * @param {string} variant - Modal variant (info, warning, danger)
 * @returns {object} Styling configuration for the variant
 */
function getVariantStyles(variant) {
  const styles = {
    info: {
      icon: <InfoIcon />,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    warning: {
      icon: <AlertCircleIcon />,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    danger: {
      icon: <AlertTriangleIcon />,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
    },
  };

  return styles[variant] || styles.info;
}

export default function ConfirmationModal({
  isOpen = false,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info', // 'info', 'warning', 'danger'
  showIcon = true,
}) {
  /**
   * Handle ESC key press to close modal
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  /**
   * Prevent body scroll when modal is open
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /**
   * Handle backdrop click (click outside modal)
   */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * Handle confirm button click
   */
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  // Don't render if not open
  if (!isOpen) return null;

  // Get variant-specific styles
  const variantStyles = getVariantStyles(variant);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-description"
    >
      {/* Modal Container */}
      <div className="bg-card border border-border rounded-xl shadow-card w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            {/* Variant Icon */}
            {showIcon && (
              <div className={`flex-shrink-0 w-10 h-10 rounded-full ${variantStyles.iconBg} flex items-center justify-center`}>
                <div className={variantStyles.iconColor}>
                  {variantStyles.icon}
                </div>
              </div>
            )}

            {/* Title */}
            <h3
              id="confirmation-modal-title"
              className="text-lg font-semibold text-foreground pt-1"
            >
              {title}
            </h3>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-md transition-colors -mt-1 -mr-1"
            aria-label="Close modal"
          >
            <XIcon />
          </button>
        </div>

        {/* Message */}
        <div className={showIcon ? 'ml-13' : ''}>
          <p
            id="confirmation-modal-description"
            className="text-sm text-muted-foreground mb-6"
          >
            {message}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border bg-background rounded-lg hover:bg-accent transition-colors font-medium"
            >
              {cancelText}
            </button>

            {/* Confirm Button */}
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${variantStyles.confirmButton}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
