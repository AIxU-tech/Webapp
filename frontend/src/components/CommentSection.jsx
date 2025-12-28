/**
 * CommentSection Component
 *
 * Expandable comment section for notes. Displays a list of comments
 * with an input to add new comments at the bottom.
 *
 * Features:
 * - Lazy loading: Comments only fetched when section is expanded
 * - Optimistic updates for all actions
 * - Inline editing for comment authors
 * - Single-level threaded replies (Instagram-style)
 * - Login prompt for unauthenticated users
 *
 * @component
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useLikeComment,
} from '../hooks';
import CommentCard from './CommentCard';
import { SpinnerIcon, SendIcon, XIcon } from './icons';

/**
 * Group comments into threaded structure.
 * Returns top-level comments with their replies grouped.
 * 
 * @param {Array} comments - Flat array of comments with parentId field
 * @returns {Array} Array of { comment, replies } objects
 */
function groupCommentsByParent(comments) {
  const topLevel = [];
  const repliesByParent = {};

  // First pass: separate top-level and replies
  for (const comment of comments) {
    if (comment.parentId === null) {
      topLevel.push(comment);
    } else {
      if (!repliesByParent[comment.parentId]) {
        repliesByParent[comment.parentId] = [];
      }
      repliesByParent[comment.parentId].push(comment);
    }
  }

  // Second pass: attach replies to their parents
  return topLevel.map((comment) => ({
    comment,
    replies: repliesByParent[comment.id] || [],
  }));
}

/**
 * CommentSection Component
 *
 * @param {Object} props - Component props
 * @param {number} props.noteId - The note ID to show comments for
 * @param {boolean} props.isExpanded - Whether the section is expanded
 */
export default function CommentSection({ noteId, isExpanded }) {
  const { user, isAuthenticated } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // Comment being replied to
  const inputRef = useRef(null);

  // Fetch comments only when expanded
  const {
    data: comments = [],
    isLoading,
    error,
  } = useComments(noteId, { enabled: isExpanded });

  // Group comments by parent for threaded display
  const groupedComments = useMemo(
    () => groupCommentsByParent(comments),
    [comments]
  );

  // Mutations
  const createMutation = useCreateComment();
  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();
  const likeMutation = useLikeComment();

  // When replyingTo changes, focus input and pre-fill with @mention
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      const mention = `@${replyingTo.author.name} `;
      setNewComment(mention);
      inputRef.current.focus();
      // Place cursor at end of input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(mention.length, mention.length);
        }
      }, 0);
    }
  }, [replyingTo]);

  // Handle starting a reply
  const handleReply = (comment) => {
    if (!isAuthenticated) return;
    setReplyingTo(comment);
  };

  // Handle canceling a reply
  const handleCancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  // Handle submitting a new comment
  const handleSubmit = (e) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text || !isAuthenticated) return;

    createMutation.mutate(
      {
        noteId,
        text,
        user,
        replyToId: replyingTo?.id || null,
      },
      {
        onSuccess: () => {
          setNewComment('');
          setReplyingTo(null);
        },
      }
    );
  };

  // Handle editing a comment
  const handleEdit = (noteId, commentId, text) => {
    updateMutation.mutate({ noteId, commentId, text });
  };

  // Handle deleting a comment
  const handleDelete = (noteId, commentId) => {
    deleteMutation.mutate({ noteId, commentId });
  };

  // Handle liking a comment
  const handleLike = (noteId, commentId) => {
    if (!isAuthenticated) return;
    likeMutation.mutate({ noteId, commentId });
  };

  // Handle key press in comment input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 'Escape' && replyingTo) {
      handleCancelReply();
    }
  };

  if (!isExpanded) return null;

  return (
    <div className="border-t border-border mt-4 pt-4">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <SpinnerIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-sm text-red-500 py-2">
          Failed to load comments. Please try again.
        </div>
      )}

      {/* Comments List - Threaded */}
      {!isLoading && !error && (
        <div className="space-y-1">
          {groupedComments.map(({ comment, replies }) => (
            <div key={comment.id}>
              {/* Top-level comment */}
              <CommentCard
                comment={comment}
                noteId={noteId}
                onLike={handleLike}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReply={handleReply}
                currentUserId={user?.id}
                isAuthenticated={isAuthenticated}
              />
              {/* Replies */}
              {replies.map((reply) => (
                <CommentCard
                  key={reply.id}
                  comment={reply}
                  noteId={noteId}
                  onLike={handleLike}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReply={handleReply}
                  currentUserId={user?.id}
                  isAuthenticated={isAuthenticated}
                  isReply
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Comment Input */}
      <div className="mt-4">
        {isAuthenticated ? (
          <div>
            {/* Reply indicator */}
            {replyingTo && (
              <div className="flex items-center justify-between mb-2 px-2 py-1 bg-muted/50 rounded-lg text-sm">
                <span className="text-muted-foreground">
                  Replying to{' '}
                  <span className="font-medium text-foreground">
                    @{replyingTo.author.name}
                  </span>
                </span>
                <button
                  onClick={handleCancelReply}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Cancel reply"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-start space-x-3">
              {/* User Avatar */}
              <img
                src={user?.profile_picture_url || '/static/default-avatar.png'}
                alt={user?.first_name || 'You'}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />

              {/* Input and Submit */}
              <div className="flex-1 flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={replyingTo ? `Reply to @${replyingTo.author.name}...` : 'Write a comment...'}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-full text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={createMutation.isPending}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || createMutation.isPending}
                  className="p-2 text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send comment"
                >
                  {createMutation.isPending ? (
                    <SpinnerIcon className="h-5 w-5" />
                  ) : (
                    <SendIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            <a href="/login" className="text-primary hover:underline">
              Log in
            </a>{' '}
            to leave a comment
          </p>
        )}
      </div>
    </div>
  );
}
