/**
 * MemberTableView
 *
 * Dashboard view for the executive portal.
 * Lists all members with links to their detail pages.
 */

import { Card, EmptyState } from '../ui';
import { UsersIcon } from '../icons';
import ExecutivePortalLayout from './ExecutivePortalLayout';
import MemberCard from './MemberCard';

export default function MemberTableView({
  university,
  universityId,
  members,
  permissions,
  currentUserId,
  openPopoverId,
  onPopoverToggle,
  onClosePopover,
  onRoleChange,
  onRemove,
  onMakePresident,
}) {
  const { canManageMembers, canManageExecutives, isSiteAdmin } = permissions;
  const canManageAny = canManageMembers || canManageExecutives || isSiteAdmin;
  const sortedMembers = [...members].sort((a, b) => (b.role ?? 0) - (a.role ?? 0));

  return (
    <ExecutivePortalLayout university={university} universityId={universityId}>
      <Card padding="md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">All Members</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage roles and view attendance history
            </p>
          </div>
          {sortedMembers.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {sortedMembers.length} member{sortedMembers.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {sortedMembers.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-12 w-12" />}
            title="No members yet"
            description="Be the first to join by registering with your university email!"
          />
        ) : (
          <div className="space-y-2">
            {sortedMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                universityId={universityId}
                permissions={permissions}
                canManageAny={canManageAny}
                isCurrentUser={member.id === currentUserId}
                isPopoverOpen={openPopoverId === member.id}
                onPopoverToggle={onPopoverToggle}
                onClosePopover={onClosePopover}
                onRoleChange={onRoleChange}
                onRemove={onRemove}
                onMakePresident={onMakePresident}
              />
            ))}
          </div>
        )}
      </Card>
    </ExecutivePortalLayout>
  );
}
