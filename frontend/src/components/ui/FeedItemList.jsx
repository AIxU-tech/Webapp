/**
 * FeedItemList Component
 * Handles loading/error/empty states and renders a list of feed items.
 */

import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';

export default function FeedItemList({
  items = [],
  isLoading = false,
  error = null,
  onRetry,
  emptyIcon,
  emptyTitle = 'No items found',
  emptyDescription,
  emptyAction,
  loadingText = 'Loading...',
  renderItem,
  className = '',
}) {
  if (isLoading) {
    return <LoadingState text={loadingText} size="lg" />;
  }

  if (error) {
    return <ErrorState message={error.message || 'Failed to load items'} onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {items.map(renderItem)}
    </div>
  );
}
