/**
 * Card Component
 *
 * Base card wrapper providing consistent styling.
 */

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  children,
  className = '',
  padding = 'md',
  hover = true,
  onClick,
  as: Component = 'div',
  ...props
}) {
  const paddingClass = PADDING[padding] || PADDING.md;
  const hoverClass = hover ? 'hover:shadow-hover' : '';
  const clickableClass = onClick ? 'cursor-pointer' : '';

  return (
    <Component
      className={`bg-card border border-border rounded-lg shadow-card transition-all duration-200 ${paddingClass} ${hoverClass} ${clickableClass} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </Component>
  );
}
