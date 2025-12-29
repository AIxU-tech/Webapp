/**
 * IconButton Component
 *
 * Reusable icon button with consistent hover behavior across the app.
 * Provides background hover effect and supports active states with color variants.
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
}) {
  // Determine if icon should show filled state (defaults to active state)
  const showFilled = filled !== undefined ? filled : active;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 rounded-lg transition-all duration-200 ${
        SIZE_CLASSES[size]
      } ${
        active ? ACTIVE_CLASSES[activeColor] : VARIANT_CLASSES[variant]
      } ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      aria-label={label}
    >
      <Icon filled={showFilled} className={ICON_SIZE_CLASSES[size]} />
      {children}
    </button>
  );
}
