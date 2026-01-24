/**
 * CardSkeleton Component
 *
 * A loading placeholder skeleton for card-style content.
 * Displays animated gray boxes that mimic card layout while data loads.
 *
 * @component
 *
 * @example
 * // Default card skeleton
 * <CardSkeleton />
 *
 * @example
 * // Multiple skeletons in a grid
 * {isLoading && (
 *   <div className="grid gap-4 md:grid-cols-3">
 *     <CardSkeleton />
 *     <CardSkeleton />
 *     <CardSkeleton />
 *   </div>
 * )}
 *
 * @example
 * // Compact variant for smaller cards
 * <CardSkeleton variant="compact" />
 */

/**
 * Variant configurations for different skeleton layouts
 */
const VARIANTS = {
  default: {
    iconSize: 'w-8 h-8',
    titleWidth: 'w-3/4',
    subtitleWidth: 'w-1/4',
    showContent: true,
  },
  compact: {
    iconSize: 'w-6 h-6',
    titleWidth: 'w-2/3',
    subtitleWidth: 'w-1/3',
    showContent: false,
  },
};

export default function CardSkeleton({
  variant = 'default',
  className = '',
}) {
  const config = VARIANTS[variant] || VARIANTS.default;

  return (
    <div
      className={`bg-card border border-border rounded-lg p-5 animate-pulse ${className}`}
      aria-hidden="true"
    >
      {/* Header row with icon and title placeholders */}
      <div className="flex items-start gap-4">
        <div className={`${config.iconSize} bg-muted rounded-lg flex-shrink-0`} />
        <div className="flex-1 space-y-2">
          <div className={`h-4 bg-muted rounded ${config.titleWidth}`} />
          <div className={`h-3 bg-muted rounded ${config.subtitleWidth}`} />
        </div>
      </div>

      {/* Content line placeholders */}
      {config.showContent && (
        <div className="mt-3 space-y-2">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-5/6" />
        </div>
      )}
    </div>
  );
}
