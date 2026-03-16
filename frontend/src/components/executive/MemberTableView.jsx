/**
 * MemberTableView
 *
 * Dashboard view for the executive portal.
 * Lists all members with links to their detail pages.
 */

import { UsersIcon } from '../icons';
import ExecutivePortalLayout from './ExecutivePortalLayout';
import ExecutiveSectionCard from './ExecutiveSectionCard';
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
  const isEmpty = sortedMembers.length === 0;

  return (
    <ExecutivePortalLayout university={university} universityId={universityId}>
      <ExecutiveSectionCard
        title="All Members"
        subtitle="Manage roles and view attendance history"
        count={isEmpty ? undefined : `${sortedMembers.length} member${sortedMembers.length !== 1 ? 's' : ''}`}
        isEmpty={isEmpty}
        emptyIcon={UsersIcon}
        emptyTitle="No members yet"
        emptyDescription="Be the first to join by registering with your university email!"
      >
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
      </ExecutiveSectionCard>
    </ExecutivePortalLayout>
  );
}
