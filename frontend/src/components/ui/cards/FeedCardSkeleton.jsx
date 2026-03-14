/**
 * FeedCardSkeleton Component
 *
 * Skeleton placeholder that mirrors the FeedCard layout (avatar header,
 * content body, tags, action footer). Used by page-level loading skeletons
 * for notes and opportunities feeds.
 *
 * @param {object} props
 * @param {'note'|'opportunity'} [props.variant='note'] - Controls content area shape
 */
export default function FeedCardSkeleton({ variant = 'note' }) {
  return (
    <div
      className="bg-card border border-border rounded-lg p-6 animate-pulse"
      aria-hidden="true"
    >
      {/* Header — avatar + author name/university + timestamp */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-muted rounded-full flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 bg-muted rounded w-28" />
            <div className="h-3 bg-muted rounded w-20" />
          </div>
        </div>
        <div className="h-3 bg-muted rounded w-14" />
      </div>

      {/* Content body */}
      <div className="mb-4 space-y-2">
        {/* Title */}
        <div className="h-5 bg-muted rounded w-3/4" />

        {variant === 'opportunity' && (
          /* Compensation line */
          <div className="h-4 bg-muted rounded w-24" />
        )}

        {/* Body text lines */}
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
        {variant === 'note' && (
          <>
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </>
        )}
      </div>

      {/* Tags row */}
      <div className="flex gap-2 mb-4">
        <div className="h-6 bg-muted rounded-full w-16" />
        <div className="h-6 bg-muted rounded-full w-20" />
        {variant === 'note' && <div className="h-6 bg-muted rounded-full w-14" />}
      </div>

      {/* Actions footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="h-8 bg-muted rounded-lg w-16" />
          <div className="h-8 bg-muted rounded-lg w-16" />
          <div className="h-8 bg-muted rounded-lg w-16" />
        </div>
        <div className="h-8 w-8 bg-muted rounded-lg" />
      </div>
    </div>
  );
}
