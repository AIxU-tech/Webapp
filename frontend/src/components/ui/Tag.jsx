/**
 * Tag Component
 *
 * A unified component for displaying tags across the application.
 * Wraps Badge with tag-specific defaults and includes helpers for
 * consistent tag variant selection.
 *
 * @example
 * // Basic usage
 * <Tag>Machine Learning</Tag>
 *
 * @example
 * // With automatic variant based on tag content
 * <Tag variant={getTagVariant('Remote')}>Remote</Tag>
 *
 * @example
 * // As a toggleable filter
 * <Tag interactive selected={isActive} onClick={handleClick}>Filter</Tag>
 */

import Badge from './Badge';

/**
 * Common tag categories for automatic variant selection.
 * Extend as needed for new tag types.
 */
const TAG_VARIANTS = {
  // Location tags -> info (blue)
  Remote: 'info',
  Hybrid: 'info',
  'On-site': 'info',

  // Compensation tags
  Paid: 'success',
  Unpaid: 'secondary',

  // Status tags
  Active: 'success',
  Pending: 'warning',
  Closed: 'secondary',
};

/**
 * Get the appropriate variant for a tag based on its content.
 * Falls back to 'default' for unknown tags.
 */
export function getTagVariant(tag) {
  return TAG_VARIANTS[tag] || 'default';
}

/**
 * Tag display component.
 * For static display of tags/categories/labels.
 */
export default function Tag({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  ...props
}) {
  return (
    <Badge
      variant={variant}
      size={size}
      className={className}
      {...props}
    >
      {children}
    </Badge>
  );
}

/**
 * Interactive tag for filter UIs.
 * Toggleable button with selected/unselected states.
 */
export function ToggleTag({
  children,
  selected = false,
  onClick,
  variant = 'primary', // Color when selected
  size = 'md',
  className = '',
  disabled = false,
  ...props
}) {
  // Base styles for all toggle tags
  const baseStyles = 'transition-colors cursor-pointer';

  // Selected vs unselected styles
  const stateStyles = selected
    ? getSelectedStyles(variant)
    : 'bg-muted text-muted-foreground hover:bg-muted/80';

  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

  // Size mapping to padding (matches Badge sizes but as buttons)
  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`inline-flex items-center font-medium rounded-full ${sizeStyles[size]} ${baseStyles} ${stateStyles} ${disabledStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Get styles for selected state based on variant.
 * Matches the semantic colors used in Badge variants.
 */
function getSelectedStyles(variant) {
  const styles = {
    primary: 'bg-primary text-primary-foreground',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
    secondary: 'bg-gray-500 text-white',
  };
  return styles[variant] || styles.primary;
}

/**
 * Container for a group of tags.
 * Provides consistent spacing and wrapping.
 */
export function TagGroup({ children, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {children}
    </div>
  );
}
