/**
 * Tooltip Component
 *
 * A CSS-only tooltip that appears on hover. Provides contextual information
 * without requiring JavaScript state management.
 *
 * Features:
 * - Pure CSS implementation for better performance
 * - Configurable positioning (top, bottom, left, right)
 * - Smooth fade-in animation
 * - Automatically positioned arrow indicator
 *
 * @component
 *
 * @example
 * // Basic usage (default: top position)
 * <Tooltip content="This is helpful information">
 *   <InfoIcon />
 * </Tooltip>
 *
 * @example
 * // Bottom position
 * <Tooltip content="Click to edit" position="bottom">
 *   <button>Edit</button>
 * </Tooltip>
 *
 * @example
 * // With custom wrapper class
 * <Tooltip content="User settings" className="ml-2">
 *   <SettingsIcon />
 * </Tooltip>
 */

/**
 * Position-specific styling configurations
 */
const POSITION_STYLES = {
  top: {
    tooltip: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-x-transparent border-b-transparent',
  },
  bottom: {
    tooltip: 'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-x-transparent border-t-transparent',
  },
  left: {
    tooltip: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-y-transparent border-r-transparent',
  },
  right: {
    tooltip: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-y-transparent border-l-transparent',
  },
};

export default function Tooltip({
  children,
  content,
  position = 'top',
  className = '',
}) {
  const positionStyles = POSITION_STYLES[position] || POSITION_STYLES.top;

  return (
    <div className={`relative inline-flex group ${className}`}>
      {children}

      {/* Tooltip container */}
      <div
        className={`
          absolute ${positionStyles.tooltip}
          px-3 py-2
          bg-gray-900 text-white text-xs
          rounded-lg
          opacity-0 invisible
          group-hover:opacity-100 group-hover:visible
          transition-all duration-200
          whitespace-nowrap
          z-50
          pointer-events-none
        `}
        role="tooltip"
      >
        {content}

        {/* Arrow indicator */}
        <div
          className={`absolute border-4 ${positionStyles.arrow}`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
