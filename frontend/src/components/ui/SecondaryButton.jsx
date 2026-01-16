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
import { SpinnerIcon } from '../icons';

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
 * Uses CSS variables for consistent theming (see styles.css)
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

  // Danger button for destructive actions (uses --destructive CSS variable)
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',

  // Danger outline (uses --destructive CSS variable)
  dangerOutline: 'bg-transparent text-destructive border border-destructive/30 hover:bg-destructive/10',

  // Success button (uses --success-green CSS variable)
  success: 'bg-success-green text-white hover:bg-success-green/90',
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
    rounded-full
    transition-colors
    duration-200
    inline-flex
    items-center
    justify-center
    gap-2
    ${SIZE_CLASSES[size]}
    ${isDisabled ? 'opacity-50' : 'cursor-pointer'}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Content to render
  const content = (
    <>
      {/* Loading spinner or left icon */}
      {loading ? (
        <SpinnerIcon className="h-4 w-4" />
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
