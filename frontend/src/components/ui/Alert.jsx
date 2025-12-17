/**
 * Alert Component
 *
 * Displays contextual feedback messages with different variants.
 * Used for notifications, warnings, errors, and success messages.
 *
 * @component
 *
 * @example
 * <Alert variant="info" title="Note">
 *   Your changes have been saved.
 * </Alert>
 *
 * @example
 * <Alert variant="warning" dismissible onDismiss={() => setShow(false)}>
 *   Your session will expire in 5 minutes.
 * </Alert>
 *
 * @example
 * <Alert variant="error" title="Error">
 *   Failed to save changes. Please try again.
 * </Alert>
 */

import { XIcon, InfoIcon, AlertCircleIcon, AlertTriangleIcon, CheckCircleIcon } from '../icons';

/**
 * Variant configurations
 */
const VARIANTS = {
  info: {
    icon: InfoIcon,
    containerClass: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    iconClass: 'text-blue-600 dark:text-blue-400',
    titleClass: 'text-blue-800 dark:text-blue-200',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
  success: {
    icon: CheckCircleIcon,
    containerClass: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    iconClass: 'text-green-600 dark:text-green-400',
    titleClass: 'text-green-800 dark:text-green-200',
    textClass: 'text-green-700 dark:text-green-300',
  },
  warning: {
    icon: AlertTriangleIcon,
    containerClass: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    iconClass: 'text-yellow-600 dark:text-yellow-400',
    titleClass: 'text-yellow-800 dark:text-yellow-200',
    textClass: 'text-yellow-700 dark:text-yellow-300',
  },
  error: {
    icon: AlertCircleIcon,
    containerClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    iconClass: 'text-red-600 dark:text-red-400',
    titleClass: 'text-red-800 dark:text-red-200',
    textClass: 'text-red-700 dark:text-red-300',
  },
};

export default function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  className = '',
}) {
  const config = VARIANTS[variant] || VARIANTS.info;
  const IconComponent = config.icon;

  return (
    <div
      className={`border rounded-lg p-4 ${config.containerClass} ${className}`}
      role="alert"
    >
      <div className="flex">
        {/* Icon */}
        <div className="flex-shrink-0">
          <IconComponent className={`h-5 w-5 ${config.iconClass}`} />
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${config.titleClass}`}>
              {title}
            </h3>
          )}
          {children && (
            <div className={`text-sm ${title ? 'mt-1' : ''} ${config.textClass}`}>
              {children}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              onClick={onDismiss}
              className={`inline-flex rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${config.iconClass}`}
              aria-label="Dismiss"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
