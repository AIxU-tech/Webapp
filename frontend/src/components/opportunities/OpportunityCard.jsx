/**
 * OpportunityCard Component
 * Displays an opportunity posting using the shared FeedCard layout.
 */

import { FeedCard, LinkifyText } from '../ui';
import { MessagesIcon, BuildingIcon } from '../icons';
import { useAuthModal } from '../../contexts/AuthModalContext';

const LOCATION_TAGS = ['Remote', 'Hybrid', 'On-site'];
const COMPENSATION_TAGS = ['Paid', 'Unpaid'];

export default function OpportunityCard({
  opportunity,
  onBookmark,
  onDelete,
  onMessageUser,
  currentUserId,
  isAuthenticated = false,
  isSiteAdmin = false,
}) {
  const { openAuthModal } = useAuthModal();
  const isOwner = isAuthenticated && currentUserId && opportunity.author.id === currentUserId;
  const canDelete = isOwner || isSiteAdmin;
  const isOwnPost = isAuthenticated && currentUserId === opportunity.author.id;

  function handleMessagePoster() {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    // Open chat modal inline instead of navigating away
    onMessageUser?.(opportunity.author.id);
  }

  // Reorder tags: location first, then compensation, then others
  const tags = opportunity.tags || [];
  const locationTag = tags.find(tag => LOCATION_TAGS.includes(tag));
  const compensationTag = tags.find(tag => COMPENSATION_TAGS.includes(tag));
  const otherTags = tags.filter(tag => !LOCATION_TAGS.includes(tag) && !COMPENSATION_TAGS.includes(tag));
  const orderedTags = [locationTag, compensationTag, ...otherTags].filter(Boolean);

  const headerBadges = opportunity.universityOnly ? (
    <span className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded" title="Only visible to your university">
      <span className="mr-1"><BuildingIcon size="xs" /></span>
      University Only
    </span>
  ) : null;

  const primaryActions = !isOwnPost ? (
    <button
      onClick={handleMessagePoster}
      className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all duration-200 font-medium cursor-pointer"
      aria-label="Message poster"
    >
      <MessagesIcon size="sm" />
      <span>Message Poster</span>
    </button>
  ) : (
    <span className="text-sm text-muted-foreground italic">Your opportunity</span>
  );

  return (
    <FeedCard
      item={opportunity}
      canDelete={canDelete}
      isBookmarked={opportunity.isBookmarked}
      onBookmark={onBookmark}
      onDelete={onDelete}
      headerBadges={headerBadges}
      tags={orderedTags}
      primaryActions={primaryActions}
    >
      <h3 className="text-xl font-bold text-foreground mb-2">{opportunity.title}</h3>
      {opportunity.compensation && (
        <p className="text-primary font-medium mb-2">{opportunity.compensation}</p>
      )}
      <LinkifyText>
        <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{opportunity.description}</p>
      </LinkifyText>
    </FeedCard>
  );
}
