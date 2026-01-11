/**
 * CommunityPage Component
 *
 * Main community page for sharing and discovering research notes.
 * Uses React Query for automatic caching and optimistic updates.
 *
 * Features:
 * - Search notes by title, content, or author name
 * - Filter notes by tags (NLP, Deep Learning, MLOps, etc.)
 * - Filter to view only bookmarked notes
 * - Create new notes with title, content, and tags
 * - Like/unlike notes (with optimistic updates)
 * - Bookmark/unbookmark notes for later (with optimistic updates)
 * - Delete own notes (with optimistic removal)
 * - View notes from specific users
 *
 * Caching Behavior:
 * - Notes cached for 2 minutes (staleTime)
 * - Like/bookmark updates appear instantly (optimistic)
 * - Failed actions automatically roll back
 * - Each filter combination creates a separate cache entry
 *
 * @component
 */

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import {
  useInfiniteNotes,
  useCreateNote,
  useLikeNote,
  useBookmarkNote,
  useDeleteNote,
  usePageTitle,
  useInfiniteScroll,
  useDelayedLoading,
} from '../hooks';

// UI Components
import {
  GradientButton,
  FeedItemList,
  CreateNoteModal,
} from '../components/ui';
import ConfirmationModal from '../components/ConfirmationModal';
import NoteCard from '../components/NoteCard';
import NotesFilter from '../components/NotesFilter';

// Icons
import {
  SearchIcon,
  PlusIcon,
  XIcon,
  FileTextIcon,
  BookmarkIcon,
} from '../components/icons';

/**
 * Available filter tags for categorizing notes
 */
const FILTER_TAGS = ['NLP', 'Deep Learning', 'MLOps', 'Computer Vision', 'Ethics'];

export default function CommunityPage() {
  /**
   * Authentication and URL State
   */
  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [searchParams, setSearchParams] = useSearchParams();

  /**
   * URL-derived State
   */
  const searchQuery = searchParams.get('search') || '';
  const filterUserId = searchParams.get('user') ? parseInt(searchParams.get('user')) : null;
  const tagFilter = searchParams.get('tag') || 'all';
  const bookmarkedFilter = searchParams.get('bookmarked') === 'true';

  /**
   * Data Fetching with React Query (Infinite Scroll)
   *
   * useInfiniteNotes() handles:
   * - Automatic caching (2 minute staleTime)
   * - Loading and error states
   * - Infinite scroll pagination
   * - Background refetching
   *
   * Different search/filter params create separate cache entries.
   */
  const queryParams = useMemo(() => {
    const params = {};
    if (searchQuery) params.search = searchQuery;
    if (filterUserId) params.user = filterUserId;
    if (tagFilter && tagFilter !== 'all') params.tag = tagFilter;
    if (bookmarkedFilter) params.bookmarked = true;
    return params;
  }, [searchQuery, filterUserId, tagFilter, bookmarkedFilter]);

  const {
    data,
    isLoading,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteNotes(queryParams);

  // Only show loading spinner if loading takes >200ms (prevents flash)
  const showLoading = useDelayedLoading(isLoading);

  // Extract and flatten notes from infinite query data
  const allNotes = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.notes || []);
  }, [data]);

  /**
   * Notes are already filtered by backend based on tagFilter from URL
   * No need for client-side filtering anymore
   */
  const notes = allNotes;

  /**
   * Infinite Scroll - Auto-load when user scrolls to bottom
   */
  const loadMoreRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  /**
   * Mutations with Optimistic Updates
   *
   * These mutations update the UI instantly, then sync with server.
   * If server request fails, changes are automatically rolled back.
   */
  const createNoteMutation = useCreateNote();
  const likeNoteMutation = useLikeNote();
  const bookmarkNoteMutation = useBookmarkNote();
  const deleteNoteMutation = useDeleteNote();

  /**
   * Create Note Modal State
   */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createNoteError, setCreateNoteError] = useState(null);

  /**
   * Delete Confirmation Modal State
   */
  const [noteToDelete, setNoteToDelete] = useState(null);

  // Set page title
  usePageTitle('Community Notes');

  /**
   * Handle Tag Filter Change
   *
   * Updates URL search params. React Query handles the refetch
   * automatically when queryParams changes.
   */
  function handleTagChange(newTag) {
    const newParams = new URLSearchParams(searchParams);
    if (newTag === 'all') {
      newParams.delete('tag');
    } else {
      newParams.set('tag', newTag);
    }
    // Clear bookmarked filter when switching to tag filter
    newParams.delete('bookmarked');
    setSearchParams(newParams);
  }

  /**
   * Handle Bookmarked Filter Toggle
   *
   * Updates URL search params to show only bookmarked notes.
   * React Query handles the refetch automatically when queryParams changes.
   */
  function handleBookmarkedToggle() {
    if (bookmarkedFilter) {
      // If already showing bookmarked, clear the filter
      setSearchParams({});
      setSearchInput('');
    } else {
      // Show only bookmarked notes (clear all other filters)
      setSearchParams({ bookmarked: 'true' });
      setSearchInput('');
    }
  }

  /**
   * Local search input state (for controlled input)
   */
  const [searchInput, setSearchInput] = useState(searchQuery);

  /**
   * Handle Search Form Submission
   *
   * Updates URL search params. React Query handles the refetch
   * automatically when queryParams changes.
   */
  function handleSearch(e) {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ search: searchInput.trim() });
    } else {
      setSearchParams({});
    }
  }

  /**
   * Clear Search/Filter
   *
   * Resets search query and user filter.
   */
  function clearFilters() {
    setSearchInput('');
    setSearchParams({});
  }

  /**
   * Open Create Note Modal
   */
  function openModal() {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setCreateNoteError(null);
    setIsModalOpen(true);
  }

  /**
   * Close Create Note Modal
   */
  function closeModal() {
    setIsModalOpen(false);
    setCreateNoteError(null);
  }

  /**
   * Handle Create Note Form Submission
   *
   * Uses React Query mutation with automatic cache invalidation.
   */
  function handleCreateNote(noteData) {
    setCreateNoteError(null);
    createNoteMutation.mutate(noteData, {
      onSuccess: () => {
        closeModal();
      },
      onError: (err) => {
        console.error('Error creating note:', err);
        setCreateNoteError('Failed to create note. Please try again.');
      },
    });
  }

  /**
   * Handle Like Button Click
   *
   * Uses React Query mutation with built-in optimistic updates.
   * The useLikeNote hook handles the UI update and rollback automatically.
   */
  function handleLike(noteId) {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    // Mutation handles optimistic update and rollback automatically
    likeNoteMutation.mutate(noteId);
  }

  /**
   * Handle Bookmark Button Click
   *
   * Uses React Query mutation with built-in optimistic updates.
   * The useBookmarkNote hook handles the UI update and rollback automatically.
   */
  function handleBookmark(noteId) {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    // Mutation handles optimistic update and rollback automatically
    bookmarkNoteMutation.mutate(noteId);
  }

  /**
   * Handle Delete Button Click
   *
   * Opens confirmation modal before deleting.
   */
  function handleDeleteClick(noteId) {
    setNoteToDelete(noteId);
  }

  /**
   * Confirm Delete Action
   *
   * Uses React Query mutation with optimistic removal.
   * If delete fails, the note is restored automatically.
   */
  function handleConfirmDelete() {
    if (noteToDelete) {
      deleteNoteMutation.mutate(noteToDelete);
      setNoteToDelete(null);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/*
        Page Header

        Includes title, description, search bar, and create note button.
      */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Community Notes</h1>

        {/* Conditional Description based on Filters */}
        {filterUserId ? (
          <div>
            <p className="text-muted-foreground text-lg mb-4">
              Showing all posts by{' '}
              <span className="font-semibold text-foreground">
                {notes[0]?.author?.name || 'User'}
              </span>
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center text-primary hover:text-primary/80 text-sm font-medium transition-colors mb-6"
            >
              <XIcon />
              <span className="ml-1">Clear filter and show all posts</span>
            </button>
          </div>
        ) : searchQuery ? (
          <div>
            <p className="text-muted-foreground text-lg mb-4">
              Search results for "<span className="font-semibold text-foreground">{searchQuery}</span>"
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center text-primary hover:text-primary/80 text-sm font-medium transition-colors mb-6"
            >
              <XIcon />
              <span className="ml-1">Clear search</span>
            </button>
          </div>
        ) : (
          <p className="text-muted-foreground text-lg mb-6">
            Discover and share knowledge with AI enthusiasts from universities worldwide
          </p>
        )}

        {/*
          Search Bar and Create Button Row
        */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search by author name or keyword..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </form>

          {/* Create Note Button */}
          <GradientButton onClick={openModal} icon={<PlusIcon />}>
            Share Your Notes
          </GradientButton>
        </div>
      </div>

      {/* Filter Section - Tags and Bookmarked */}
      <NotesFilter
        availableTags={FILTER_TAGS}
        selectedTag={bookmarkedFilter ? null : tagFilter}
        onTagChange={handleTagChange}
        isBookmarked={bookmarkedFilter}
        onBookmarkToggle={handleBookmarkedToggle}
        isAuthenticated={isAuthenticated}
      />

      {/* Notes List */}
      <FeedItemList
        items={notes}
        isLoading={showLoading}
        error={queryError}
        loadingText="Loading notes..."
        emptyIcon={bookmarkedFilter ? <BookmarkIcon className="h-12 w-12" /> : <FileTextIcon className="h-12 w-12" />}
        emptyTitle={
          searchQuery
            ? 'No results found'
            : bookmarkedFilter
              ? 'No bookmarked notes yet'
              : 'No posts yet'
        }
        emptyDescription={
          searchQuery
            ? `No posts match your search for "${searchQuery}". Try a different keyword or author name.`
            : bookmarkedFilter
              ? 'Start bookmarking notes you want to save for later. Click the bookmark icon on any note to add it to your collection.'
              : filterUserId
                ? "This user hasn't created any posts yet."
                : 'There are no posts in the community yet. Be the first to share!'
        }
        emptyAction={
          (filterUserId || searchQuery || bookmarkedFilter)
            ? { label: 'View all community posts', onClick: bookmarkedFilter ? handleBookmarkedToggle : clearFilters }
            : undefined
        }
        renderItem={(note) => (
          <NoteCard
            key={note.id}
            note={note}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onDelete={handleDeleteClick}
            currentUserId={user?.id}
            isAuthenticated={isAuthenticated}
          />
        )}
      />

      {/* Infinite Scroll Sentinel - Triggers load when scrolled into view */}
      {hasNextPage && (
        <div
          ref={loadMoreRef}
          className="flex justify-center items-center py-8"
        >
          {isFetchingNextPage && (
            <div className="text-muted-foreground text-sm">
              Loading more notes...
            </div>
          )}
        </div>
      )}

      {/* Create Note Modal */}
      <CreateNoteModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onCreate={handleCreateNote}
        isCreating={createNoteMutation.isPending}
        userUniversity={user?.university}
        error={createNoteError}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={noteToDelete !== null}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
