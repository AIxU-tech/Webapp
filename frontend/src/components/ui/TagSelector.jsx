/**
 * TagSelector Component
 *
 * A toggleable tag selection interface. Allows users to select one or multiple
 * tags from a predefined list. Uses ToggleTag for consistent styling.
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

import { ToggleTag, TagGroup } from './Tag';

export default function TagSelector({
  tags = [],
  selected,
  onChange,
  showAll = false,
  allLabel = 'All',
  multiple = false,
  size = 'md',
  className = '',
}) {
  /** Toggle a tag on/off in multi-select or set in single-select */
  const handleTagClick = (tag) => {
    if (multiple) {
      const currentSelected = Array.isArray(selected) ? selected : [];
      if (currentSelected.includes(tag)) {
        onChange(currentSelected.filter((t) => t !== tag));
      } else {
        onChange([...currentSelected, tag]);
      }
    } else {
      onChange(tag);
    }
  };

  /** Check if a tag is currently selected */
  const isSelected = (tag) => {
    if (multiple) {
      return Array.isArray(selected) && selected.includes(tag);
    }
    return selected === tag;
  };

  return (
    <TagGroup className={className}>
      {/* "All" option for single-select mode */}
      {showAll && !multiple && (
        <ToggleTag
          selected={selected === 'all'}
          onClick={() => onChange('all')}
          size={size}
        >
          {allLabel}
        </ToggleTag>
      )}

      {/* Tag buttons */}
      {tags.map((tag) => (
        <ToggleTag
          key={tag}
          selected={isSelected(tag)}
          onClick={() => handleTagClick(tag)}
          size={size}
        >
          {tag}
        </ToggleTag>
      ))}
    </TagGroup>
  );
}
