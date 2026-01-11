import { TagSelector } from './ui';
import { BookmarkIcon } from './icons';

/**
 * NotesFilter Component
 *
 * Provides filtering options for notes including tag-based filtering
 * and bookmarked notes toggle.
 */
export default function NotesFilter({
  availableTags,
  selectedTag,
  onTagChange,
  onTagHover,
  isBookmarked,
  onBookmarkToggle,
  onBookmarkHover,
  isAuthenticated,
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Tag Filter */}
        <div className="flex-1">
          <TagSelector
            tags={availableTags}
            selected={selectedTag}
            onChange={onTagChange}
            onHover={onTagHover}
            showAll
            allLabel="All Notes"
          />
        </div>

        {/* Bookmarked Filter Button - Only show when authenticated */}
        {isAuthenticated && (
          <button
            onClick={onBookmarkToggle}
            onMouseEnter={onBookmarkHover}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${isBookmarked
                ? 'bg-primary text-white shadow-md'
                : 'bg-card text-muted-foreground border border-border hover:border-primary hover:text-primary'
              }
            `}
            aria-label={isBookmarked ? 'Show all notes' : 'Show bookmarked notes'}
          >
            <BookmarkIcon className="h-5 w-5" filled={isBookmarked} />
            <span>Bookmarked</span>
          </button>
        )}
      </div>
    </div>
  );
}
