/**
 * ExecutiveSectionCard
 *
 * Card with section header (title, subtitle, count) and content area.
 * Handles loading skeleton, empty state, or children.
 * Shared by MemberTableView and EventsTableView.
 */

import { Card, EmptyState } from '../ui';

export default function ExecutiveSectionCard({
  title,
  subtitle,
  count,
  isEmpty,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
  isLoading,
  skeleton,
  action,
  children,
}) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {count != null && !isLoading && (
            <span className="text-sm text-muted-foreground">{count}</span>
          )}
          {action}
        </div>
      </div>

      {isLoading && skeleton ? (
        skeleton
      ) : isEmpty ? (
        <EmptyState
          icon={EmptyIcon ? <EmptyIcon className="h-12 w-12" /> : null}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        children
      )}
    </Card>
  );
}
