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
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import {
  useOpportunities,
  useCreateOpportunity,
  useBookmarkOpportunity,
  useDeleteOpportunity,
  usePageTitle,
} from '../hooks';

import {
  BaseModal,
  TagSelector,
  GradientButton,
  FeedItemList,
} from '../components/ui';
import { ToggleTag, TagGroup } from '../components/ui/Tag';
import ConfirmationModal from '../components/ConfirmationModal';
import ConversationModal from '../components/messages/ConversationModal';
import OpportunityCard from '../components/OpportunityCard';

import {
  SearchIcon,
  PlusIcon,
  XIcon,
  OpportunitiesIcon,
  ClockIcon,
} from '../components/icons';

// Location type tags (mutually exclusive)
const LOCATION_TAGS = ['Remote', 'Hybrid', 'On-site'];

// Compensation tags (mutually exclusive)
const COMPENSATION_TAGS = ['Paid', 'Unpaid'];

// Optional category tags for opportunities
const CATEGORY_TAGS = ['Project', 'Research', 'Startup', 'Hackathon'];

export default function OpportunitiesPage() {
  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-derived state
  const searchQuery = searchParams.get('search') || '';
  const locationFilter = searchParams.get('location') || '';
  const paidFilter = searchParams.get('paid') || '';
  const myUniversity = searchParams.get('myUniversity') === 'true';

  // Build query params for API
  const queryParams = useMemo(() => {
    const params = {};
    if (searchQuery) params.search = searchQuery;
    if (locationFilter) params.location = locationFilter;
    if (paidFilter) params.paid = paidFilter;
    if (myUniversity) params.myUniversity = 'true';
    return params;
  }, [searchQuery, locationFilter, paidFilter, myUniversity]);

  // Fetch opportunities
  const {
    data: opportunities = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useOpportunities(queryParams);

  // Mutations
  const createOpportunityMutation = useCreateOpportunity();
  const bookmarkOpportunityMutation = useBookmarkOpportunity();
  const deleteOpportunityMutation = useDeleteOpportunity();

  // Local filter state for tags (client-side filtering)
  const [selectedTag, setSelectedTag] = useState('all');

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [compensation, setCompensation] = useState('');
  const [universityOnly, setUniversityOnly] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isPaid, setIsPaid] = useState(null); // null = not selected, true = paid, false = unpaid
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Delete modal state
  const [opportunityToDelete, setOpportunityToDelete] = useState(null);

  // Message modal state - tracks which user to open chat with
  const [messageUserId, setMessageUserId] = useState(null);

  // Search input state
  const [searchInput, setSearchInput] = useState(searchQuery);

  usePageTitle('Opportunities');

  // Apply client-side tag filtering
  const filteredOpportunities = useMemo(() => {
    if (selectedTag === 'all') return opportunities;
    return opportunities.filter(opp => opp.tags && opp.tags.includes(selectedTag));
  }, [selectedTag, opportunities]);

  // Check if any filters are active
  const hasActiveFilters = searchQuery || locationFilter || paidFilter || myUniversity;

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
    setSelectedTag('all');
  }

  function toggleLocationFilter(location) {
    const newParams = new URLSearchParams(searchParams);
    if (locationFilter === location) {
      newParams.delete('location');
    } else {
      newParams.set('location', location);
    }
    setSearchParams(newParams);
  }

  function togglePaidFilter(paid) {
    const newParams = new URLSearchParams(searchParams);
    if (paidFilter === paid) {
      newParams.delete('paid');
    } else {
      newParams.set('paid', paid);
    }
    setSearchParams(newParams);
  }

  function toggleMyUniversity() {
    const newParams = new URLSearchParams(searchParams);
    if (myUniversity) {
      newParams.delete('myUniversity');
    } else {
      newParams.set('myUniversity', 'true');
    }
    setSearchParams(newParams);
  }

  function openModal() {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
    setCompensation('');
    setUniversityOnly(false);
    setSelectedLocation('');
    setIsPaid(null);
    setSelectedCategories([]);
  }

  async function handleCreateOpportunity(e) {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert('Please fill in both title and description');
      return;
    }

    if (!selectedLocation) {
      alert('Please select a location type (Remote, Hybrid, or On-site)');
      return;
    }

    if (isPaid === null) {
      alert('Please indicate if this opportunity is Paid or Unpaid');
      return;
    }

    // Build tags array
    const tags = [selectedLocation, isPaid ? 'Paid' : 'Unpaid', ...selectedCategories];

    createOpportunityMutation.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        compensation: isPaid ? compensation.trim() : '',
        universityOnly,
        tags,
      },
      {
        onSuccess: () => closeModal(),
        onError: (err) => {
          console.error('Error creating opportunity:', err);
          alert('Failed to create opportunity. Please try again.');
        },
      }
    );
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

  const charCount = title.length + description.length;

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
              variant="success"
            >
              Paid
            </ToggleTag>
            <ToggleTag
              selected={paidFilter === 'false'}
              onClick={() => togglePaidFilter('false')}
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

      {/* Additional Tag Filter */}
      <div className="mb-8">
        <TagSelector
          tags={CATEGORY_TAGS}
          selected={selectedTag}
          onChange={setSelectedTag}
          showAll
          allLabel="All Categories"
        />
      </div>

      {/* Opportunities List */}
      <FeedItemList
        items={filteredOpportunities}
        isLoading={loading}
        error={queryError}
        onRetry={refetch}
        loadingText="Loading opportunities..."
        emptyIcon={<OpportunitiesIcon className="h-12 w-12" />}
        emptyTitle={hasActiveFilters ? 'No opportunities found' : 'No opportunities yet'}
        emptyDescription={
          hasActiveFilters
            ? 'Try adjusting your filters or search terms.'
            : 'Be the first to post an opportunity!'
        }
        emptyAction={hasActiveFilters ? { label: 'Clear filters', onClick: clearFilters } : undefined}
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

      {/* Create Opportunity Modal */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Post an Opportunity"
        size="2xl"
      >
        <form onSubmit={handleCreateOpportunity} className="p-6">
          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
            <input
              type="text"
              placeholder="e.g., Research Assistant Needed for ML Project"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">Description *</label>
            <textarea
              placeholder={"Recommended info:\n• What you're working on\n• What roles/skills you need\n• Expected time commitment\n• How to get involved"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Location Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">Location Type *</label>
            <TagGroup>
              {LOCATION_TAGS.map(loc => (
                <ToggleTag
                  key={loc}
                  selected={selectedLocation === loc}
                  onClick={() => setSelectedLocation(loc)}
                  size="lg"
                >
                  {loc}
                </ToggleTag>
              ))}
            </TagGroup>
          </div>

          {/* Paid/Unpaid */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">Compensation *</label>
            <TagGroup>
              <ToggleTag
                selected={isPaid === true}
                onClick={() => setIsPaid(true)}
                variant="success"
                size="lg"
              >
                Paid
              </ToggleTag>
              <ToggleTag
                selected={isPaid === false}
                onClick={() => setIsPaid(false)}
                variant="secondary"
                size="lg"
              >
                Unpaid
              </ToggleTag>
            </TagGroup>
          </div>

          {/* Compensation Details (only shown if Paid) */}
          {isPaid && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Compensation Details</label>
              <input
                type="text"
                placeholder="e.g., $20/hour, $500 stipend, equity offered"
                value={compensation}
                onChange={(e) => setCompensation(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {/* University Only Toggle */}
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

          {/* Category Tags */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">Categories (optional)</label>
            <TagSelector
              tags={CATEGORY_TAGS}
              selected={selectedCategories}
              onChange={setSelectedCategories}
              multiple
            />
          </div>

          {/* Submit Row */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground flex items-center">
              <ClockIcon />
              <span className="ml-1">{charCount} characters</span>
            </div>

            <GradientButton
              type="submit"
              size="sm"
              loading={createOpportunityMutation.isPending}
              loadingText="Posting..."
            >
              Post Opportunity
            </GradientButton>
          </div>
        </form>
      </BaseModal>

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
