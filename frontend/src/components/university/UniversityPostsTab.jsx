/**
 * UniversityPostsTab
 *
 * Displays posts from university members using the notes API.
 * Uses infinite scroll pagination to load all posts for the university.
 */

import { useState, useMemo } from 'react';
import { useInfiniteNotes, useLikeNote, useBookmarkNote, useDeleteNote, useInfiniteScroll } from '../../hooks';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { NoteCard } from '../community';
import { LoadingState, EmptyState, ConfirmationModal } from '../ui';
import { FileTextIcon } from '../icons';

export default function UniversityPostsTab({
  universityId,
  currentUserId,
  isAuthenticated,
}) {
  const { openAuthModal } = useAuthModal();
  const [noteToDelete, setNoteToDelete] = useState(null);

  // Fetch notes for this university with infinite scroll
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteNotes({ university_id: universityId });

  // Flatten all pages into a single array of notes
  const notes = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.notes || []);
  }, [data]);

  // Mutation hooks for interactions
  const likeMutation = useLikeNote();
  const bookmarkMutation = useBookmarkNote();
  const deleteMutation = useDeleteNote();

  // Infinite scroll
  const loadMoreRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  // Handle like action
  const handleLike = (noteId) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    likeMutation.mutate(noteId);
  };

  // Handle bookmark action
  const handleBookmark = (noteId) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    bookmarkMutation.mutate(noteId);
  };

  // Handle delete action - opens confirmation modal
  const handleDelete = (noteId) => {
    setNoteToDelete(noteId);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (noteToDelete) {
      deleteMutation.mutate(noteToDelete);
      setNoteToDelete(null);
    }
  };

  // Loading state (initial load or loading more)
  if (isLoading && notes.length === 0) {
    return <LoadingState text="Loading posts..." />;
  }

  // Error state
  if (error) {
    return (
      <EmptyState
        icon={<FileTextIcon className="h-12 w-12" />}
        title="Failed to load posts"
        description="There was an error loading posts. Please try again."
      />
    );
  }

  // Empty state
  if (!isLoading && notes.length === 0) {
    return (
      <EmptyState
        icon={<FileTextIcon className="h-12 w-12" />}
        title="No posts yet"
        description="Members haven't shared any posts yet. Be the first!"
      />
    );
  }

  // Render posts
  return (
    <>
      <div className="space-y-4">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onDelete={handleDelete}
            currentUserId={currentUserId}
            isAuthenticated={isAuthenticated}
          />
        ))}

        {/* Infinite Scroll Sentinel */}
        {hasNextPage && (
          <div
            ref={loadMoreRef}
            className="flex justify-center items-center py-8"
          >
            {isFetchingNextPage && (
              <div className="text-muted-foreground text-sm">
                Loading more posts...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={noteToDelete !== null}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
