import { useState, useMemo } from 'react';
import { useUniversities, usePageTitle, useDelayedLoading } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { ErrorState, EmptyState, UniversityCardSkeleton, GradientButton } from '../components/ui';
import { SearchIcon, BuildingIcon, PlusIcon } from '../components/icons';
import { UniversityCard, CreateUniversityModal } from '../components/university';

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <UniversityCardSkeleton key={i} />
      ))}
    </div>
  );
}

// =============================================================================
// MAIN UNIVERSITIES PAGE COMPONENT
// =============================================================================

export default function UniversitiesPage() {
  // Set page title
  usePageTitle('Universities');

  // ---------------------------------------------------------------------------
  // Auth Context - Check if user is site admin
  // ---------------------------------------------------------------------------
  const { user } = useAuth();
  const isAdmin = user?.permissionLevel >= 1;

  // ---------------------------------------------------------------------------
  // Data Fetching with React Query
  // ---------------------------------------------------------------------------
  const { data: universities = [], isLoading, error: queryError } = useUniversities();

  // Delay loading state by 200ms to prevent flash when data loads from cache
  const showLoading = useDelayedLoading(isLoading);

  // Convert error to string for display
  const error = queryError?.message || null;

  // ---------------------------------------------------------------------------
  // Local UI State
  // ---------------------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ---------------------------------------------------------------------------
  // Filter Universities by Search Term
  // ---------------------------------------------------------------------------
  const filteredUniversities = useMemo(() => {
    if (!searchTerm.trim()) {
      return universities;
    }

    const term = searchTerm.toLowerCase();

    return universities.filter((university) => {
      const nameMatch = university.name?.toLowerCase().includes(term);
      const clubMatch = university.clubName?.toLowerCase().includes(term);
      return nameMatch || clubMatch;
    });
  }, [universities, searchTerm]);

  // ---------------------------------------------------------------------------
  // Render: Loading State (delayed to prevent flash on cached data)
  // ---------------------------------------------------------------------------
  if (showLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader isAdmin={isAdmin} onCreateClick={() => setShowCreateModal(true)} />
        <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        <LoadingSkeleton />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Error State
  // ---------------------------------------------------------------------------
  if (error && universities.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader isAdmin={isAdmin} onCreateClick={() => setShowCreateModal(true)} />
        <ErrorState
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Main Page
  // ---------------------------------------------------------------------------
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader isAdmin={isAdmin} onCreateClick={() => setShowCreateModal(true)} />

      <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {/* Universities Grid or Empty State */}
      {filteredUniversities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUniversities.map((university) => (
            <UniversityCard key={university.id} university={university} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BuildingIcon className="h-12 w-12" />}
          title={
            searchTerm
              ? 'No universities found'
              : 'No universities available yet'
          }
          description={
            searchTerm
              ? 'Try adjusting your search query'
              : 'Check back later for new university clubs'
          }
          action={
            searchTerm
              ? { label: 'Clear search', onClick: () => setSearchTerm('') }
              : undefined
          }
        />
      )}

      {/* Create University Modal (admin only) */}
      <CreateUniversityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * PageHeader - Displays the page title, description, and admin create button
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isAdmin - Whether the current user is a site admin
 * @param {function} props.onCreateClick - Callback when create button is clicked
 */
function PageHeader({ isAdmin, onCreateClick }) {
  return (
    <div className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          University AI Clubs
        </h1>
        <p className="text-muted-foreground text-lg">
          Discover and connect with AI communities across universities worldwide
        </p>
      </div>
      {isAdmin && (
        <GradientButton onClick={onCreateClick} icon={<PlusIcon />}>
          Create University
        </GradientButton>
      )}
    </div>
  );
}

/**
 * SearchBar - Search input for filtering universities
 */
function SearchBar({ searchTerm, onSearchChange }) {
  return (
    <div className="mb-8">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Search universities or clubs..."
          className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search universities"
        />
      </div>
    </div>
  );
}
