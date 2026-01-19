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

import { InfoIcon, AlertCircleIcon, AlertTriangleIcon, CheckCircleIcon } from '../../icons';
import { CloseButton } from '../buttons';

/**
 * Variant configurations
 */
const VARIANTS = {
  info: {
    icon: InfoIcon,
    containerClass: 'bg-blue-500/5 border-blue-500/20',
    iconClass: 'text-blue-600',
    titleClass: 'text-blue-800',
    textClass: 'text-blue-700',
  },
  success: {
    icon: CheckCircleIcon,
    containerClass: 'bg-green-500/5 border-green-500/20',
    iconClass: 'text-green-600',
    titleClass: 'text-green-800',
    textClass: 'text-green-700',
  },
  warning: {
    icon: AlertTriangleIcon,
    containerClass: 'bg-amber-500/5 border-amber-500/20',
    iconClass: 'text-amber-600',
    titleClass: 'text-amber-800',
    textClass: 'text-amber-700',
  },
  error: {
    icon: AlertCircleIcon,
    containerClass: 'bg-red-500/5 border-red-500/20',
    iconClass: 'text-red-600',
    titleClass: 'text-red-800',
    textClass: 'text-red-700',
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
      className={`border rounded-lg px-4 py-3 ${config.containerClass} ${className}`}
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
            <CloseButton
              onClick={onDismiss}
              size="sm"
              variant="subtle"
              ariaLabel="Dismiss"
              className={config.iconClass}
            />
          </div>
        )}
      </div>
    </div>
  );
}
