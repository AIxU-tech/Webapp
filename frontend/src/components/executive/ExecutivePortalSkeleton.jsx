/**
 * ExecutivePortalSkeleton
 *
 * Loading skeleton for the executive portal.
 * Mirrors ExecutivePortalLayout: header with nav tabs and content card.
 */

export default function ExecutivePortalSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* University identity skeleton */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 bg-muted rounded-lg animate-pulse flex-shrink-0" />
              <div className="space-y-2">
                <div className="h-5 bg-muted rounded w-40 animate-pulse" />
                <div className="h-3 bg-muted rounded w-24 animate-pulse" />
              </div>
            </div>

            {/* Nav tabs skeleton */}
            <nav className="flex bg-muted rounded-xl p-1 flex-shrink-0 self-start sm:self-auto">
              <div className="h-9 bg-muted rounded-lg w-24 animate-pulse mx-1" />
              <div className="h-9 bg-muted rounded-lg w-20 animate-pulse mx-1" />
            </nav>

            {/* View public page link skeleton */}
            <div className="h-4 bg-muted rounded w-28 animate-pulse flex-shrink-0" />
          </div>
        </div>
      </header>

      {/* Content skeleton - card with list rows */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded w-36" />
              <div className="h-4 bg-muted rounded w-56" />
            </div>
            <div className="h-4 bg-muted rounded w-16" />
          </div>

          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-3 border-b border-border last:border-0"
              >
                <div className="w-10 h-10 bg-muted rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-48" />
                </div>
                <div className="h-3 bg-muted rounded w-20 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
