/**
 * IconButton Component
 *
 * Reusable icon button with consistent hover behavior across the app.
 * Provides background hover effect and supports active states with color variants.
 *
 * Features:
 * - Multiple size variants (sm, md, lg)
 * - Active state with color variants (red, primary, yellow)
 * - Filled icon state support
 * - Polymorphic rendering via `as` prop (button, Link, etc.)
 *
 * @component
 *
 * @example
 * // Basic usage
 * <IconButton icon={HeartIcon} onClick={handleClick} label="Like" />
 *
 * @example
 * // As a link
 * <IconButton icon={ExternalLinkIcon} as={Link} to="/page" label="Go to page" />
 */

const SIZE_CLASSES = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'px-3 py-2',
};

const ICON_SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const ACTIVE_CLASSES = {
  red: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
  primary: 'text-primary hover:bg-primary/10',
  yellow: 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20',
};

const VARIANT_CLASSES = {
  default: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  danger: 'text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
};

export default function IconButton({
  icon: Icon,
  onClick,
  active = false,
  activeColor = 'red',
  disabled = false,
  label,
  size = 'md',
  filled,
  variant = 'default',
  className = '',
  children,
  as: Component = 'button',
  type = 'button',
  ...props
}) {
  // Determine if icon should show filled state (defaults to active state)
  const showFilled = filled !== undefined ? filled : active;

  return (
    <Component
      onClick={onClick}
      disabled={Component === 'button' ? disabled : undefined}
      type={Component === 'button' ? type : undefined}
      className={`flex items-center gap-1 rounded-lg transition-all duration-200 ${
        SIZE_CLASSES[size]
      } ${
        active ? ACTIVE_CLASSES[activeColor] : VARIANT_CLASSES[variant]
      } ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      aria-label={label}
      {...props}
    >
      <Icon filled={showFilled} className={ICON_SIZE_CLASSES[size]} />
      {children}
    </Component>
  );
}
