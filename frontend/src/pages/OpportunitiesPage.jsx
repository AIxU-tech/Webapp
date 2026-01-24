/**
 * OpportunitiesPage Component
 *
 * Main page for viewing and posting job/project opportunities.
 * Uses React Query for caching and optimistic updates.
 *
 * Features:
 * - Search opportunities by title, description, or author
 * - Filter by location (Remote, Hybrid, On-site)
 * - Filter by compensation (Paid, Unpaid)
 * - Filter to show only your university's opportunities
 * - Create new opportunities with optional compensation and university-only visibility
 * - Bookmark opportunities for later
 * - Message opportunity posters directly
 */

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import {
  useInfiniteOpportunities,
  useCreateOpportunity,
  useBookmarkOpportunity,
  useDeleteOpportunity,
  useInfiniteScroll,
  usePageTitle,
  prefetchInfiniteOpportunities,
} from '../hooks';

import {
  TagSelector,
  GradientButton,
  FeedItemList,
  ToggleTag,
  TagGroup,
  ConfirmationModal,
} from '../components/ui';
import ConversationModal from '../components/messages/ConversationModal';
import { OpportunityCard } from '../components/opportunities';
import { CreateOpportunityModal } from '../components/opportunities';

import {
  SearchIcon,
  PlusIcon,
  XIcon,
  OpportunitiesIcon,
  BookmarkIcon,
} from '../components/icons';

// Location type tags (mutually exclusive)
const LOCATION_TAGS = ['Remote', 'Hybrid', 'On-site'];

// Optional category tags for opportunities
const CATEGORY_TAGS = ['Project', 'Research', 'Startup', 'Hackathon'];

export default function OpportunitiesPage() {
  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // URL-derived state
  const searchQuery = searchParams.get('search') || '';
  const locationFilter = searchParams.get('location') || '';
  const paidFilter = searchParams.get('paid') || '';
  const myUniversity = searchParams.get('myUniversity') === 'true';
  const tagFilter = searchParams.get('tag') || 'all';
  const bookmarkedFilter = searchParams.get('bookmarked') === 'true';

  // Build query params for API
  const queryParams = useMemo(() => {
    const params = {};
    if (searchQuery) params.search = searchQuery;
    if (locationFilter) params.location = locationFilter;
    if (paidFilter) params.paid = paidFilter;
    if (myUniversity) params.myUniversity = 'true';
    if (tagFilter && tagFilter !== 'all') params.tag = tagFilter;
    if (bookmarkedFilter) params.bookmarked = true;
    return params;
  }, [searchQuery, locationFilter, paidFilter, myUniversity, tagFilter, bookmarkedFilter]);

  // Fetch opportunities with infinite scroll
  const {
    data,
    isLoading: loading,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteOpportunities(queryParams);

  // Extract and flatten opportunities from infinite query data
  const opportunities = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.opportunities || []);
  }, [data]);

  // Mutations
  const createOpportunityMutation = useCreateOpportunity();
  const bookmarkOpportunityMutation = useBookmarkOpportunity();
  const deleteOpportunityMutation = useDeleteOpportunity();

  // Infinite scroll - Auto-load when user scrolls to bottom
  const loadMoreRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Delete modal state
  const [opportunityToDelete, setOpportunityToDelete] = useState(null);

  // Message modal state - tracks which user to open chat with
  const [messageUserId, setMessageUserId] = useState(null);

  // Search input state
  const [searchInput, setSearchInput] = useState(searchQuery);

  usePageTitle('Opportunities');

  // Opportunities are already filtered by backend based on tagFilter from URL
  // No need for client-side filtering anymore
  const filteredOpportunities = opportunities;

  // Check if any filters are active
  const hasActiveFilters = searchQuery || locationFilter || paidFilter || myUniversity || (tagFilter && tagFilter !== 'all') || bookmarkedFilter;

  /**
   * Prefetch on Hover - Start loading data before user clicks
   */
  const handleBookmarkHover = () => {
    if (isAuthenticated) {
      prefetchInfiniteOpportunities(queryClient, { bookmarked: true });
    }
  };

  const handleCategoryTagHover = (tag) => {
    prefetchInfiniteOpportunities(queryClient, { tag });
  };

  const handleLocationHover = (location) => {
    prefetchInfiniteOpportunities(queryClient, { location });
  };

  const handlePaidHover = (paid) => {
    prefetchInfiniteOpportunities(queryClient, { paid });
  };

  const handleMyUniversityHover = () => {
    if (isAuthenticated) {
      prefetchInfiniteOpportunities(queryClient, { myUniversity: 'true' });
    }
  };

  function handleSearch(e) {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('search', searchInput.trim());
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  }

  function clearFilters() {
    setSearchInput('');
    setSearchParams({});
  }

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
   * Updates URL search params to show only bookmarked opportunities.
   * React Query handles the refetch automatically when queryParams changes.
   */
  function handleBookmarkedToggle() {
    if (bookmarkedFilter) {
      // If already showing bookmarked, clear the filter
      setSearchParams({});
      setSearchInput('');
    } else {
      // Show only bookmarked opportunities (clear all other filters)
      setSearchParams({ bookmarked: 'true' });
      setSearchInput('');
    }
  }

  function toggleLocationFilter(location) {
    const newParams = new URLSearchParams(searchParams);
    if (locationFilter === location) {
      newParams.delete('location');
    } else {
      newParams.set('location', location);
    }
    // Clear tag and bookmarked filters when toggling location
    newParams.delete('tag');
    newParams.delete('bookmarked');
    setSearchParams(newParams);
  }

  function togglePaidFilter(paid) {
    const newParams = new URLSearchParams(searchParams);
    if (paidFilter === paid) {
      newParams.delete('paid');
    } else {
      newParams.set('paid', paid);
    }
    // Clear tag and bookmarked filters when toggling paid status
    newParams.delete('tag');
    newParams.delete('bookmarked');
    setSearchParams(newParams);
  }

  function toggleMyUniversity() {
    const newParams = new URLSearchParams(searchParams);
    if (myUniversity) {
      newParams.delete('myUniversity');
    } else {
      newParams.set('myUniversity', 'true');
    }
    // Clear tag and bookmarked filters when toggling my university
    newParams.delete('tag');
    newParams.delete('bookmarked');
    setSearchParams(newParams);
  }

  function openModal() {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setCreateError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setCreateError(null);
  }

  function handleCreateOpportunity(opportunityData) {
    setCreateError(null);
    createOpportunityMutation.mutate(opportunityData, {
      onSuccess: () => {
        closeModal();
      },
      onError: (err) => {
        console.error('Error creating opportunity:', err);
        setCreateError('Failed to create opportunity. Please try again.');
      },
    });
  }

  function handleBookmark(opportunityId) {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    bookmarkOpportunityMutation.mutate(opportunityId);
  }

  function handleDeleteClick(opportunityId) {
    setOpportunityToDelete(opportunityId);
  }

  function handleConfirmDelete() {
    if (opportunityToDelete) {
      deleteOpportunityMutation.mutate(opportunityToDelete);
      setOpportunityToDelete(null);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Opportunities</h1>
        <p className="text-muted-foreground text-lg mb-6">
          Find projects, research positions, and collaboration opportunities
        </p>

        {/* Search and Create */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Search opportunities..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </form>

          <GradientButton onClick={openModal} icon={<PlusIcon />}>
            Post Opportunity
          </GradientButton>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Location Filters */}
          <TagGroup>
            {LOCATION_TAGS.map(loc => (
              <ToggleTag
                key={loc}
                selected={locationFilter === loc}
                onClick={() => toggleLocationFilter(loc)}
                onMouseEnter={() => handleLocationHover(loc)}
              >
                {loc}
              </ToggleTag>
            ))}
          </TagGroup>

          <div className="h-6 w-px bg-border" />

          {/* Paid/Unpaid Filters */}
          <TagGroup>
            <ToggleTag
              selected={paidFilter === 'true'}
              onClick={() => togglePaidFilter('true')}
              onMouseEnter={() => handlePaidHover('true')}
              variant="success"
            >
              Paid
            </ToggleTag>
            <ToggleTag
              selected={paidFilter === 'false'}
              onClick={() => togglePaidFilter('false')}
              onMouseEnter={() => handlePaidHover('false')}
              variant="secondary"
            >
              Unpaid
            </ToggleTag>
          </TagGroup>

          <div className="h-6 w-px bg-border" />

          {/* My University Toggle */}
          {isAuthenticated && (
            <ToggleTag
              selected={myUniversity}
              onClick={toggleMyUniversity}
              onMouseEnter={handleMyUniversityHover}
            >
              My University
            </ToggleTag>
          )}
          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors ml-auto"
            >
              <XIcon className="h-4 w-4 mr-1" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Additional Tag Filter and Bookmarked Button */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Tag Filter */}
          <div className="flex-1">
            <TagSelector
              tags={CATEGORY_TAGS}
              selected={bookmarkedFilter ? null : tagFilter}
              onChange={handleTagChange}
              onHover={handleCategoryTagHover}
              showAll
              allLabel="All Categories"
            />
          </div>

          {/* Bookmarked Filter Button - Only show when authenticated */}
          {isAuthenticated && (
            <button
              onClick={handleBookmarkedToggle}
              onMouseEnter={handleBookmarkHover}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
                ${bookmarkedFilter
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-card text-muted-foreground border border-border hover:border-primary hover:text-primary'
                }
              `}
              aria-label={bookmarkedFilter ? 'Show all opportunities' : 'Show bookmarked opportunities'}
            >
              <BookmarkIcon className="h-5 w-5" filled={bookmarkedFilter} />
              <span>Bookmarked</span>
            </button>
          )}
        </div>
      </div>

      {/* Opportunities List */}
      <FeedItemList
        items={filteredOpportunities}
        isLoading={loading}
        error={queryError}
        loadingText="Loading opportunities..."
        emptyIcon={bookmarkedFilter ? <BookmarkIcon className="h-12 w-12" /> : <OpportunitiesIcon className="h-12 w-12" />}
        emptyTitle={
          searchQuery
            ? 'No results found'
            : bookmarkedFilter
              ? 'No bookmarked opportunities yet'
              : hasActiveFilters
                ? 'No opportunities found'
                : 'No opportunities yet'
        }
        emptyDescription={
          searchQuery
            ? `No opportunities match your search for "${searchQuery}". Try a different keyword or author name.`
            : bookmarkedFilter
              ? 'Start bookmarking opportunities you want to save for later. Click the bookmark icon on any opportunity to add it to your collection.'
              : hasActiveFilters
                ? 'Try adjusting your filters or search terms.'
                : 'Be the first to post an opportunity!'
        }
        emptyAction={
          (searchQuery || (hasActiveFilters && !bookmarkedFilter))
            ? { label: 'Clear filters', onClick: clearFilters }
            : bookmarkedFilter
              ? { label: 'View all opportunities', onClick: handleBookmarkedToggle }
              : undefined
        }
        renderItem={(opp) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            onBookmark={handleBookmark}
            onDelete={handleDeleteClick}
            onMessageUser={setMessageUserId}
            currentUserId={user?.id}
            isAuthenticated={isAuthenticated}
            isSiteAdmin={user?.permissionLevel >= 1}
          />
        )}
      />

      {/* Infinite scroll trigger */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="py-4 text-center text-muted-foreground">
          {isFetchingNextPage ? 'Loading more...' : ''}
        </div>
      )}

      {/* Create Opportunity Modal */}
      <CreateOpportunityModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onCreate={handleCreateOpportunity}
        isCreating={createOpportunityMutation.isPending}
        error={createError}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={opportunityToDelete !== null}
        onClose={() => setOpportunityToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Opportunity"
        message="Are you sure you want to delete this opportunity? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* Inline Message Modal - opens chat without leaving the page */}
      <ConversationModal
        userId={messageUserId}
        isOpen={messageUserId !== null}
        onClose={() => setMessageUserId(null)}
      />
    </div>
  );
}
