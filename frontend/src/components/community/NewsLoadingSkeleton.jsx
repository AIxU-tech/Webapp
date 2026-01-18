/**
 * NewsLoadingSkeleton Component
 *
 * Loading skeleton specific to the News page layout.
 * Displays skeleton placeholders for both news stories and research papers sections.
 *
 * @component
 *
 * @example
 * {isLoading && <NewsLoadingSkeleton />}
 */

import { CardSkeleton } from '../ui';

/**
 * Skeleton loader for the section header
 */
function SectionHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 bg-muted rounded-xl animate-pulse" />
      <div className="space-y-1.5">
        <div className="h-4 bg-muted rounded w-24 animate-pulse" />
        <div className="h-3 bg-muted rounded w-40 animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Full page loading skeleton shown during initial data fetch
 * Displays skeleton placeholders for stories and papers sections
 */
export default function NewsLoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stories section skeleton */}
      <section>
        <SectionHeaderSkeleton />
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </section>

      {/* Papers section skeleton */}
      <section>
        <SectionHeaderSkeleton />
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </section>
    </div>
  );
}
