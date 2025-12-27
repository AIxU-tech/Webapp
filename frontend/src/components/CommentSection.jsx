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
 * - Login prompt for unauthenticated users
 *
 * @component
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useLikeComment,
} from '../hooks';
import CommentCard from './CommentCard';
import { SpinnerIcon, SendIcon } from './icons';

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

  // Fetch comments only when expanded
  const {
    data: comments = [],
    isLoading,
    error,
  } = useComments(noteId, { enabled: isExpanded });

  // Mutations
  const createMutation = useCreateComment();
  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();
  const likeMutation = useLikeComment();

  // Handle submitting a new comment
  const handleSubmit = (e) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text || !isAuthenticated) return;

    createMutation.mutate(
      { noteId, text, user },
      {
        onSuccess: () => {
          setNewComment('');
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

      {/* Comments List */}
      {!isLoading && !error && (
        <div className="space-y-1">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              noteId={noteId}
              onLike={handleLike}
              onEdit={handleEdit}
              onDelete={handleDelete}
              currentUserId={user?.id}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}

      {/* Comment Input */}
      <div className="mt-4">
        {isAuthenticated ? (
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
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a comment..."
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

