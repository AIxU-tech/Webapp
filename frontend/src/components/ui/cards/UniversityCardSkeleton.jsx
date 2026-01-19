/**
 * UniversityCardSkeleton Component
 *
 * Loading skeleton for university cards.
 */

export default function UniversityCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-6 animate-pulse">
      {/* Header with title and icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
        <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0 ml-3" />
      </div>

      {/* Club info */}
      <div className="mb-4 space-y-2">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center space-y-1">
            <div className="h-5 bg-muted rounded w-8 mx-auto" />
            <div className="h-3 bg-muted rounded w-12 mx-auto" />
          </div>
        ))}
      </div>

      {/* Button */}
      <div className="h-10 bg-muted rounded-md" />
    </div>
  );
}
