/**
 * TagSelector Component
 *
 * A toggleable tag selection interface. Allows users to select one or multiple
 * tags from a predefined list.
 *
 * @component
 *
 * @example
 * // Single selection with "All" option
 * <TagSelector
 *   tags={['NLP', 'Deep Learning', 'MLOps']}
 *   selected={selectedTag}
 *   onChange={setSelectedTag}
 *   showAll
 * />
 *
 * @example
 * // Multi-selection
 * <TagSelector
 *   tags={['React', 'Vue', 'Angular']}
 *   selected={selectedTags}
 *   onChange={setSelectedTags}
 *   multiple
 * />
 */

export default function TagSelector({
  tags = [],
  selected,
  onChange,
  showAll = false,
  allLabel = 'All',
  multiple = false,
  className = '',
}) {
  /**
   * Handle tag click
   */
  const handleTagClick = (tag) => {
    if (multiple) {
      // Multi-select mode
      const currentSelected = Array.isArray(selected) ? selected : [];
      if (currentSelected.includes(tag)) {
        onChange(currentSelected.filter((t) => t !== tag));
      } else {
        onChange([...currentSelected, tag]);
      }
    } else {
      // Single-select mode
      onChange(tag);
    }
  };

  /**
   * Check if a tag is selected
   */
  const isSelected = (tag) => {
    if (multiple) {
      return Array.isArray(selected) && selected.includes(tag);
    }
    return selected === tag;
  };

  /**
   * Base button styles
   */
  const baseClass = 'px-3 py-1.5 rounded-full text-sm font-medium transition-colors';
  const activeClass = 'bg-primary text-primary-foreground';
  const inactiveClass = 'bg-secondary text-secondary-foreground hover:bg-secondary/80';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* "All" option for single-select mode */}
      {showAll && !multiple && (
        <button
          type="button"
          onClick={() => onChange('all')}
          className={`${baseClass} ${selected === 'all' ? activeClass : inactiveClass}`}
        >
          {allLabel}
        </button>
      )}

      {/* Tag buttons */}
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => handleTagClick(tag)}
          className={`${baseClass} ${isSelected(tag) ? activeClass : inactiveClass}`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
