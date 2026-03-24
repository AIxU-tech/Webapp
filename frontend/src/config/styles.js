/**
 * Shared Style Constants
 *
 * Centralized style definitions to ensure consistency across the application.
 * Import these constants instead of hardcoding values in components.
 *
 * @example
 * import { GRADIENTS, SHADOWS } from '../config/styles';
 *
 * <button className={`${GRADIENTS.primary} ${SHADOWS.primaryHover}`}>
 *   Click me
 * </button>
 */

// =============================================================================
// GRADIENT DEFINITIONS
// =============================================================================

/**
 * Primary gradient used throughout the application.
 * Applied to CTAs, icons, and branded elements.
 */
export const GRADIENT_PRIMARY = 'bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)]';

/**
 * Primary gradient colors as individual values (for custom compositions).
 */
export const GRADIENT_PRIMARY_FROM = 'hsl(220,85%,60%)';
export const GRADIENT_PRIMARY_TO = 'hsl(185,85%,55%)';

/**
 * Secondary gradient for alternative accent elements.
 * Used for research papers, secondary features, etc.
 */
export const GRADIENT_SECONDARY = 'bg-gradient-to-br from-[hsl(280,85%,60%)] to-[hsl(320,85%,55%)]';

/**
 * Secondary gradient colors as individual values.
 */
export const GRADIENT_SECONDARY_FROM = 'hsl(280,85%,60%)';
export const GRADIENT_SECONDARY_TO = 'hsl(320,85%,55%)';

/**
 * Gradient preset object for easy reference.
 */
export const GRADIENTS = {
  primary: GRADIENT_PRIMARY,
  secondary: GRADIENT_SECONDARY,
};

// =============================================================================
// SHADOW DEFINITIONS
// =============================================================================

/**
 * Hover shadow for primary gradient buttons.
 * Creates a glow effect using the primary color.
 */
export const SHADOW_PRIMARY_HOVER = 'hover:shadow-lg hover:shadow-[hsl(220,85%,60%)]/30';

/**
 * Hover shadow for secondary gradient buttons.
 * Creates a glow effect using the secondary color.
 */
export const SHADOW_SECONDARY_HOVER = 'hover:shadow-lg hover:shadow-[hsl(280,85%,60%)]/30';

/**
 * Shadow presets object for easy reference.
 */
export const SHADOWS = {
  primaryHover: SHADOW_PRIMARY_HOVER,
  secondaryHover: SHADOW_SECONDARY_HOVER,
};

// =============================================================================
// BUTTON STYLE PRESETS
// =============================================================================

/**
 * Complete button style presets combining gradients, shadows, and transitions.
 * Use these for consistent button styling across the application.
 */
export const BUTTON_STYLES = {
  /**
   * Primary gradient button with hover effects.
   * Used for main CTAs throughout the application.
   */
  primary: `${GRADIENT_PRIMARY} text-white font-semibold ${SHADOW_PRIMARY_HOVER} transition-all duration-200`,

  /**
   * Secondary button with border and subtle background.
   * Used for secondary actions.
   */
  secondary: 'bg-muted text-foreground border border-border hover:bg-muted-foreground/10 transition-colors',

  /**
   * Outline button with transparent background.
   * Used for tertiary actions.
   */
  outline: 'bg-transparent border border-border text-foreground hover:bg-muted transition-colors',

  /**
   * Ghost button with no border or background.
   * Used for minimal UI elements.
   */
  ghost: 'bg-transparent text-foreground hover:bg-muted transition-colors',

  /**
   * Danger button for destructive actions.
   */
  danger: 'bg-red-600 text-white hover:bg-red-700 transition-colors',
};
