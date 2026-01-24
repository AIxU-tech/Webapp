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
 * - Admin refresh button to fetch new content
 * - Auto-fetch when no content exists (first visit)
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAIContent, useRefreshAIContent } from '../hooks/useNews';
import { usePageTitle } from '../hooks';

// UI Components
import {
  EmptyState,
  ErrorState,
  GradientButton,
  SectionHeader,
} from '../components/ui';

// Icons
import {
  NewspaperIcon,
  AcademicCapIcon,
  RefreshIcon,
} from '../components/icons';

// Content display
import { ContentCard } from '../components/news';

// Community components
import { NewsLoadingSkeleton } from '../components/community';

/**
 * Loading state shown during initial content fetch (when database is empty)
 */
function InitialFetchLoading() {
  return (
    <div className="space-y-10">
      {/* Stories section */}
      <section>
        <SectionHeader
          icon={<NewspaperIcon />}
          title="Top Stories"
          subtitle="AI news from the past 24-48 hours"
          variant="primary"
        />
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex items-center gap-3 mb-4">
              <RefreshIcon spinning={true} />
              <span className="text-lg font-medium text-foreground">
                Stories loading...
              </span>
            </div>
            <p className="text-muted-foreground text-center max-w-md">
              Fetching the latest AI news from across the web. This may take a moment.
            </p>
          </div>
        </div>
      </section>

      {/* Papers section */}
      <section>
        <SectionHeader
          icon={<AcademicCapIcon />}
          title="Research Papers"
          subtitle="Notable papers from the past week"
          variant="secondary"
        />
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex items-center gap-3 mb-4">
              <RefreshIcon spinning={true} />
              <span className="text-lg font-medium text-foreground">
                Papers loading...
              </span>
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
// CONTENT SECTION COMPONENT
// =============================================================================

/**
 * Renders a section of content cards (stories or papers)
 */
function ContentSection({
  icon,
  title,
  subtitle,
  variant,
  items,
  type,
  emptyMessage
}) {
  return (
    <section>
      <SectionHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        variant={variant}
      />

      {items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item, index) => (
            <ContentCard
              key={item.id || index}
              item={item}
              rank={index + 1}
              type={type}
            />
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
    </section>
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

  // Data fetching - gets both stories and papers in one call
  const { data, isLoading, error, isFetching } = useAIContent();

  // Refresh mutation - triggers Claude's web search
  const refreshMutation = useRefreshAIContent();

  // Derived state
  const stories = data?.stories || [];
  const papers = data?.papers || [];
  const hasContent = stories.length > 0 || papers.length > 0;

  // Set page title
  usePageTitle('AI News & Research');

  // Auto-fetch content when database is empty
  useEffect(() => {
    const shouldAutoFetch =
      !isLoading &&
      !hasContent &&
      !hasTriggeredAutoFetch &&
      !refreshMutation.isPending &&
      !error;

    if (shouldAutoFetch) {
      console.log('[NewsPage] No content found, triggering automatic fetch...');
      setHasTriggeredAutoFetch(true);
      refreshMutation.mutate();
    }
  }, [isLoading, hasContent, hasTriggeredAutoFetch, refreshMutation, error]);

  /**
   * Handle refresh button click
   */
  function handleRefresh() {
    refreshMutation.mutate(undefined, {
      onError: (err) => {
        console.error('Failed to refresh AI content:', err);
        alert(err.message || 'Failed to refresh content. Please try again.');
      }
    });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            AI News & Research
          </h1>
          <p className="text-muted-foreground text-lg">
            Stay updated with the latest developments in artificial intelligence
          </p>
        </div>

        {/* Admin Refresh Button */}
        {isAdmin && hasContent && (
          <GradientButton
            onClick={handleRefresh}
            disabled={refreshMutation.isPending || isFetching}
            loading={refreshMutation.isPending}
            loadingText="Refreshing..."
            icon={<RefreshIcon spinning={refreshMutation.isPending} />}
            size="sm"
          >
            Refresh
          </GradientButton>
        )}
      </div>

      {/* Loading State */}
      {isLoading && <NewsLoadingSkeleton />}

      {/* Error State */}
      {error && !hasContent && (
        <ErrorState
          message={error.message || 'Something went wrong. Please try again later.'}
          onRetry={() => window.location.reload()}
        />
      )}

      {/* Empty State / Initial Fetch Loading */}
      {!isLoading && !error && !hasContent && (
        refreshMutation.isPending ? (
          <InitialFetchLoading />
        ) : (
          <EmptyState
            icon={<NewspaperIcon className="h-12 w-12" />}
            title="Unable to Load Content"
            description="We couldn't fetch AI news at this time. Please try again."
            action={{
              label: 'Try Again',
              onClick: handleRefresh,
            }}
          />
        )
      )}

      {/* Main Content */}
      {!isLoading && hasContent && (
        <div className="space-y-10">
          {/* News Stories */}
          <ContentSection
            icon={<NewspaperIcon />}
            title="Top Stories"
            subtitle="AI news from the past 24-48 hours"
            variant="primary"
            items={stories}
            type="story"
            emptyMessage="No news stories available at the moment."
          />

          {/* Research Papers */}
          <ContentSection
            icon={<AcademicCapIcon />}
            title="Research Papers"
            subtitle="Notable papers from the past week"
            variant="secondary"
            items={papers}
            type="paper"
            emptyMessage="No research papers available at the moment."
          />
        </div>
      )}
    </div>
  );
}
