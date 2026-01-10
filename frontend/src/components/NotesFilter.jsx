import { TagSelector } from './ui';
import { BookmarkIcon } from './icons';

/**
 * NotesFilter Component
 *
 * Provides filtering options for notes including tag-based filtering
 * and bookmarked notes toggle.
 *
 * @param {Object} props
 * @param {Array<string>} props.availableTags - List of tags to show in the filter
 * @param {string|null} props.selectedTag - Currently selected tag (null when bookmarked filter is active)
 * @param {Function} props.onTagChange - Callback when tag filter changes
 * @param {boolean} props.isBookmarked - Whether bookmarked filter is active
 * @param {Function} props.onBookmarkToggle - Callback when bookmark filter is toggled
 * @param {boolean} props.isAuthenticated - Whether user is authenticated (controls bookmark button visibility)
 */
export default function NotesFilter({
  availableTags,
  selectedTag,
  onTagChange,
  isBookmarked,
  onBookmarkToggle,
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
            showAll
            allLabel="All Notes"
          />
        </div>

        {/* Bookmarked Filter Button - Only show when authenticated */}
        {isAuthenticated && (
          <button
            onClick={onBookmarkToggle}
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
