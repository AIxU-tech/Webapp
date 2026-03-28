/**
 * PersonListItem
 *
 * Row displaying a person with avatar, name, and optional subtitle.
 * Used in UserActionListCard for RSVPs, check-ins, etc.
 */

import { Avatar } from '../ui';

export default function PersonListItem({ user, name, subtitle, onClick }) {
  const displayName = name ?? user?.name ?? 'Unknown';
  const isClickable = typeof onClick === 'function';

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? name ?? user?.name ?? 'User' : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
      className={`flex items-center gap-3 py-2 border-b border-border last:border-0 transition-colors ${
        isClickable ? 'cursor-pointer hover:bg-muted/40' : ''
      }`}
    >
      <Avatar user={user} name={displayName} size="sm" />
      <div>
        <p className="font-medium text-foreground text-sm">{displayName}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
