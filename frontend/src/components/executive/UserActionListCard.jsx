/**
 * UserActionListCard
 *
 * Card displaying a list of people who performed an action (RSVP, check-in, etc.).
 * Shared layout for RSVPs and attendance lists in the executive portal.
 */

import { Card, EmptyState } from '../ui';
import PersonListItem from './PersonListItem';

function PersonListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-3 bg-muted rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UserActionListCard({
  title,
  icon: Icon,
  count,
  items,
  getItemKey,
  renderUser,
  renderName,
  renderSubtitle,
  onUserClick,
  isItemClickable,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
  isLoading,
  skeletonRows = 3,
}) {
  const countDisplay = count ?? items?.length ?? 0;

  const emptyContent = EmptyIcon ? (
    <EmptyState
      icon={<EmptyIcon className="h-10 w-10" />}
      title={emptyTitle}
      description={emptyDescription}
    />
  ) : (
    <p className="text-sm text-muted-foreground">{emptyTitle}</p>
  );

  return (
    <Card padding="lg">
      <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5" />}
        {title} ({countDisplay})
      </h2>
      {isLoading ? (
        <PersonListSkeleton rows={skeletonRows} />
      ) : !items?.length ? (
        emptyContent
      ) : (
        <div className="space-y-0">
          {items.map((item) => (
            <PersonListItem
              key={getItemKey(item)}
              user={renderUser(item)}
              name={renderName ? renderName(item) : undefined}
              subtitle={renderSubtitle ? renderSubtitle(item) : undefined}
              onClick={onUserClick && (!isItemClickable || isItemClickable(item)) ? () => onUserClick(item) : undefined}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
