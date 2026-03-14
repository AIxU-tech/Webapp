/**
 * UniversityPageSkeleton Component
 *
 * Full-page skeleton placeholder for the University detail page.
 * Mirrors the layout: hero banner, floating identity bar, nav tabs,
 * and two-column content (main + sidebar).
 *
 * @component
 */

function ContentSectionSkeleton({ titleWidth = 'w-32', lines = 3 }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
      <div className={`h-5 bg-muted rounded ${titleWidth} mb-4`} />
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={`h-3 bg-muted rounded ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
          />
        ))}
      </div>
    </div>
  );
}

function SidebarCardSkeleton({ showButton = true }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-muted rounded w-28" />
        {showButton && (
          <div className="h-8 bg-muted rounded-md w-20 flex-shrink-0" />
        )}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className={`h-3 bg-muted rounded ${i % 2 === 0 ? 'w-3/4' : 'w-2/3'}`} />
              <div className="h-2.5 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse flex gap-4">
          <div className="w-14 h-14 bg-muted rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-5 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="flex gap-4">
              <div className="h-3 bg-muted rounded w-20" />
              <div className="h-3 bg-muted rounded w-24" />
            </div>
            <div className="h-9 bg-muted rounded-lg w-24 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UniversityPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner Skeleton */}
      <div className="px-1 pt-1">
        <div className="h-56 bg-muted rounded-lg animate-pulse" />
      </div>

      {/* Identity Bar Skeleton - floating card below hero */}
      <div className="relative -mt-8 z-10">
        <div className="container mx-auto px-4">
          <div className="bg-card border border-border rounded-lg shadow-md p-6 flex items-center gap-6 animate-pulse">
            {/* Logo placeholder - overlapping */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted rounded-full border-4 border-card -mt-12 flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-7 bg-muted rounded w-48" />
              <div className="h-4 bg-muted rounded w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Nav Tabs Skeleton */}
      <div className="sticky top-16 z-20 bg-background mt-3">
        <div className="container mx-auto px-4 py-3">
          <div className="flex bg-muted rounded-lg p-1 gap-1 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 bg-muted rounded-md flex-1" />
            ))}
          </div>
        </div>
      </div>

      {/* Two-Column Content Layout */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_350px] gap-8">
          {/* Main Content Column */}
          <main className="space-y-6">
            {/* About / Tab content skeleton */}
            <ContentSectionSkeleton titleWidth="w-24" lines={4} />
            <ContentSectionSkeleton titleWidth="w-20" lines={2} />
            <EventListSkeleton />
          </main>

          {/* Sidebar Column */}
          <aside className="space-y-6 lg:sticky lg:top-36 lg:self-start">
            <SidebarCardSkeleton showButton />
            <SidebarCardSkeleton showButton={false} />
          </aside>
        </div>
      </div>
    </div>
  );
}
