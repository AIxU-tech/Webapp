/**
 * CommunityPage Component
 *
 * Main community page for sharing and discovering research notes.
 * Uses React Query for automatic caching and optimistic updates.
 *
 * Features:
 * - Search notes by title, content, or author name
 * - Filter notes by tags (NLP, Deep Learning, MLOps, etc.)
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
 *
 * @component
 */

import { useState, useMemo, useRef, useEffect } from 'react';
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
} from '../hooks';

// UI Components
import {
  BaseModal,
  TagSelector,
  GradientButton,
  FeedItemList,
} from '../components/ui';
import ConfirmationModal from '../components/ConfirmationModal';
import NoteCard from '../components/NoteCard';

// Icons
import {
  SearchIcon,
  PlusIcon,
  XIcon,
  FileTextIcon,
  ClockIcon,
} from '../components/icons';

/**
 * Available filter tags for categorizing notes
 */
const FILTER_TAGS = ['NLP', 'Deep Learning', 'MLOps', 'Computer Vision', 'Ethics'];

/**
 * Available tags for creating notes (includes all filter tags plus more)
 */
const CREATE_TAGS = [
  'NLP',
  'Deep Learning',
  'MLOps',
  'Computer Vision',
  'Ethics',
  'Research',
  'Tutorial',
  'Best Practices'
];

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
    return params;
  }, [searchQuery, filterUserId]);

  const {
    data,
    isLoading: loading,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteNotes(queryParams);

  // Extract and flatten notes from infinite query data
  const allNotes = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => {
      // Handle paginated response format
      if (page && typeof page === 'object' && 'pagination' in page) {
        return Array.isArray(page.notes) ? page.notes : [];
      }
      // Handle non-paginated response format (backward compatible)
      return Array.isArray(page) ? page : [];
    });
  }, [data]);

  /**
   * Local UI State - Tag Filter
   */
  const [selectedTag, setSelectedTag] = useState('all');

  /**
   * Apply Tag Filter to Notes
   *
   * Memoized filtering based on selected tag.
   */
  const notes = useMemo(() => {
    if (selectedTag === 'all') {
      return allNotes;
    }
    return allNotes.filter(note => note.tags && note.tags.includes(selectedTag));
  }, [selectedTag, allNotes]);

  /**
   * Infinite Scroll - Auto-load when user scrolls to bottom
   */
  const loadMoreRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        // When the sentinel element is visible and there's more to load
        if (firstEntry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        // Trigger when sentinel is 200px from viewport
        rootMargin: '200px',
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [selectedCreateTags, setSelectedCreateTags] = useState([]);
  const [universityOnly, setUniversityOnly] = useState(false);

  /**
   * Delete Confirmation Modal State
   */
  const [noteToDelete, setNoteToDelete] = useState(null);

  // Set page title
  usePageTitle('Community Notes');

  /**
   * Notes are already filtered by backend based on selectedTag
   * No need for client-side filtering anymore
   */
  const filteredNotes = notes;

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
    setIsModalOpen(true);
  }

  /**
   * Close Create Note Modal
   *
   * Resets form fields. BaseModal handles scroll lock automatically.
   */
  function closeModal() {
    setIsModalOpen(false);
    setNoteTitle('');
    setNoteContent('');
    setSelectedCreateTags([]);
    setUniversityOnly(false);
  }

  /**
   * Handle Create Note Form Submission
   *
   * Uses React Query mutation with automatic cache invalidation.
   */
  async function handleCreateNote(e) {
    e.preventDefault();

    if (!noteTitle.trim() || !noteContent.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    createNoteMutation.mutate(
      {
        title: noteTitle.trim(),
        content: noteContent.trim(),
        tags: selectedCreateTags,
        universityOnly,
      },
      {
        onSuccess: () => {
          // Close modal and reset form
          closeModal();
        },
        onError: (err) => {
          console.error('Error creating note:', err);
          alert('Failed to create note. Please try again.');
        },
      }
    );
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
      alert('Please log in to bookmark notes');
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

  /**
   * Calculate Character Count for Create Modal
   */
  const charCount = noteTitle.length + noteContent.length;

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

      {/* Filter Tags - Filter notes by category */}
      <div className="mb-8">
        <TagSelector
          tags={FILTER_TAGS}
          selected={selectedTag}
          onChange={setSelectedTag}
          showAll
          allLabel="All Notes"
        />
      </div>

      {/* Notes List */}
      <FeedItemList
        items={filteredNotes}
        isLoading={loading}
        error={queryError}
        loadingText="Loading notes..."
        emptyIcon={<FileTextIcon className="h-12 w-12" />}
        emptyTitle={searchQuery ? 'No results found' : 'No posts yet'}
        emptyDescription={
          searchQuery
            ? `No posts match your search for "${searchQuery}". Try a different keyword or author name.`
            : filterUserId
              ? "This user hasn't created any posts yet."
              : 'There are no posts in the community yet. Be the first to share!'
        }
        emptyAction={
          (filterUserId || searchQuery)
            ? { label: 'View all community posts', onClick: clearFilters }
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

      {/*
        Create Note Modal

        Uses BaseModal for consistent behavior (ESC key, scroll lock, click outside).
      */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Creating a note"
        size="2xl"
      >
        {/* Create Note Form */}
        <form onSubmit={handleCreateNote} className="p-6">
          {/* Title Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
            <input
              type="text"
              placeholder="Title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              required
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Content Textarea */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">Content *</label>
            <textarea
              placeholder="What do you want to talk about?"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              required
              rows={6}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Tags Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
            <TagSelector
              tags={CREATE_TAGS}
              selected={selectedCreateTags}
              onChange={setSelectedCreateTags}
              multiple
            />
          </div>

          {/* University Only Toggle */}
          {user?.university && (
            <div className="mb-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={universityOnly}
                  onChange={(e) => setUniversityOnly(e.target.checked)}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                />
                <span className="ml-2 text-sm text-foreground">
                  Only visible to members of my university
                </span>
              </label>
            </div>
          )}

          {/* Submit Button Row */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            {/* Character Count */}
            <div className="text-sm text-muted-foreground flex items-center">
              <ClockIcon />
              <span className="ml-1">{charCount} characters</span>
            </div>

            {/* Submit Button */}
            <GradientButton
              type="submit"
              size="sm"
              loading={createNoteMutation.isPending}
              loadingText="Posting..."
            >
              Post
            </GradientButton>
          </div>
        </form>
      </BaseModal>

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
