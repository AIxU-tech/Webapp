/**
 * ProfilePageSkeleton Component
 *
 * Full-page skeleton placeholder for the Profile page.
 * Mirrors the two-column layout (main + 340px sidebar) with coarse
 * representations of the header, about, content sections, and sidebar cards.
 */

function SectionSkeleton({ titleWidth = 'w-24', lines = 3 }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
      <div className={`h-5 bg-muted rounded ${titleWidth} mb-4`} />
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={`h-3 bg-muted rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
          />
        ))}
      </div>
    </div>
  );
}

function SidebarCardSkeleton({ lines = 4, showTabs = false }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 animate-pulse">
      <div className="h-4 bg-muted rounded w-20 mb-4" />
      {showTabs && (
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4">
          <div className="flex-1 h-8 bg-card rounded-md" />
          <div className="flex-1 h-8 rounded-md" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-4 h-4 bg-muted rounded flex-shrink-0" />
            <div className={`h-3 bg-muted rounded ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen gradient-mesh">
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          {/* Main Column */}
          <div className="space-y-6">
            {/* Profile Header skeleton */}
            <div className="relative animate-pulse">
              {/* Banner */}
              <div className="h-32 sm:h-40 bg-muted rounded-t-2xl" />

              {/* Content area below banner */}
              <div className="relative bg-card rounded-b-2xl border border-t-0 border-border p-6 pt-16 sm:pt-20">
                {/* Avatar overlapping banner */}
                <div className="absolute -top-14 sm:-top-16 left-6">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-muted rounded-full border-4 border-card" />
                </div>

                {/* Name + headline */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="space-y-2 flex-1">
                    <div className="h-7 bg-muted rounded w-48" />
                    <div className="h-4 bg-muted rounded w-32" />
                  </div>
                  <div className="h-9 bg-muted rounded-full w-28 flex-shrink-0" />
                </div>

                {/* Meta row: university pill + location */}
                <div className="flex items-center gap-3">
                  <div className="h-7 bg-muted rounded-full w-36" />
                  <div className="h-4 bg-muted rounded w-20" />
                </div>
              </div>
            </div>

            {/* About section */}
            <SectionSkeleton titleWidth="w-16" lines={4} />

            {/* Experience section */}
            <SectionSkeleton titleWidth="w-28" lines={3} />

            {/* Education section */}
            <SectionSkeleton titleWidth="w-24" lines={2} />

            {/* Projects section */}
            <SectionSkeleton titleWidth="w-20" lines={3} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* Activity card with tabs */}
            <SidebarCardSkeleton showTabs lines={3} />

            {/* AI Clubs card */}
            <SidebarCardSkeleton lines={2} />

            {/* Skills card */}
            <div className="bg-card border border-border rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-14 mb-4" />
              <div className="flex flex-wrap gap-2">
                {[16, 20, 12, 24, 14, 18].map((w, i) => (
                  <div key={i} className="h-7 bg-muted rounded-full" style={{ width: `${w * 4}px` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
