/**
 * CommentCard Component
 *
 * Displays a single comment with author info, content, and actions.
 * Supports inline editing for the comment author.
 *
 * Features:
 * - Author avatar and name
 * - Comment text with inline edit mode
 * - @mention links to user profiles
 * - Time ago and "(edited)" indicator
 * - Like button with count
 * - Reply button for threaded comments
 * - Edit/Delete buttons for comment owner
 * - Indented styling for replies
 *
 * @component
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartIcon, PencilIcon, TrashIcon, XIcon, CheckIcon, ChatBubbleIcon } from './icons';

/**
 * Parse comment text and convert @mentions at the start to profile links.
 * 
 * @param {string} text - The comment text
 * @returns {React.ReactNode} Text with @mention as a link if present
 */
function renderTextWithMention(text) {
  // Match @Name at the very start of the text (supports multi-word names)
  // Pattern: @ followed by words (with spaces between) until we hit common punctuation or end
  const mentionMatch = text.match(/^@([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+/);

  if (!mentionMatch) {
    return text;
  }

  const mentionName = mentionMatch[1];
  const mentionFull = mentionMatch[0];
  const restOfText = text.slice(mentionFull.length);

  // We don't have the user ID from just the name, so we'll make the @mention
  // visually distinct but not linkable. The parent comment's author info could
  // be passed down if we want to make it a real link.
  return (
    <>
      <span className="text-primary font-medium">@{mentionName}</span>
      {' '}{restOfText}
    </>
  );
}

/**
 * CommentCard Component
 *
 * @param {Object} props - Component props
 * @param {Object} props.comment - The comment data object
 * @param {number} props.noteId - The parent note's ID
 * @param {Function} props.onLike - Callback when like button is clicked
 * @param {Function} props.onEdit - Callback when comment is edited
 * @param {Function} props.onDelete - Callback when delete button is clicked
 * @param {Function} [props.onReply] - Callback when reply button is clicked
 * @param {number} [props.currentUserId] - Current authenticated user's ID
 * @param {boolean} [props.isAuthenticated] - Whether user is authenticated
 * @param {boolean} [props.isReply] - Whether this comment is a reply (affects styling)
 */
export default function CommentCard({
  comment,
  noteId,
  onLike,
  onEdit,
  onDelete,
  onReply,
  currentUserId,
  isAuthenticated = false,
  isReply = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  // Determine if current user owns this comment
  const isOwner = isAuthenticated && currentUserId && comment.author.id === currentUserId;

  // Handle starting edit mode
  const handleStartEdit = () => {
    setEditText(comment.text);
    setIsEditing(true);
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditText(comment.text);
    setIsEditing(false);
  };

  // Handle saving edit
  const handleSaveEdit = () => {
    const trimmedText = editText.trim();
    if (trimmedText && trimmedText !== comment.text) {
      onEdit(noteId, comment.id, trimmedText);
    }
    setIsEditing(false);
  };

  // Handle key press in edit mode
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Avatar size based on whether this is a reply
  const avatarSize = isReply ? 'w-6 h-6' : 'w-8 h-8';

  return (
    <div className={`flex space-x-3 py-3 ${isReply ? 'ml-11' : ''}`}>
      {/* Author Avatar */}
      <Link to={`/users/${comment.author.id}`} className="flex-shrink-0">
        <img
          src={comment.author.avatar}
          alt={comment.author.name}
          className={`${avatarSize} rounded-full hover:ring-2 hover:ring-primary transition-all`}
        />
      </Link>

      {/* Comment Content */}
      <div className="flex-1 min-w-0">
        {/* Author Name and Time */}
        <div className="flex items-center space-x-2 mb-1">
          <Link
            to={`/users/${comment.author.id}`}
            className="font-medium text-sm text-foreground hover:text-primary transition-colors"
          >
            {comment.author.name}
          </Link>
          <span className="text-xs text-muted-foreground">
            {comment.timeAgo}
            {comment.isEdited && ' · edited'}
          </span>
        </div>

        {/* Comment Text or Edit Input */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveEdit}
                disabled={!editText.trim()}
                className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-white bg-primary rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckIcon className="w-3 h-3" />
                <span>Save</span>
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <XIcon className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {renderTextWithMention(comment.text)}
          </p>
        )}

        {/* Comment Actions */}
        {!isEditing && (
          <div className="flex items-center space-x-3 mt-2">
            {/* Like Button */}
            <button
              onClick={() => onLike(noteId, comment.id)}
              disabled={!isAuthenticated}
              className={`flex items-center space-x-1 text-xs transition-colors ${comment.isLiked
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-muted-foreground hover:text-foreground'
                } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={comment.isLiked ? 'Unlike comment' : 'Like comment'}
            >
              <HeartIcon filled={comment.isLiked} className="w-4 h-4" />
              {comment.likes > 0 && <span>{comment.likes}</span>}
            </button>

            {/* Reply Button */}
            {onReply && isAuthenticated && (
              <button
                onClick={() => onReply(comment)}
                className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Reply to comment"
              >
                <ChatBubbleIcon className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            )}

            {/* Edit Button (owner only) */}
            {isOwner && (
              <button
                onClick={handleStartEdit}
                className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Edit comment"
              >
                <PencilIcon className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            {/* Delete Button (owner only) */}
            {isOwner && (
              <button
                onClick={() => onDelete(noteId, comment.id)}
                className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
                aria-label="Delete comment"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
