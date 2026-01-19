/**
 * CloseButton Component
 *
 * A standardized close/dismiss button for modals, alerts, toasts, and other dismissible elements.
 * Provides consistent styling across the application with size and variant options.
 *
 * @component
 *
 * @example
 * // Modal close button (default)
 * <CloseButton onClick={handleClose} ariaLabel="Close modal" />
 *
 * @example
 * // Alert dismiss button (small, subtle)
 * <CloseButton size="sm" variant="subtle" onClick={onDismiss} ariaLabel="Dismiss" />
 *
 * @example
 * // Toast dismiss with custom class
 * <CloseButton size="sm" variant="subtle" onClick={onDismiss} className="ml-2" />
 */

import { XIcon } from '../../icons';

/**
 * Size configurations
 */
const SIZE_CONFIG = {
  sm: {
    button: 'p-1.5',
    icon: 'h-4 w-4',
  },
  md: {
    button: 'p-2',
    icon: 'h-5 w-5',
  },
};

/**
 * Variant style definitions
 */
const VARIANT_CLASSES = {
  // Default style for modal close buttons
  default: 'hover:bg-muted text-muted-foreground hover:text-red-500',
  // Subtle style for alerts, toasts, and inline elements
  subtle: 'hover:bg-muted text-muted-foreground hover:text-red-500',
};

export default function CloseButton({
  onClick,
  ariaLabel = 'Close',
  size = 'md',
  variant = 'default',
  className = '',
}) {
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.default;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md transition-colors cursor-pointer ${sizeConfig.button} ${variantClass} ${className}`}
      aria-label={ariaLabel}
    >
      <XIcon className={sizeConfig.icon} />
    </button>
  );
}
