/**
 * EmptyState Component
 *
 * Displays a centered message when there's no data to show.
 * Commonly used for empty lists, search results, or initial states.
 *
 * @component
 *
 * @example
 * <EmptyState
 *   title="No notes found"
 *   description="Try adjusting your search or create a new note."
 *   action={{ label: "Create Note", onClick: () => setIsModalOpen(true) }}
 * />
 *
 * @example
 * // With custom icon
 * <EmptyState
 *   icon={<SearchIcon className="h-12 w-12" />}
 *   title="No results"
 *   description="No items match your search."
 * />
 */

export default function EmptyState({
  icon,
  title = 'No data available',
  description,
  action,
  className = '',
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {/* Icon */}
      {icon && (
        <div className="flex justify-center mb-4 text-muted-foreground">
          {icon}
        </div>
      )}

      {/* Title */}
      <h3 className="text-lg font-medium text-foreground mb-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}

      {/* Action Button */}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
        >
          {action.icon}
          {action.label}
        </button>
      )}
    </div>
  );
}
