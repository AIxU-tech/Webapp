/**
 * GradientButton Component
 *
 * Primary call-to-action button with gradient background and hover effects.
 * Used for main actions throughout the application (Sign up, Submit, etc.).
 *
 * Features:
 * - Consistent gradient styling from design system
 * - Loading state with spinner
 * - Disabled state styling
 * - Support for icons (left or right)
 * - Multiple size variants
 * - Can render as Link using `as` prop
 *
 * @component
 *
 * @example
 * // Basic usage
 * <GradientButton>Get Started</GradientButton>
 *
 * @example
 * // With loading state
 * <GradientButton loading loadingText="Submitting...">Submit</GradientButton>
 *
 * @example
 * // With icon
 * <GradientButton icon={<PlusIcon />}>Create New</GradientButton>
 *
 * @example
 * // As a Link
 * <GradientButton as={Link} to="/register">Join Now</GradientButton>
 */

import { forwardRef } from 'react';
import { GRADIENT_PRIMARY, SHADOW_PRIMARY_HOVER } from '../../../config/styles';
import { SpinnerIcon } from '../../icons';

/**
 * Size variant class definitions
 */
const SIZE_CLASSES = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

const GradientButton = forwardRef(function GradientButton(
  {
    children,
    className = '',
    loading = false,
    loadingText,
    disabled = false,
    icon,
    iconPosition = 'left',
    size = 'md',
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
    ${GRADIENT_PRIMARY}
    text-white
    font-semibold
    rounded-full
    transition-all
    duration-200
    inline-flex
    items-center
    justify-center
    gap-2
    ${SIZE_CLASSES[size]}
    ${isDisabled ? 'opacity-50' : 'hover:opacity-90 cursor-pointer'}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Content to render
  const content = (
    <>
      {/* Loading spinner or left icon */}
      {loading ? (
        <SpinnerIcon size="sm" />
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

export default GradientButton;
