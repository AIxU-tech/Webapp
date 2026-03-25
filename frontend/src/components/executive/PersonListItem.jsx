/**
 * PersonListItem
 *
 * Row displaying a person with avatar, name, and optional subtitle.
 * Used in UserActionListCard for RSVPs, check-ins, etc.
 */

import { Avatar } from '../ui';

export default function PersonListItem({ user, name, subtitle }) {
  const displayName = name ?? user?.name ?? 'Unknown';

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
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
