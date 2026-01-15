/**
 * UniversityMembersTab
 *
 * Displays all members of the university with their role badges.
 * Members are sorted by role (President > Executive > Member).
 * Includes role management actions for users with appropriate permissions.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, Avatar, IconButton } from '../ui';
import { UsersIcon, PencilIcon } from '../icons';
import RoleBadge from '../RoleBadge';
import MemberActionsPopover from '../MemberActionsPopover';

export default function UniversityMembersTab({
  members = [],
  permissions = {},
  currentUserId,
  onRoleChange,
  onRemove,
  onMakePresident,
}) {
  // Track which member's popover is open
  const [openPopoverId, setOpenPopoverId] = useState(null);

  const { canManageMembers, canManageExecutives, isSiteAdmin } = permissions;
  const canManageAny = canManageMembers || canManageExecutives || isSiteAdmin;

  if (members.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon className="h-12 w-12" />}
        title="No members yet"
        description="Be the first to join by registering with your university email!"
      />
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">
          All Members ({members.length})
        </h3>
      </div>

      <div className="space-y-2">
        {members.map((member) => {
          const isCurrentUser = member.id === currentUserId;
          // Show edit button if user has permissions and it's not themselves
          const showEditButton = canManageAny && !isCurrentUser;

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              {/* Avatar + Link to profile */}
              <Link to={`/users/${member.id}`} className="flex-shrink-0">
                <Avatar user={member} size="md" />
              </Link>

              {/* Info - also clickable */}
              <Link to={`/users/${member.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {member.name}
                  </span>
                  <RoleBadge role={member.role} size="xs" />
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {member.location || 'Location not set'}
                </p>
              </Link>

              {/* Edit button with popover */}
              {showEditButton && (
                <div className="relative flex-shrink-0">
                  <IconButton
                    icon={PencilIcon}
                    onClick={() =>
                      setOpenPopoverId(openPopoverId === member.id ? null : member.id)
                    }
                    label={`Manage ${member.name}`}
                    size="sm"
                    variant="subtle"
                  />

                  <MemberActionsPopover
                    isOpen={openPopoverId === member.id}
                    onClose={() => setOpenPopoverId(null)}
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
        })}
      </div>
    </Card>
  );
}
