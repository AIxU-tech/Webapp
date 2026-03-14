/**
 * OpportunitiesLoadingSkeleton Component
 *
 * Skeleton placeholder for the Opportunities feed.
 * Renders a stack of FeedCardSkeleton items that mirror OpportunityCard layout.
 *
 * @param {object} props
 * @param {number} [props.count=4] - Number of skeleton cards to show
 */
import { FeedCardSkeleton } from '../ui';

export default function OpportunitiesLoadingSkeleton({ count = 4 }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }, (_, i) => (
        <FeedCardSkeleton key={i} variant="opportunity" />
      ))}
    </div>
  );
}
