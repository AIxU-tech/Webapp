/**
 * LikeButton Component
 *
 * Specialized like button with heart icon and count.
 * Used for notes and comments across the app.
 *
 * @param {boolean} isLiked - Whether the item is liked by current user
 * @param {number} likes - Total like count
 * @param {Function} onClick - Callback when heart icon is clicked (toggle like)
 * @param {Function} [onCountClick] - Callback when count is clicked (e.g., show likers modal)
 * @param {boolean} disabled - Whether the button is disabled
 * @param {string} size - Button size: 'sm' | 'md' | 'lg'
 */

import IconButton from './IconButton';
import { HeartIcon } from '../../icons';

const COUNT_CLASSES = {
  sm: 'text-xs',
  md: 'text-xs',
  lg: 'text-sm',
};

export default function LikeButton({
  isLiked = false,
  likes = 0,
  onClick,
  onCountClick,
  disabled = false,
  size = 'md',
}) {
  // Handle click on the count
  const handleCountClick = (e) => {
    if (onCountClick && likes > 0) {
      e.stopPropagation(); // Prevent triggering the icon button click
      onCountClick(e);
    }
  };

  return (
    <IconButton
      icon={HeartIcon}
      onClick={onClick}
      active={isLiked}
      activeColor="red"
      disabled={disabled}
      label={isLiked ? 'Unlike' : 'Like'}
      size={size}
      filled={isLiked}
    >
      {likes > 0 && (
        <span
          className={`${COUNT_CLASSES[size]} font-medium ${onCountClick ? 'hover:underline cursor-pointer' : ''}`}
          onClick={handleCountClick}
          role={onCountClick ? 'button' : undefined}
          tabIndex={onCountClick ? 0 : undefined}
          onKeyDown={onCountClick ? (e) => e.key === 'Enter' && handleCountClick(e) : undefined}
        >
          {likes}
        </span>
      )}
    </IconButton>
  );
}
