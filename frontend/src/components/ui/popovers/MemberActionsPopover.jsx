/**
 * MemberActionsPopover Component
 *
 * A simple dropdown popover that appears when clicking the edit icon
 * next to a member. Shows available actions based on user permissions.
 *
 * Actions:
 * - Make Executive / Make Member (role toggle) - President/Admin only
 * - Make President (transfers presidency) - President/Admin only
 * - Remove from club - Executive/President/Admin
 *
 * @component
 */

import { useRef } from 'react';
import { useEscapeKey, useClickOutside } from '../../../hooks';

// Role constants matching backend
const ROLES = {
  MEMBER: 0,
  EXECUTIVE: 1,
  PRESIDENT: 2,
};

/**
 * MemberActionsPopover
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the popover is visible
 * @param {Function} props.onClose - Callback to close the popover
 * @param {Object} props.member - Member object { id, name, role, roleName }
 * @param {Object} props.permissions - Current user's permissions at this university
 * @param {Function} props.onRoleChange - Callback when role is changed (memberId, newRole)
 * @param {Function} props.onRemove - Callback when remove is clicked (memberId)
 * @param {Function} props.onMakePresident - Callback when make president is clicked (memberId)
 */
export default function MemberActionsPopover({
  isOpen,
  onClose,
  member,
  permissions,
  onRoleChange,
  onRemove,
  onMakePresident,
}) {
  const popoverRef = useRef(null);

  // Close on click outside
  useClickOutside(popoverRef, onClose, isOpen);

  // Close on escape key
  useEscapeKey(isOpen, onClose);

  if (!isOpen || !member) return null;

  const { canManageExecutives, canManageMembers, isSiteAdmin } = permissions || {};
  const memberRole = member.role ?? ROLES.MEMBER;
  const isPresident = memberRole === ROLES.PRESIDENT;
  const isExecutive = memberRole === ROLES.EXECUTIVE;

  // Build action list based on permissions
  const actions = [];

  // Role change options (President/Admin only)
  // Site admins can also manage presidents (demote them)
  if (canManageExecutives && (!isPresident || isSiteAdmin)) {
    if (isPresident) {
      // President -> site admin can demote to Executive
      actions.push({
        id: 'make-executive',
        label: 'Make Executive',
        onClick: () => {
          onRoleChange(member.id, ROLES.EXECUTIVE);
          onClose();
        },
      });
    } else if (isExecutive) {
      // Executive -> can demote to Member
      actions.push({
        id: 'make-member',
        label: 'Make Member',
        onClick: () => {
          onRoleChange(member.id, ROLES.MEMBER);
          onClose();
        },
      });
    } else {
      // Member -> can promote to Executive
      actions.push({
        id: 'make-executive',
        label: 'Make Executive',
        onClick: () => {
          onRoleChange(member.id, ROLES.EXECUTIVE);
          onClose();
        },
      });
    }

    // Make President option (shows confirmation) - not for current president
    if (!isPresident) {
      actions.push({
        id: 'make-president',
        label: 'Make President',
        onClick: () => {
          onMakePresident(member.id);
          onClose();
        },
      });
    }
  }

  // Remove option (Executive/President/Admin can remove, but not president unless site admin)
  if (canManageMembers && (!isPresident || isSiteAdmin)) {
    // Add separator if there are role actions above
    if (actions.length > 0) {
      actions.push({ id: 'separator', separator: true });
    }

    actions.push({
      id: 'remove',
      label: 'Remove from club',
      danger: true,
      onClick: () => {
        onRemove(member.id);
        onClose();
      },
    });
  }

  // If no actions available, don't render
  if (actions.length === 0) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-card border border-border rounded-lg shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100"
      role="menu"
      aria-orientation="vertical"
    >
      {actions.map((action) => {
        if (action.separator) {
          return (
            <div
              key={action.id}
              className="h-px bg-border my-1"
              role="separator"
            />
          );
        }

        return (
          <button
            key={action.id}
            onClick={action.onClick}
            className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
              action.danger
                ? 'text-red-500 hover:bg-red-500/10'
                : 'text-foreground hover:bg-muted'
            }`}
            role="menuitem"
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
