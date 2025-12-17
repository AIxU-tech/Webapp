/**
 * NewsPage Component
 *
 * Displays the latest AI news stories and research papers in a clean,
 * responsive layout. Content is fetched from Claude's web search and
 * cached for optimal performance.
 *
 * Features:
 * - Top 3 AI news stories from the past 24-48 hours
 * - Top 3 AI research papers from the past week
 * - Interactive AI chat for each story/paper
 * - Chat replaces summary view when conversation starts
 * - Source attribution visible in initial view
 * - Admin refresh button to fetch new content
 * - Auto-fetch when no content exists (first visit)
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  useAIContent,
  useRefreshAIContent,
} from '../hooks/useNews';
import { usePageTitle } from '../hooks';
import {
  NewspaperIcon,
  AcademicCapIcon,
  RefreshIcon,
} from '../components/icons';
import ContentCard from '../components/ContentCard';

// =============================================================================
// SECTION HEADER COMPONENT
// =============================================================================

/**
 * Reusable header for news and research sections.
 */
function SectionHeader({ icon, title, subtitle, gradientFrom, gradientTo }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`w-10 h-10 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-xl flex items-center justify-center text-white`}
      >
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}


// =============================================================================
// LOADING SKELETON COMPONENT
// =============================================================================

/**
 * Loading placeholder for news/paper cards.
 */
function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 bg-muted rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
      </div>
    </div>
  );
}


/**
 * Displayed when content is being fetched for the first time.
 */
function InitialFetchLoading() {
  return (
    <div className="space-y-10">
      <section>
        <SectionHeader
          icon={<NewspaperIcon />}
          title="Top Stories"
          subtitle="AI news from the past 24-48 hours"
          gradientFrom="from-[hsl(220,85%,60%)]"
          gradientTo="to-[hsl(185,85%,55%)]"
        />
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex items-center gap-3 mb-4">
              <RefreshIcon spinning={true} />
              <span className="text-lg font-medium text-foreground">Stories loading...</span>
            </div>
            <p className="text-muted-foreground text-center max-w-md">
              Fetching the latest AI news from across the web. This may take a moment.
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader
          icon={<AcademicCapIcon />}
          title="Research Papers"
          subtitle="Notable papers from the past week"
          gradientFrom="from-[hsl(280,85%,60%)]"
          gradientTo="to-[hsl(320,85%,55%)]"
        />
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex items-center gap-3 mb-4">
              <RefreshIcon spinning={true} />
              <span className="text-lg font-medium text-foreground">Papers loading...</span>
            </div>
            <p className="text-muted-foreground text-center max-w-md">
              Searching for notable AI research papers. This may take a moment.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}


// =============================================================================
// MAIN NEWS PAGE COMPONENT
// =============================================================================

export default function NewsPage() {
  const { user } = useAuth();
  const isAdmin = user?.permissionLevel > 0;

  // Track if we've already triggered an auto-fetch
  const [hasTriggeredAutoFetch, setHasTriggeredAutoFetch] = useState(false);

  // Data Fetching - gets both stories and papers in one call
  const { data, isLoading, error, isFetching } = useAIContent();

  // Refresh Mutation - triggers Claude's web search
  const refreshMutation = useRefreshAIContent();

  const stories = data?.stories || [];
  const papers = data?.papers || [];
  const hasContent = stories.length > 0 || papers.length > 0;

  // Auto-fetch content when database is empty
  useEffect(() => {
    if (
      !isLoading &&
      !hasContent &&
      !hasTriggeredAutoFetch &&
      !refreshMutation.isPending &&
      !error
    ) {
      console.log('[NewsPage] No content found, triggering automatic fetch...');
      setHasTriggeredAutoFetch(true);
      refreshMutation.mutate();
    }
  }, [isLoading, hasContent, hasTriggeredAutoFetch, refreshMutation, error]);

  // Handle Refresh Button Click
  function handleRefresh() {
    refreshMutation.mutate(undefined, {
      onError: (err) => {
        console.error('Failed to refresh AI content:', err);
        alert(err.message || 'Failed to refresh content. Please try again.');
      }
    });
  }

  // Set page title
  usePageTitle('AI News & Research');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header with Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">AI News & Research</h1>
          <p className="text-muted-foreground text-lg">
            Stay updated with the latest developments in artificial intelligence
          </p>
        </div>

        {/* Refresh Button - Admin Only */}
        {isAdmin && hasContent && (
          <button
            onClick={handleRefresh}
            disabled={refreshMutation.isPending || isFetching}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg hover:shadow-[hsl(220,85%,60%)]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <RefreshIcon spinning={refreshMutation.isPending} />
            <span>{refreshMutation.isPending ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        )}
      </div>

      {/* Refreshing Indicator */}
      {refreshMutation.isPending && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            Fetching the latest AI news and research papers... This may take a moment.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-muted rounded-xl animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="h-3 bg-muted rounded w-40 animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-muted rounded-xl animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                <div className="h-3 bg-muted rounded w-44 animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </section>
        </div>
      )}

      {/* Error State */}
      {error && !hasContent && (
        <div className="text-center py-12">
          <div className="inline-block p-4 bg-destructive/10 rounded-full mb-4">
            <svg
              className="h-8 w-8 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Unable to Load Content</h3>
          <p className="text-muted-foreground mb-4">
            {error.message || 'Something went wrong. Please try again later.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State / Initial Fetch Loading */}
      {!isLoading && !error && !hasContent && (
        refreshMutation.isPending ? (
          <InitialFetchLoading />
        ) : (
          <div className="text-center py-16">
            <div className="inline-block p-4 bg-muted/30 rounded-full mb-4">
              <NewspaperIcon />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Unable to Load Content</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We couldn't fetch AI news at this time. Please try again.
            </p>
            <button
              onClick={handleRefresh}
              disabled={refreshMutation.isPending}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] text-white px-6 py-2.5 rounded-lg font-medium hover:shadow-lg hover:shadow-[hsl(220,85%,60%)]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshIcon spinning={refreshMutation.isPending} />
              <span>Try Again</span>
            </button>
          </div>
        )
      )}

      {/* Main Content */}
      {!isLoading && hasContent && (
        <div className="space-y-10">
          {/* News Stories Section */}
          <section>
            <SectionHeader
              icon={<NewspaperIcon />}
              title="Top Stories"
              subtitle="AI news from the past 24-48 hours"
              gradientFrom="from-[hsl(220,85%,60%)]"
              gradientTo="to-[hsl(185,85%,55%)]"
            />

            {stories.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {stories.map((story, index) => (
                  <ContentCard
                    key={story.id || index}
                    item={story}
                    rank={index + 1}
                    type="story"
                  />
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No news stories available at the moment.</p>
              </div>
            )}
          </section>

          {/* Research Papers Section */}
          <section>
            <SectionHeader
              icon={<AcademicCapIcon />}
              title="Research Papers"
              subtitle="Notable papers from the past week"
              gradientFrom="from-[hsl(280,85%,60%)]"
              gradientTo="to-[hsl(320,85%,55%)]"
            />

            {papers.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {papers.map((paper, index) => (
                  <ContentCard
                    key={paper.id || index}
                    item={paper}
                    rank={index + 1}
                    type="paper"
                  />
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No research papers available at the moment.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
