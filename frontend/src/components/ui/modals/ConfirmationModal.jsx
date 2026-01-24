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

import { XIcon, AlertCircleIcon, InfoIcon, AlertTriangleIcon } from '../../icons';
import BaseModal from './BaseModal';

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
   * Handle confirm button click
   */
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  // Get variant-specific styles
  const variantStyles = getVariantStyles(variant);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
    >
      <div
        className="p-6"
        role="alertdialog"
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-description"
      >
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
            className="p-2 hover:bg-accent rounded-md transition-colors -mt-1 -mr-1 cursor-pointer"
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
              className="px-4 py-2 border border-border bg-background rounded-lg hover:bg-accent transition-colors font-medium cursor-pointer"
            >
              {cancelText}
            </button>

            {/* Confirm Button */}
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-4 py-2 rounded-lg transition-colors font-medium cursor-pointer ${variantStyles.confirmButton}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
