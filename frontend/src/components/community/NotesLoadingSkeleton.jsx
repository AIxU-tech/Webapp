/**
 * NotesLoadingSkeleton Component
 *
 * Skeleton placeholder for the Community Notes feed.
 * Renders a stack of FeedCardSkeleton items that mirror NoteCard layout.
 *
 * @param {object} props
 * @param {number} [props.count=4] - Number of skeleton cards to show
 */
import { FeedCardSkeleton } from '../ui';

export default function NotesLoadingSkeleton({ count = 4 }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }, (_, i) => (
        <FeedCardSkeleton key={i} variant="note" />
      ))}
    </div>
  );
}
