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
import { PencilIcon, TrashIcon, XIcon, CheckIcon, MessageCircleIcon } from '../icons';
import { IconButton, LikeButton, Avatar, ConfirmationModal, LinkifyText } from '../ui';

/**
 * Parse comment text and convert @mentions at the start to profile links.
 * 
 * @param {string} text - The comment text
 * @returns {React.ReactNode} Text with @mention as a link if present
 */
function renderTextWithMention(text) {
  // Match @Name at the very start of the text (highlights first two words)
  // Pattern: @ followed by first word, then space and second word (can include hyphens)
  // Matches exactly two words separated by a space (e.g., "Oliver Stoner-German")
  const mentionMatch = text.match(/^@([A-Za-z]+\s+[A-Za-z]+(?:-[A-Za-z]+)*)\s+/);

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
  isAdmin = false,
  isReply = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Avatar and content offset sizing based on reply status
  const avatarSize = isReply ? 'xs' : 'sm';
  // Content offset = avatar width + gap (space-x-2 = 8px): w-8(32px)+8 = 40px, w-6(24px)+8 = 32px
  const contentOffset = isReply ? 'ml-8' : 'ml-10';

  return (
    <div className={`py-3 ${isReply ? 'ml-11' : ''}`}>
      {/* Author Info, Time, and Delete Button */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          {/* Avatar + Name in single link for unified hover behavior */}
          <Link to={`/users/${comment.author.id}`} className="flex items-center space-x-2 group">
            <Avatar user={comment.author} size={avatarSize} />
            <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
              {comment.author.name}
            </span>
          </Link>
          <span className="text-xs text-muted-foreground">
            {comment.timeAgo}
            {comment.isEdited && ' · edited'}
          </span>
        </div>
        {(isOwner || isAdmin) && !isEditing && (
          <IconButton
            icon={TrashIcon}
            onClick={() => setShowDeleteConfirm(true)}
            label="Delete comment"
            size="sm"
            variant="danger"
          />
        )}
      </div>

      {/* Comment Text or Edit Input - offset to align with name */}
      {isEditing ? (
        <div className={`space-y-2 ${contentOffset}`}>
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
              className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-white bg-primary rounded hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
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
        <LinkifyText>
          <p className={`text-sm text-foreground whitespace-pre-wrap break-words ${contentOffset}`}>
            {renderTextWithMention(comment.text)}
          </p>
        </LinkifyText>
      )}

      {/* Comment Actions - offset to align with content */}
      {!isEditing && (
        <div className={`flex items-center space-x-2 mt-2 ${contentOffset}`}>
          <LikeButton
            isLiked={comment.isLiked}
            likes={comment.likes}
            onClick={() => onLike(noteId, comment.id)}
            disabled={!isAuthenticated}
          />
          {onReply && isAuthenticated && (
            <IconButton
              icon={MessageCircleIcon}
              onClick={() => onReply(comment)}
              label="Reply to comment"
            />
          )}
          {isOwner && (
            <IconButton
              icon={PencilIcon}
              onClick={handleStartEdit}
              label="Edit comment"
            />
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDelete(noteId, comment.id)}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
