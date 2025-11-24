/**
 * UniversitiesPage Component
 *
 * Main universities listing page that displays all AI university clubs.
 * Uses React Query for automatic caching and data management.
 *
 * Features:
 * - Grid display of all universities with stats and information
 * - Real-time search by university name and club name
 * - Responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)
 * - Call-to-action for users to register their university
 * - Admin button to add new universities
 * - Automatic caching via React Query (shared with other pages)
 *
 * Caching Behavior:
 * - Data is cached for 10 minutes (staleTime in useUniversities hook)
 * - Cached data shown instantly on return visits
 * - No manual cache management needed
 *
 * @component
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUniversities } from '../hooks';

/**
 * SearchIcon Component
 *
 * SVG icon for the search input field.
 */
const SearchIcon = () => (
  <svg
    className="h-4 w-4 text-muted-foreground"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

/**
 * GraduationCapIcon Component
 *
 * SVG icon displayed on each university card.
 */
const GraduationCapIcon = () => (
  <svg
    className="h-6 w-6 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z M12 14v6.5"
    />
  </svg>
);

/**
 * UniversityCard Component
 *
 * Individual card component for displaying a single university.
 * Includes stats, tags, and a view button.
 *
 * @param {Object} props
 * @param {Object} props.university - University data object
 */
function UniversityCard({ university }) {
  /**
   * Parse Tags
   *
   * Ensures tags is always an array, handling various data formats.
   */
  const tags = Array.isArray(university.tags) ? university.tags : [];

  return (
    <div className="university-card bg-card border border-border rounded-lg p-6 shadow-card hover:shadow-hover transition-all duration-200">
      {/* University Header - Name, Location, and Icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          {/* University Name */}
          <h3 className="text-xl font-bold text-foreground truncate">
            {university.name}
          </h3>
          {/* Location */}
          <p className="text-muted-foreground truncate">{university.location}</p>
        </div>

        {/* Icon - Graduation cap with gradient background */}
        <div className="w-12 h-12 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
          <GraduationCapIcon />
        </div>
      </div>

      {/* Club Information */}
      <div className="mb-4">
        <h4 className="font-semibold text-foreground mb-2">
          {university.clubName || `${university.name} AI Club`}
        </h4>
        <p className="text-muted-foreground text-sm line-clamp-2">
          {university.description || 'Join our AI community to collaborate on exciting projects and learn together.'}
        </p>
      </div>

      {/* Statistics Grid - Members, Posts, Events */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Member Count */}
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {university.memberCount || 0}
          </div>
          <div className="text-xs text-muted-foreground">Members</div>
        </div>

        {/* Recent Posts Count */}
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {university.recentPosts || 0}
          </div>
          <div className="text-xs text-muted-foreground">Posts</div>
        </div>

        {/* Upcoming Events Count */}
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {university.upcomingEvents || 0}
          </div>
          <div className="text-xs text-muted-foreground">Events</div>
        </div>
      </div>

      {/* Tags - Topics/Interests associated with this university */}
      <div className="flex flex-wrap gap-2 mb-4 min-h-[2rem]">
        {tags.length > 0 ? (
          tags.slice(0, 4).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full"
            >
              {tag}
            </span>
          ))
        ) : (
          // Empty space to maintain consistent card height
          <div className="h-6"></div>
        )}
        {tags.length > 4 && (
          <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
            +{tags.length - 4} more
          </span>
        )}
      </div>

      {/* View University Button */}
      <Link
        to={`/universities/${university.id}`}
        className="block w-full"
      >
        <button className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
          View University
        </button>
      </Link>
    </div>
  );
}

/**
 * Main UniversitiesPage Component
 */
export default function UniversitiesPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  /**
   * Data Fetching with React Query
   *
   * useUniversities() handles:
   * - Automatic caching (10 minute staleTime)
   * - Loading states
   * - Error handling
   * - Background refetching
   *
   * Data is shared with other pages that use this hook
   * (RegisterPage, ProfilePage, etc.)
   */
  const {
    data: universities = [],
    isLoading: loading,
    error: queryError,
    isFetching,
  } = useUniversities();

  // Convert error to string for display
  const error = queryError?.message || null;

  /**
   * Local UI State
   */
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * Set Page Title
   *
   * Updates browser tab title when component mounts.
   */
  useEffect(() => {
    document.title = 'Universities - AIxU';
  }, []);

  /**
   * Filter Universities by Search Term
   *
   * Memoized computation that filters universities based on search input.
   * Searches across: university name, club name, and tags.
   * Case-insensitive search.
   */
  const filteredUniversities = useMemo(() => {
    if (!searchTerm.trim()) {
      return universities;
    }

    const term = searchTerm.toLowerCase();

    return universities.filter((university) => {
      // Search in university name
      const nameMatch = university.name?.toLowerCase().includes(term);

      // Search in club name
      const clubMatch = university.clubName?.toLowerCase().includes(term);

      // Search in tags
      const tags = Array.isArray(university.tags) ? university.tags : [];
      const tagsMatch = tags.some((tag) =>
        tag.toLowerCase().includes(term)
      );

      // Match if any field contains the search term
      return nameMatch || clubMatch || tagsMatch;
    });
  }, [universities, searchTerm]);

  /**
   * Handle Search Input Change
   *
   * Updates search term state as user types.
   *
   * @param {Event} e - Input change event
   */
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  /**
   * Check if User is Admin
   *
   * Only admins (permission level > 0) can add universities.
   */
  const isAdmin = user?.permission_level > 0;

  /**
   * Render Loading State
   */
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading universities...</div>
        </div>
      </div>
    );
  }

  /**
   * Render Error State
   *
   * Shows error message with retry button.
   * React Query will show cached data if available even on error.
   */
  if (error && universities.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /**
   * Main Page Render
   */
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          University AI Clubs
        </h1>
        <p className="text-muted-foreground text-lg">
          Discover and connect with AI communities across universities worldwide
        </p>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {/* Search Input */}
        <div className="relative flex-1">
          {/* Search Icon - Positioned inside input field */}
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <SearchIcon />
          </div>

          {/* Search Input Field */}
          <input
            type="text"
            placeholder="Search universities, clubs, or topics..."
            className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            value={searchTerm}
            onChange={handleSearchChange}
            aria-label="Search universities"
          />
        </div>

        {/* Add University Button - Only shown to admins */}
        {isAdmin && (
          <Link to="/universities/new">
            <button className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-4 py-2 rounded-md hover:shadow-lg transition-all duration-200 whitespace-nowrap">
              Add Your University
            </button>
          </Link>
        )}
      </div>

      {/* Show refreshing indicator if fetching in background */}
      {isFetching && !loading && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <p className="text-blue-800 dark:text-blue-200 text-sm flex items-center">
            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Refreshing data...
          </p>
        </div>
      )}

      {/* Universities Grid */}
      {filteredUniversities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUniversities.map((university) => (
            <UniversityCard
              key={university.id}
              university={university}
            />
          ))}
        </div>
      ) : (
        /* No Results Message */
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchTerm
              ? 'No universities found matching your search.'
              : 'No universities available yet.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 text-primary hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Call to Action - Register Your University */}
      {(!isAuthenticated || !user?.university) && (
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-br from-card to-muted p-8 rounded-2xl shadow-card border border-border">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Don't see your university?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join the growing network of AI clubs worldwide. Add your university and
              start connecting with like-minded students and researchers across the
              globe.
            </p>
            <button
              onClick={() => navigate('/register_university')}
              className="bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-8 py-3 rounded-lg shadow-card hover:shadow-hover transition-all duration-200"
            >
              Register Your Club
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
