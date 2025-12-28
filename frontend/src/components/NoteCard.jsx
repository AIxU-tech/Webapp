/**
 * NoteCard Component
 * Displays a community note using the shared FeedCard layout.
 */

import { FeedCard } from './ui';
import {
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
} from './icons';

export default function NoteCard({
  note,
  onLike,
  onBookmark,
  onDelete,
  currentUserId,
  isAuthenticated = false,
}) {
  const isOwner = isAuthenticated && currentUserId && note.author.id === currentUserId;

  const primaryActions = (
    <>
      {/* Like Button */}
      <button
        onClick={() => onLike(note.id)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
          note.isLiked
            ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
        aria-label={note.isLiked ? 'Unlike note' : 'Like note'}
      >
        <HeartIcon filled={note.isLiked} />
        <span className="font-medium">{note.likes}</span>
      </button>

      {/* Comment Button */}
      <button
        className="flex items-center space-x-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
        aria-label="View comments"
      >
        <MessageCircleIcon />
        <span className="font-medium">{note.comments}</span>
      </button>

      {/* Share Button */}
      <button
        className="flex items-center space-x-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
        aria-label="Share note"
      >
        <ShareIcon />
        <span className="font-medium">Share</span>
      </button>
    </>
  );

  return (
    <FeedCard
      item={note}
      canDelete={isOwner}
      isBookmarked={note.isBookmarked}
      onBookmark={onBookmark}
      onDelete={onDelete}
      tags={note.tags || []}
      primaryActions={primaryActions}
    >
      <h3 className="text-xl font-bold text-foreground mb-2">{note.title}</h3>
      <p className="text-muted-foreground mb-4">{note.content}</p>
    </FeedCard>
  );
}
