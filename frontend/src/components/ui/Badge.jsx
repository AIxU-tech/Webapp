/**
 * Badge Component
 *
 * A versatile badge component for displaying labels, statuses, tags, and categories.
 * Supports multiple variants, sizes, and optional icons.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <Badge>Default</Badge>
 *
 * @example
 * // With variant
 * <Badge variant="success">Approved</Badge>
 * <Badge variant="warning">Pending</Badge>
 * <Badge variant="error">Rejected</Badge>
 *
 * @example
 * // With icon
 * <Badge icon={<StarIcon />} variant="primary">Featured</Badge>
 *
 * @example
 * // Custom gradient
 * <Badge gradient="from-amber-400 to-yellow-500" textClass="text-amber-900">
 *   President
 * </Badge>
 */

/**
 * Predefined variant styles
 */
const VARIANTS = {
  default: 'bg-secondary text-secondary-foreground',
  primary: 'bg-primary text-primary-foreground',
  secondary: 'bg-muted text-muted-foreground',
  success: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  warning: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
  error: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  info: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  outline: 'bg-transparent border border-border text-foreground',
};

/**
 * Size configurations
 */
const SIZES = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  icon,
  gradient,
  textClass,
  className = '',
  ...props
}) {
  // Determine base classes
  const sizeClass = SIZES[size] || SIZES.sm;

  // Use gradient if provided, otherwise use variant
  const colorClass = gradient
    ? `bg-gradient-to-r ${gradient} ${textClass || 'text-white'}`
    : VARIANTS[variant] || VARIANTS.default;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClass} ${colorClass} ${className}`}
      {...props}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
}
