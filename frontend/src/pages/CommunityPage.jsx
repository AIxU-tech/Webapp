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

import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  useNotes,
  useCreateNote,
  useLikeNote,
  useBookmarkNote,
  useDeleteNote,
  usePageTitle,
} from '../hooks';
import {
  SearchIcon,
  PlusIcon,
  XIcon,
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  BookmarkIcon,
  TrashIcon,
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
  const [searchParams, setSearchParams] = useSearchParams();

  /**
   * URL-derived State
   */
  const searchQuery = searchParams.get('search') || '';
  const filterUserId = searchParams.get('user') ? parseInt(searchParams.get('user')) : null;

  /**
   * Data Fetching with React Query
   *
   * useNotes() handles:
   * - Automatic caching (2 minute staleTime)
   * - Loading and error states
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
    data: notes = [],
    isLoading: loading,
    error: queryError,
  } = useNotes(queryParams);

  const error = queryError?.message || null;

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
   * Local UI State
   */
  const [selectedTag, setSelectedTag] = useState('all');

  /**
   * Create Note Modal State
   */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [selectedCreateTags, setSelectedCreateTags] = useState([]);

  // Set page title
  usePageTitle('Community Notes');

  /**
   * Apply Tag Filter to Notes
   *
   * Memoized filtering based on selected tag.
   */
  const filteredNotes = useMemo(() => {
    if (selectedTag === 'all') {
      return notes;
    }
    return notes.filter(note => note.tags && note.tags.includes(selectedTag));
  }, [selectedTag, notes]);

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
      alert('Please log in to create notes');
      return;
    }
    setIsModalOpen(true);
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close Create Note Modal
   *
   * Resets form fields and restores scrolling.
   */
  function closeModal() {
    setIsModalOpen(false);
    setNoteTitle('');
    setNoteContent('');
    setSelectedCreateTags([]);
    // Restore background scrolling
    document.body.style.overflow = '';
  }

  /**
   * Toggle Tag Selection in Create Modal
   *
   * Adds or removes tags from the selected tags array.
   */
  function toggleCreateTag(tag) {
    if (selectedCreateTags.includes(tag)) {
      setSelectedCreateTags(selectedCreateTags.filter(t => t !== tag));
    } else {
      setSelectedCreateTags([...selectedCreateTags, tag]);
    }
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
      alert('Please log in to like notes');
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
   * Uses React Query mutation with optimistic removal.
   * If delete fails, the note is restored automatically.
   */
  function handleDelete(noteId) {
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return;
    }

    // Mutation handles optimistic removal and rollback automatically
    deleteNoteMutation.mutate(noteId);
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
          <button
            onClick={openModal}
            className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-[hsl(220,85%,60%)]/30 transition-all duration-200 whitespace-nowrap inline-flex items-center"
          >
            <PlusIcon />
            <span className="ml-2">Share Your Notes</span>
          </button>
        </div>
      </div>

      {/*
        Filter Tags

        Clickable tags to filter notes by category.
      */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          {/* All Notes Tag */}
          <button
            onClick={() => setSelectedTag('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedTag === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            All Notes
          </button>

          {/* Category Tags */}
          {FILTER_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedTag === tag
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/*
        Notes Grid

        Displays all notes or empty state.
      */}
      <div className="space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading notes...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <button
              onClick={loadNotes}
              className="text-primary hover:text-primary/80 font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredNotes.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block p-4 bg-muted/30 rounded-full mb-4">
              <div className="text-muted-foreground">
                <FileTextIcon />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {searchQuery ? 'No results found' : 'No posts yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? `No posts match your search for "${searchQuery}". Try a different keyword or author name.`
                : filterUserId
                ? "This user hasn't created any posts yet."
                : 'There are no posts in the community yet. Be the first to share!'}
            </p>
            {(filterUserId || searchQuery) && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center text-primary hover:text-primary/80 font-medium"
              >
                View all community posts
              </button>
            )}
          </div>
        )}

        {/* Notes List */}
        {!loading && !error && filteredNotes.map(note => (
          <div
            key={note.id}
            className="bg-card border border-border rounded-lg p-6 shadow-card hover:shadow-hover transition-all duration-200"
          >
            {/*
              Note Header

              Author info, timestamp, and delete button (if owns note).
            */}
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
                {isAuthenticated && user && note.author.id === user.id && (
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                    title="Delete note"
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
                  <span
                    key={tag}
                    className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/*
              Note Actions

              Like, comment, share, and bookmark buttons.
              Larger icons (h-6 w-6) and padding for better click targets.
            */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              {/* Left Actions */}
              <div className="flex items-center space-x-2">
                {/* Like Button */}
                <button
                  onClick={() => handleLike(note.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    note.isLiked
                      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <HeartIcon filled={note.isLiked} />
                  <span className="font-medium">{note.likes}</span>
                </button>

                {/* Comment Button (placeholder) */}
                <button className="flex items-center space-x-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200">
                  <MessageCircleIcon />
                  <span className="font-medium">{note.comments}</span>
                </button>

                {/* Share Button (placeholder) */}
                <button className="flex items-center space-x-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200">
                  <ShareIcon />
                  <span className="font-medium">Share</span>
                </button>
              </div>

              {/* Bookmark Button */}
              <button
                onClick={() => handleBookmark(note.id)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  note.isBookmarked
                    ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <BookmarkIcon filled={note.isBookmarked} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/*
        Create Note Modal

        Modal dialog for creating a new research note.
        Only visible when isModalOpen is true.
      */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-[2px]"
          onClick={(e) => {
            // Close modal when clicking outside
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-xl font-semibold text-foreground">Creating a note</h3>
              <button
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            {/* User Info */}
            {user && (
              <div className="px-6 pt-4 pb-2 border-b border-border">
                <div className="flex items-center space-x-3">
                  <img
                    src={user.avatar || '/static/default-avatar.png'}
                    alt={user.first_name || user.username}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.username}
                    </h4>
                    <p className="text-sm text-muted-foreground">Post to Anyone</p>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleCreateNote} className="p-6">
              {/* Title Input */}
              <div className="mb-4">
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

                {/* Selected Tags Display */}
                {selectedCreateTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedCreateTags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Tag Options */}
                <div className="flex flex-wrap gap-2">
                  {CREATE_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleCreateTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm border border-border transition-colors ${
                        selectedCreateTags.includes(tag)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button Row */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                {/* Character Count */}
                <div className="text-sm text-muted-foreground flex items-center">
                  <ClockIcon />
                  <span className="ml-1">{charCount} characters</span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={createNoteMutation.isPending}
                  className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-6 py-2 rounded-lg hover:shadow-lg hover:shadow-[hsl(220,85%,60%)]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createNoteMutation.isPending ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
