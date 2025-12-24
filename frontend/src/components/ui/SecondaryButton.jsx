/**
 * SecondaryButton Component
 *
 * Secondary action button with subtle styling.
 * Used for secondary actions, cancel buttons, and less prominent CTAs.
 *
 * Features:
 * - Consistent styling from design system
 * - Loading state with spinner
 * - Disabled state styling
 * - Support for icons (left or right)
 * - Multiple size and variant options
 * - Can render as Link using `as` prop
 *
 * @component
 *
 * @example
 * // Basic usage
 * <SecondaryButton>Cancel</SecondaryButton>
 *
 * @example
 * // Outline variant
 * <SecondaryButton variant="outline">Learn More</SecondaryButton>
 *
 * @example
 * // With icon
 * <SecondaryButton icon={<XIcon />}>Close</SecondaryButton>
 *
 * @example
 * // Danger variant
 * <SecondaryButton variant="danger">Delete</SecondaryButton>
 */

import { forwardRef } from 'react';
import { LoaderIcon } from '../icons';

/**
 * Size variant class definitions
 */
const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

/**
 * Variant style definitions
 */
const VARIANT_CLASSES = {
  // Default solid secondary button
  default: 'bg-muted text-foreground border border-border hover:bg-accent hover:text-accent-foreground',

  // Outline button with transparent background
  outline: 'bg-transparent text-foreground border border-border hover:bg-muted',

  // Ghost button with no border
  ghost: 'bg-transparent text-foreground hover:bg-muted',

  // Primary solid (non-gradient)
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',

  // Danger button for destructive actions
  danger: 'bg-red-600 text-white hover:bg-red-700',

  // Danger outline
  dangerOutline: 'bg-transparent text-red-600 border border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20',

  // Success button
  success: 'bg-green-600 text-white hover:bg-green-700',
};

const SecondaryButton = forwardRef(function SecondaryButton(
  {
    children,
    className = '',
    loading = false,
    loadingText,
    disabled = false,
    icon,
    iconPosition = 'left',
    size = 'md',
    variant = 'default',
    as: Component = 'button',
    type = 'button',
    ...props
  },
  ref
) {
  // Determine if button should be disabled
  const isDisabled = disabled || loading;

  // Build class string
  const baseClasses = `
    ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.default}
    font-medium
    rounded-lg
    transition-colors
    duration-200
    inline-flex
    items-center
    justify-center
    gap-2
    ${SIZE_CLASSES[size]}
    ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Content to render
  const content = (
    <>
      {/* Loading spinner or left icon */}
      {loading ? (
        <LoaderIcon className="h-4 w-4 animate-spin" />
      ) : (
        icon && iconPosition === 'left' && icon
      )}

      {/* Button text */}
      <span>{loading && loadingText ? loadingText : children}</span>

      {/* Right icon (only if not loading) */}
      {!loading && icon && iconPosition === 'right' && icon}
    </>
  );

  // Render as specified component (button, Link, etc.)
  return (
    <Component
      ref={ref}
      type={Component === 'button' ? type : undefined}
      disabled={Component === 'button' ? isDisabled : undefined}
      className={baseClasses}
      {...props}
    >
      {content}
    </Component>
  );
});

export default SecondaryButton;
