/**
 * NoteCard Component
 *
 * Displays a single community note with author info, content, tags, and actions.
 * Designed for use in note feeds and lists.
 *
 * Features:
 * - Author avatar and info with links to profile
 * - Note title and content
 * - Tag badges
 * - Like, comment, share, and bookmark actions
 * - Delete button for note owner
 *
 * @component
 *
 * @example
 * <NoteCard
 *   note={noteData}
 *   onLike={(noteId) => likeNote(noteId)}
 *   onBookmark={(noteId) => bookmarkNote(noteId)}
 *   onDelete={(noteId) => deleteNote(noteId)}
 *   currentUserId={user?.id}
 *   isAuthenticated={isAuthenticated}
 * />
 */

import { Link } from 'react-router-dom';
import { Badge } from './ui';
import {
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  BookmarkIcon,
  TrashIcon,
} from './icons';

/**
 * NoteCard Component
 *
 * @param {Object} props - Component props
 * @param {Object} props.note - The note data object
 * @param {Function} props.onLike - Callback when like button is clicked
 * @param {Function} props.onBookmark - Callback when bookmark button is clicked
 * @param {Function} props.onDelete - Callback when delete button is clicked
 * @param {number} [props.currentUserId] - Current authenticated user's ID
 * @param {boolean} [props.isAuthenticated] - Whether user is authenticated
 */
export default function NoteCard({
  note,
  onLike,
  onBookmark,
  onDelete,
  currentUserId,
  isAuthenticated = false,
}) {
  // Determine if current user owns this note
  const isOwner = isAuthenticated && currentUserId && note.author.id === currentUserId;

  return (
    <article className="bg-card border border-border rounded-lg p-6 shadow-card hover:shadow-hover transition-all duration-200">
      {/* Note Header - Author info, timestamp, delete button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Author Avatar */}
          <Link to={`/users/${note.author.id}`} className="flex-shrink-0">
            <img
              src={note.author.avatar}
              alt={note.author.name}
              className="w-10 h-10 rounded-full hover:ring-2 hover:ring-primary transition-all"
            />
          </Link>

          {/* Author Info */}
          <div>
            <Link
              to={`/users/${note.author.id}`}
              className="font-semibold text-foreground hover:text-primary transition-colors"
            >
              {note.author.name}
            </Link>
            <p className="text-sm text-muted-foreground">{note.author.university}</p>
          </div>
        </div>

        {/* Timestamp and Delete Button */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">{note.timeAgo}</span>
          {isOwner && (
            <button
              onClick={() => onDelete(note.id)}
              className="text-muted-foreground hover:text-red-500 transition-colors p-1"
              title="Delete note"
              aria-label="Delete note"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      {/* Note Content */}
      <h3 className="text-xl font-bold text-foreground mb-2">{note.title}</h3>
      <p className="text-muted-foreground mb-4">{note.content}</p>

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {note.tags.map(tag => (
            <Badge key={tag} size="sm">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Note Actions - Like, comment, share, bookmark */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        {/* Left Actions */}
        <div className="flex items-center space-x-2">
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

          {/* Comment Button (placeholder for future feature) */}
          <button
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            aria-label="View comments"
          >
            <MessageCircleIcon />
            <span className="font-medium">{note.comments}</span>
          </button>

          {/* Share Button (placeholder for future feature) */}
          <button
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            aria-label="Share note"
          >
            <ShareIcon />
            <span className="font-medium">Share</span>
          </button>
        </div>

        {/* Bookmark Button */}
        <button
          onClick={() => onBookmark(note.id)}
          className={`p-2 rounded-lg transition-all duration-200 ${
            note.isBookmarked
              ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          aria-label={note.isBookmarked ? 'Remove bookmark' : 'Bookmark note'}
        >
          <BookmarkIcon filled={note.isBookmarked} />
        </button>
      </div>
    </article>
  );
}
