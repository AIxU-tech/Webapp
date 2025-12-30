/**
 * LikeButton Component
 *
 * Specialized like button with heart icon and count.
 * Used for notes and comments across the app.
 */

import IconButton from './IconButton';
import { HeartIcon } from '../icons';

const COUNT_CLASSES = {
  sm: 'text-xs',
  md: 'text-xs',
  lg: 'text-sm',
};

export default function LikeButton({
  isLiked = false,
  likes = 0,
  onClick,
  disabled = false,
  size = 'md',
}) {
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
        <span className={`${COUNT_CLASSES[size]} font-medium`}>{likes}</span>
      )}
    </IconButton>
  );
}
