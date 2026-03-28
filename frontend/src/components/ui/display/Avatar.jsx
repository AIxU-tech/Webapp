import { useState, useEffect } from 'react';
import { getAvatarUrl, getInitials, getInitialsFromName, getAvatarGradient } from '../../../utils/avatar';

/**
 * Size variants mapping to Tailwind classes
 * xs: 24px, sm: 32px, md: 40px, lg: 48px, xl: 96px, 2xl: 112px
 */
const SIZES = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-24 h-24 text-2xl',
  '2xl': 'w-28 h-28 text-3xl',
};

/**
 * Reusable Avatar component with automatic fallback to gradient + initials
 *
 * @param {Object} props
 * @param {Object} [props.user] - User object with id, first_name, last_name, profile_picture_url, etc.
 * @param {string} [props.src] - Direct image URL (overrides user avatar URL)
 * @param {string} [props.name] - Display name for initials (fallback if no user object)
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'2xl'} [props.size='md'] - Avatar size variant
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {string} [props.alt] - Alt text override (defaults to user name)
 */
export function Avatar({ user, src, name, size = 'md', className = '', alt }) {
  const imageUrl = src || getAvatarUrl(user);
  const [imgError, setImgError] = useState(false);

  // Reset error state when image URL changes
  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  // Get initials: prefer user object, but fall back to name prop or user.name if user doesn't have first_name/last_name
  let initials;
  if (user) {
    const userInitials = getInitials(user);
    // If getInitials returns '?', try using the name prop or user.name as fallback
    if (userInitials === '?') {
      initials = name ? getInitialsFromName(name) : (user.name ? getInitialsFromName(user.name) : '?');
    } else {
      initials = userInitials;
    }
  } else {
    initials = getInitialsFromName(name);
  }

  const sizeClass = SIZES[size] || SIZES.md;
  const displayName = name || (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '') || (user?.name || '');
  const altText = alt || displayName || 'User avatar';
  const gradientClass = getAvatarGradient(user, name);

  const showImage = imageUrl && !imgError;

  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-medium flex-shrink-0 ${className}`}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={altText}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export default Avatar;
