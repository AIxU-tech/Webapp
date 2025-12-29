/**
 * UniversityOpportunitiesTab
 *
 * Displays opportunities posted by members of this university.
 * Integrates with useOpportunities hook to fetch filtered by university_id.
 */

import { useState } from 'react';
import { useOpportunities, useBookmarkOpportunity, useDeleteOpportunity } from '../../hooks';
import OpportunityCard from '../OpportunityCard';
import { LoadingState, EmptyState } from '../ui';
import { OpportunitiesIcon } from '../icons';
import ConversationModal from '../messages/ConversationModal';

export default function UniversityOpportunitiesTab({
  universityId,
  currentUserId,
  isAuthenticated,
  isSiteAdmin = false,
}) {
  // Message modal state - tracks which user to open chat with
  const [messageUserId, setMessageUserId] = useState(null);

  // Fetch opportunities for this university
  const { data: opportunities, isLoading, error } = useOpportunities({
    university_id: universityId,
  });

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

  // Handle message poster
  const handleMessageUser = (userId) => {
    if (!isAuthenticated) {
      alert('Please log in to message users');
      return;
    }
    setMessageUserId(userId);
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

      {/* Message Modal - opens chat without leaving the page */}
      <ConversationModal
        userId={messageUserId}
        isOpen={messageUserId !== null}
        onClose={() => setMessageUserId(null)}
      />
    </>
  );
}
