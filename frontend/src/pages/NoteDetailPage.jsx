/**
 * NoteDetailPage Component
 *
 * Detail page for viewing a single note/post.
 * Displays the full note with comments section expanded by default.
 *
 * Features:
 * - Full note content
 * - Comments section (always expanded)
 * - Share functionality
 * - Like/bookmark/delete actions
 * - Back navigation
 *
 * @component
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import {
  useNote,
  useLikeNote,
  useBookmarkNote,
  useDeleteNote,
  usePageTitle,
} from '../hooks';

// UI Components
import { LoadingState, ErrorState } from '../components/ui';
import { NoteCard } from '../components/community';
import { ArrowLeftIcon } from '../components/icons';

export default function NoteDetailPage() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.permissionLevel >= 1;
  const { openAuthModal } = useAuthModal();

  // Data fetching
  const {
    data: note,
    isLoading,
    error: fetchError,
  } = useNote(parseInt(noteId));

  // Mutations
  const likeNoteMutation = useLikeNote();
  const bookmarkNoteMutation = useBookmarkNote();
  const deleteNoteMutation = useDeleteNote();

  // Page title
  usePageTitle(note?.title || 'Note');

  // Handlers
  const handleLike = (id) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    likeNoteMutation.mutate(id);
  };

  const handleBookmark = (id) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    bookmarkNoteMutation.mutate(id);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      deleteNoteMutation.mutate(id, {
        onSuccess: () => {
          navigate('/community');
        },
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingState text="Loading note..." />
      </div>
    );
  }

  // Error state (note not found or other error)
  if (fetchError || !note) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          message={fetchError?.message || 'Note not found'}
          backLink={{
            to: '/community',
            label: 'Back to Community',
          }}
        />
      </div>
    );
  }

  // Render note
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        to="/community"
        className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-2" />
        <span className="font-medium">Back to Community</span>
      </Link>

      {/* Note Card */}
      <NoteCard
        note={note}
        onLike={handleLike}
        onBookmark={handleBookmark}
        onDelete={handleDelete}
        currentUserId={user?.id}
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        initialCommentsExpanded={false}
      />
    </div>
  );
}

