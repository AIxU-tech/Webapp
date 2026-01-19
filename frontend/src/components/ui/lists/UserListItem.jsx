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
import { Avatar } from '../display';

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
  const displayName = getDisplayName(user);

  /**
   * Content to render
   */
  const content = (
    <>
      {/* Avatar */}
      <Avatar user={user} size={avatarSize} name={displayName} />

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
