/**
 * MemberDetailView
 *
 * Detail view for a single member in the executive portal.
 * Shows member profile card and event attendance history.
 */

import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../utils';
import {
  Card,
  EmptyState,
  Avatar,
  IconButton,
  MemberActionsPopover,
  SecondaryButton,
} from '../ui';
import { PencilIcon, ArrowLeftIcon, ClockIcon } from '../icons';
import RoleBadge from '../university/RoleBadge';

function AttendanceHistorySkeleton({ rows = 4 }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="flex items-center justify-between py-3 border-b border-border last:border-0 animate-pulse"
        >
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-48" />
            <div className="h-3 bg-muted rounded w-32" />
          </div>
          <div className="h-3 bg-muted rounded w-28" />
        </li>
      ))}
    </ul>
  );
}

export default function MemberDetailView({
  member,
  universityId,
  permissions,
  canManageAny,
  isCurrentUser,
  events,
  isLoading: attendanceLoading,
  openPopoverId,
  onPopoverToggle,
  onClosePopover,
  onRoleChange,
  onRemove,
  onMakePresident,
}) {
  const navigate = useNavigate();
  const showEditButton = canManageAny && !isCurrentUser;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <SecondaryButton
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/executive/${universityId}`)}
          className="mb-6 -ml-2"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Members
        </SecondaryButton>

        <Card padding="lg" className="mb-6">
          <div className="flex items-start gap-4">
            <Avatar user={member} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-foreground truncate">{member.name}</h1>
                <RoleBadge role={member.role} size="sm" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {member.location || 'Location not set'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {member.eventsAttendedCount ?? 0} event
                {(member.eventsAttendedCount ?? 0) !== 1 ? 's' : ''} attended
              </p>
              {showEditButton && (
                <div className="relative mt-4">
                  <IconButton
                    icon={PencilIcon}
                    onClick={() => onPopoverToggle(member.id)}
                    label={`Manage ${member.name}`}
                    size="sm"
                    variant="subtle"
                  />
                  <MemberActionsPopover
                    isOpen={openPopoverId === member.id}
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
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="font-semibold text-foreground mb-4">Event Attendance History</h2>
          {attendanceLoading ? (
            <AttendanceHistorySkeleton />
          ) : events.length === 0 ? (
            <EmptyState
              icon={<ClockIcon className="h-12 w-12" />}
              title="No events attended"
              description="This member has not checked in to any events yet."
            />
          ) : (
            <ul className="space-y-3">
              {events.map((evt) => (
                <li
                  key={evt.eventId}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{evt.eventTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      Event: {formatDateTime(evt.eventStartTime)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Checked in: {formatDateTime(evt.checkedInAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
