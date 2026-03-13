/**
 * ConversationListSkeleton Component
 *
 * Skeleton placeholder that mirrors the ConversationListItem layout
 * (avatar circle, name, last message preview, timestamp).
 * Shown inside ConversationSidebar while conversations are loading.
 *
 * @param {object} props
 * @param {number} [props.count=6] - Number of skeleton items to render
 */
export default function ConversationListSkeleton({ count = 6 }) {
  return (
    <div className="py-1" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 mx-2 my-0.5 animate-pulse">
          {/* Avatar */}
          <div className="w-10 h-10 bg-muted rounded-full flex-shrink-0" />

          {/* Text area */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3.5 bg-muted rounded w-24" />
              <div className="h-3 bg-muted rounded w-10 flex-shrink-0" />
            </div>
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
