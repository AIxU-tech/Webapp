/**
 * UniversityOpportunitiesTab
 *
 * Displays opportunities posted by members of this university.
 * Integrates with useInfiniteOpportunities hook to fetch filtered by university_id.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMessageTarget } from '../../contexts/MessageTargetContext';
import { useInfiniteOpportunities, useBookmarkOpportunity, useDeleteOpportunity, useInfiniteScroll } from '../../hooks';
import { OpportunityCard } from '../opportunities';
import { LoadingState, EmptyState } from '../ui';
import { OpportunitiesIcon } from '../icons';

export default function UniversityOpportunitiesTab({
  universityId,
  currentUserId,
  isAuthenticated,
  isSiteAdmin = false,
}) {
  const navigate = useNavigate();
  const { setTargetUserId } = useMessageTarget();

  // Fetch opportunities for this university with infinite scroll
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteOpportunities({
    university_id: universityId,
  });

  // Extract and flatten opportunities from infinite query data
  const opportunities = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.opportunities || []);
  }, [data]);

  // Infinite scroll - Auto-load when user scrolls to bottom
  const loadMoreRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  // Mutation hooks for interactions
  const bookmarkMutation = useBookmarkOpportunity();
  const deleteMutation = useDeleteOpportunity();

  // Handle bookmark action
  const handleBookmark = (opportunityId) => {
    if (!isAuthenticated) {
      alert('Please log in to bookmark opportunities');
      return;
    }
    bookmarkMutation.mutate(opportunityId);
  };

  // Handle delete action
  const handleDelete = (opportunityId) => {
    if (confirm('Are you sure you want to delete this opportunity?')) {
      deleteMutation.mutate(opportunityId);
    }
  };

  const handleMessageUser = (userId) => {
    if (!isAuthenticated) {
      alert('Please log in to message users');
      return;
    }
    setTargetUserId(userId);
    navigate('/messages');
  };

  // Loading state
  if (isLoading) {
    return <LoadingState text="Loading opportunities..." />;
  }

  // Error state
  if (error) {
    return (
      <EmptyState
        icon={<OpportunitiesIcon className="h-12 w-12" />}
        title="Failed to load opportunities"
        description="There was an error loading opportunities. Please try again."
      />
    );
  }

  // Empty state
  if (!opportunities || opportunities.length === 0) {
    return (
      <EmptyState
        icon={<OpportunitiesIcon className="h-12 w-12" />}
        title="No opportunities posted"
        description="Members haven't posted any opportunities for this university yet."
      />
    );
  }

  // Render opportunities
  return (
    <>
      <div className="space-y-4">
        {opportunities.map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            onBookmark={handleBookmark}
            onDelete={handleDelete}
            onMessageUser={handleMessageUser}
            currentUserId={currentUserId}
            isAuthenticated={isAuthenticated}
            isSiteAdmin={isSiteAdmin}
          />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="py-4 text-center text-muted-foreground">
          {isFetchingNextPage ? 'Loading more...' : ''}
        </div>
      )}

    </>
  );
}
