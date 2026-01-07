/**
 * UniversityPostsTab
 *
 * Displays posts from university members using the notes API.
 * Uses infinite scroll pagination to load all posts for the university.
 */

import { useMemo } from 'react';
import { useInfiniteNotes, useLikeNote, useBookmarkNote, useDeleteNote } from '../../hooks';
import NoteCard from '../NoteCard';
import { LoadingState, EmptyState } from '../ui';
import { FileTextIcon } from '../icons';

export default function UniversityPostsTab({
  universityId,
  currentUserId,
  isAuthenticated,
}) {
  // Fetch notes for this university with infinite scroll
  const {
    data,
    isLoading,
    error,
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

  // Handle like action
  const handleLike = (noteId) => {
    if (!isAuthenticated) {
      alert('Please log in to like posts');
      return;
    }
    likeMutation.mutate(noteId);
  };

  // Handle bookmark action
  const handleBookmark = (noteId) => {
    if (!isAuthenticated) {
      alert('Please log in to bookmark posts');
      return;
    }
    bookmarkMutation.mutate(noteId);
  };

  // Handle delete action
  const handleDelete = (noteId) => {
    if (confirm('Are you sure you want to delete this post?')) {
      deleteMutation.mutate(noteId);
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
    </div>
  );
}
