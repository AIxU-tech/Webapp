/**
 * MemberCard
 *
 * Card displaying a single member in the executive portal member list.
 * Links to member detail view; shows edit/manage actions when permitted.
 */

import { Link } from 'react-router-dom';
import { Avatar, Badge, IconButton, MemberActionsPopover } from '../ui';
import { PencilIcon } from '../icons';
import RoleBadge from '../university/RoleBadge';

export default function MemberCard({
  member,
  universityId,
  permissions,
  canManageAny,
  isCurrentUser,
  isPopoverOpen,
  onPopoverToggle,
  onClosePopover,
  onRoleChange,
  onRemove,
  onMakePresident,
}) {
  const showEditButton = canManageAny && !isCurrentUser;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
      <Link to={`/executive/${universityId}/members/${member.id}`} className="flex-shrink-0">
        <Avatar user={member} size="md" />
      </Link>

      <Link
        to={`/executive/${universityId}/members/${member.id}`}
        className="flex-1 min-w-0"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{member.name}</span>
          <RoleBadge role={member.role} size="xs" />
          {member.isPartial && <Badge variant="outline" size="xs">Pending Account</Badge>}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {member.location || 'Location not set'} ·{' '}
          {member.eventsAttendedCount ?? 0} events attended
        </p>
      </Link>

      {showEditButton && (
        <div className="relative flex-shrink-0" onClick={(e) => e.preventDefault()}>
          <IconButton
            icon={PencilIcon}
            onClick={(e) => {
              e.preventDefault();
              onPopoverToggle(member.id);
            }}
            label={`Manage ${member.name}`}
            size="sm"
            variant="subtle"
          />
          <MemberActionsPopover
            isOpen={isPopoverOpen}
            onClose={onClosePopover}
            member={member}
            permissions={permissions}
            onRoleChange={onRoleChange}
            onRemove={onRemove}
            onMakePresident={onMakePresident}
          />
        </div>
      )}
    </div>
  );
}
