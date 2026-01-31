/**
 * NoteCard Component
 * Displays a community note using the shared FeedCard layout.
 * Includes expandable comment section and file attachments.
 */

import { useState } from 'react';
import { FeedCard, LikeButton, SharePopover, Toast } from '../ui';
import {
  MessageCircleIcon,
  ShareIcon,
  BuildingIcon,
} from '../icons';
import CommentSection from './CommentSection';
import NoteAttachments from './NoteAttachments';
import { useAuthModal } from '../../contexts/AuthModalContext';

export default function NoteCard({
  note,
  onLike,
  onBookmark,
  onDelete,
  onEdit,
  currentUserId,
  isAuthenticated = false,
  initialCommentsExpanded = false,
}) {
  const { openAuthModal } = useAuthModal();
  // Local state for comment section expansion
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(initialCommentsExpanded);
  // Share popover state
  const [isSharePopoverOpen, setIsSharePopoverOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Determine if current user owns this note
  const isOwner = isAuthenticated && currentUserId && note.author.id === currentUserId;

  // Toggle comment section
  const handleToggleComments = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setIsCommentsExpanded((prev) => !prev);
  };

  const headerBadges = note.universityOnly ? (
    <span className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded" title="Only visible to your university">
      <BuildingIcon className="h-3 w-3 mr-1" />
      University Only
    </span>
  ) : null;

  const primaryActions = (
    <>
      <LikeButton
        isLiked={note.isLiked}
        likes={note.likes}
        onClick={() => onLike(note.id)}
        size="lg"
      />

      {/* Comment Button */}
      <button
        onClick={handleToggleComments}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${isCommentsExpanded
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        aria-label={isCommentsExpanded ? 'Hide comments' : 'View comments'}
        aria-expanded={isCommentsExpanded}
      >
        <MessageCircleIcon />
        <span className="font-medium">{note.comments}</span>
      </button>

      {/* Share Button */}
      <div className="relative">
        <button
          onClick={() => setIsSharePopoverOpen((prev) => !prev)}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 cursor-pointer"
          aria-label="Share note"
          aria-expanded={isSharePopoverOpen}
        >
          <ShareIcon />
          <span className="font-medium">Share</span>
        </button>
        <SharePopover
          isOpen={isSharePopoverOpen}
          onClose={() => setIsSharePopoverOpen(false)}
          noteId={note.id}
          onCopySuccess={() => setShowToast(true)}
        />
      </div>
    </>
  );

  return (
    <>
      <FeedCard
        item={note}
        canEdit={isOwner}
        canDelete={isOwner}
        isBookmarked={note.isBookmarked}
        onBookmark={onBookmark}
        onEdit={onEdit}
        onDelete={onDelete}
        tags={note.tags || []}
        headerBadges={headerBadges}
        primaryActions={primaryActions}
        expandableContent={<CommentSection noteId={note.id} isExpanded={isCommentsExpanded} />}
      >
        <h3 className="text-xl font-bold text-foreground mb-2">{note.title}</h3>
        <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{note.content}</p>

        {/* File Attachments */}
        {note.attachments && note.attachments.length > 0 && (
          <NoteAttachments attachments={note.attachments} />
        )}
      </FeedCard>
      <Toast
        message="Link copied!"
        isVisible={showToast}
        onDismiss={() => setShowToast(false)}
      />
    </>
  );
}
