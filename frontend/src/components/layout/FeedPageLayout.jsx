/**
 * FeedPageLayout Component
 * Shared layout for feed pages with header, search, create button, and content area.
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GradientButton } from '../ui';
import { SearchIcon, PlusIcon, XIcon } from '../icons';

export default function FeedPageLayout({
  title,
  description,
  searchPlaceholder = 'Search...',
  createButtonLabel = 'Create',
  onCreateClick,
  searchParamKey = 'search',
  filterContent,
  activeFilterLabel,
  onClearFilter,
  filters,
  children,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get(searchParamKey) || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  function handleSearch(e) {
    e.preventDefault();
    if (searchInput.trim()) {
      // Preserve other params, update search
      const newParams = new URLSearchParams(searchParams);
      newParams.set(searchParamKey, searchInput.trim());
      setSearchParams(newParams);
    } else {
      // Remove search param
      const newParams = new URLSearchParams(searchParams);
      newParams.delete(searchParamKey);
      setSearchParams(newParams);
    }
  }

  function handleClearSearch() {
    setSearchInput('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(searchParamKey);
    setSearchParams(newParams);
    onClearFilter?.();
  }

  const hasActiveFilter = searchQuery || activeFilterLabel;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>

        {/* Description or active filter display */}
        {hasActiveFilter ? (
          <div>
            <p className="text-muted-foreground text-lg mb-4">
              {activeFilterLabel || (
                <>
                  Search results for "<span className="font-semibold text-foreground">{searchQuery}</span>"
                </>
              )}
            </p>
            <button
              onClick={handleClearSearch}
              className="inline-flex items-center text-primary hover:text-primary/80 text-sm font-medium transition-colors mb-6 cursor-pointer"
            >
              <XIcon />
              <span className="ml-1">Clear filter</span>
            </button>
          </div>
        ) : (
          <p className="text-muted-foreground text-lg mb-6">{description}</p>
        )}

        {/* Search + Create Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </form>

          <GradientButton onClick={onCreateClick} icon={<PlusIcon />}>
            {createButtonLabel}
          </GradientButton>
        </div>

        {/* Optional filter content (e.g., additional filter inputs) */}
        {filterContent}
      </div>

      {/* Filters (e.g., TagSelector) */}
      {filters && <div className="mb-8">{filters}</div>}

      {/* Main Content */}
      {children}
    </div>
  );
}
