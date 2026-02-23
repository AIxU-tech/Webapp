/**
 * NewsLoadingSkeleton Component
 *
 * Loading skeleton specific to the News page layout.
 * Displays skeleton placeholders for both news stories and research papers sections.
 * Story skeletons include a hero image placeholder; paper skeletons are text-only.
 *
 * @component
 *
 * @example
 * {isLoading && <NewsLoadingSkeleton />}
 */

/**
 * Skeleton loader for the section header
 */
function SectionHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 bg-muted rounded-xl animate-pulse" />
      <div className="space-y-1.5">
        <div className="h-5 bg-muted rounded w-28 animate-pulse" />
        <div className="h-3 bg-muted rounded w-44 animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a story content card (with hero image)
 */
function StoryCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4">
        {/* Header: Emoji badge + Title */}
        <div className="flex items-start gap-3 mb-3">
          {/* Emoji badge skeleton */}
          <div className="w-10 h-10 bg-muted rounded-xl animate-pulse flex-shrink-0" />

          {/* Title and subtitle */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-muted rounded w-full animate-pulse" />
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
          </div>
        </div>

        {/* Hero image skeleton */}
        <div className="w-full aspect-[16/9] bg-muted rounded-lg animate-pulse mb-3" />

        {/* Summary text skeleton */}
        <div className="space-y-2 mb-3">
          <div className="h-3 bg-muted rounded w-full animate-pulse" />
          <div className="h-3 bg-muted rounded w-full animate-pulse" />
          <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
        </div>

        {/* Sources skeleton */}
        <div className="space-y-1.5 mb-4">
          <div className="h-3 bg-muted rounded w-16 animate-pulse" />
          <div className="h-3 bg-muted rounded w-24 animate-pulse" />
          <div className="h-3 bg-muted rounded w-28 animate-pulse" />
        </div>

        {/* Chat input skeleton */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded flex-1 animate-pulse" />
            <div className="w-4 h-4 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for a paper content card (no hero image)
 */
function PaperCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4">
        {/* Header: Emoji badge + Title */}
        <div className="flex items-start gap-3 mb-3">
          {/* Emoji badge skeleton */}
          <div className="w-10 h-10 bg-muted rounded-xl animate-pulse flex-shrink-0" />

          {/* Title and subtitle */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-muted rounded w-full animate-pulse" />
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
          </div>
        </div>

        {/* Summary text skeleton */}
        <div className="space-y-2 mb-3">
          <div className="h-3 bg-muted rounded w-full animate-pulse" />
          <div className="h-3 bg-muted rounded w-full animate-pulse" />
          <div className="h-3 bg-muted rounded w-full animate-pulse" />
          <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
        </div>

        {/* Authors skeleton */}
        <div className="h-3 bg-muted rounded w-1/2 animate-pulse mb-4" />

        {/* Chat input skeleton */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded flex-1 animate-pulse" />
            <div className="w-4 h-4 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full page loading skeleton shown during initial data fetch
 * Displays skeleton placeholders for stories (with hero image) and papers (text-only)
 */
export default function NewsLoadingSkeleton() {
  return (
    <div className="space-y-10">
      {/* Stories section skeleton */}
      <section>
        <SectionHeaderSkeleton />
        <div className="grid gap-4 md:grid-cols-3">
          <StoryCardSkeleton />
          <StoryCardSkeleton />
          <StoryCardSkeleton />
        </div>
      </section>

      {/* Papers section skeleton */}
      <section>
        <SectionHeaderSkeleton />
        <div className="grid gap-4 md:grid-cols-3">
          <PaperCardSkeleton />
          <PaperCardSkeleton />
          <PaperCardSkeleton />
        </div>
      </section>
    </div>
  );
}
