/**
 * UserListItem Component
 *
 * Displays a user in a list format with avatar, name, and optional details.
 * Commonly used in conversation lists, member lists, and search results.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <UserListItem
 *   user={{ id: 1, first_name: 'John', last_name: 'Doe' }}
 *   onClick={() => navigate(`/users/${user.id}`)}
 * />
 *
 * @example
 * // With subtitle and right content
 * <UserListItem
 *   user={user}
 *   subtitle={user.university}
 *   rightContent={<Badge variant="success">Online</Badge>}
 * />
 *
 * @example
 * // In a message list
 * <UserListItem
 *   user={conversation.other_user}
 *   subtitle={conversation.last_message?.content}
 *   rightContent={<span className="text-xs">{timeAgo}</span>}
 *   highlighted={conversation.unread_count > 0}
 * />
 */

import { Link } from 'react-router-dom';

/**
 * Get profile picture URL for a user
 */
function getProfilePictureUrl(user) {
  if (!user) return null;
  if (user.profile_picture_url) return user.profile_picture_url;
  if (user.id) return `/user/${user.id}/profile_picture`;
  return null;
}

/**
 * Get user's display name
 */
function getDisplayName(user) {
  if (!user) return 'Unknown';
  if (user.full_name) return user.full_name;
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
  if (user.first_name) return user.first_name;
  return 'Unknown';
}

/**
 * Get user's initials for avatar fallback
 */
function getInitials(user) {
  if (!user) return '?';
  const first = user.first_name?.[0] || '';
  const last = user.last_name?.[0] || '';
  return (first + last).toUpperCase() || '?';
}

export default function UserListItem({
  user,
  subtitle,
  rightContent,
  highlighted = false,
  onClick,
  linkTo,
  avatarSize = 'md',
  className = '',
}) {
  const profilePictureUrl = getProfilePictureUrl(user);
  const displayName = getDisplayName(user);
  const initials = getInitials(user);

  /**
   * Avatar size classes
   */
  const avatarSizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const avatarClass = avatarSizes[avatarSize] || avatarSizes.md;

  /**
   * Content to render
   */
  const content = (
    <>
      {/* Avatar */}
      <div className={`flex-shrink-0 ${avatarClass} rounded-full overflow-hidden bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] flex items-center justify-center text-white font-medium`}>
        {profilePictureUrl ? (
          <img
            src={profilePictureUrl}
            alt={displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <span className={profilePictureUrl ? 'hidden' : 'flex items-center justify-center'}>
          {initials}
        </span>
      </div>

      {/* Name and subtitle */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${highlighted ? 'text-foreground' : 'text-foreground'}`}>
          {displayName}
        </p>
        {subtitle && (
          <p className={`text-sm truncate ${highlighted ? 'text-foreground/80' : 'text-muted-foreground'}`}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right content (badge, time, etc.) */}
      {rightContent && (
        <div className="flex-shrink-0 ml-2">
          {rightContent}
        </div>
      )}
    </>
  );

  /**
   * Common wrapper classes
   */
  const wrapperClass = `flex items-center gap-3 p-3 rounded-lg transition-colors ${
    highlighted ? 'bg-primary/10' : 'hover:bg-accent'
  } ${onClick || linkTo ? 'cursor-pointer' : ''} ${className}`;

  /**
   * Render as link if linkTo provided
   */
  if (linkTo) {
    return (
      <Link to={linkTo} className={wrapperClass}>
        {content}
      </Link>
    );
  }

  /**
   * Render as button if onClick provided
   */
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${wrapperClass} w-full text-left`}>
        {content}
      </button>
    );
  }

  /**
   * Render as div
   */
  return (
    <div className={wrapperClass}>
      {content}
    </div>
  );
}
