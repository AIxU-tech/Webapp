/**
 * MemberDetailView
 *
 * Detail view for a single member in the executive portal.
 * Shows member profile card and event attendance history.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { formatDateTime } from '../../utils';
import {
  Card,
  EmptyState,
  Avatar,
  IconButton,
  MemberActionsPopover,
  SecondaryButton,
} from '../ui';
import { PencilIcon, ArrowLeftIcon, ClockIcon, ExternalLinkIcon } from '../icons';
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
  const location = useLocation();
  const backPath = location.state?.from || `/executive/${universityId}`;
  const backLabel = location.state?.fromLabel || 'Back to Members';
  const showEditButton = canManageAny && !isCurrentUser;

  return (
    <>
        <SecondaryButton
          variant="ghost"
          size="sm"
          icon={<ArrowLeftIcon className="h-4 w-4" />}
          onClick={() => navigate(backPath)}
          className="mb-6 -ml-2"
        >
          {backLabel}
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
              <div className="flex items-center gap-2 mt-4">
                <SecondaryButton
                  variant="ghost"
                  size="sm"
                  icon={<ExternalLinkIcon size="sm" />}
                  onClick={() => navigate(`/users/${member.id}`)}
                >
                  View Profile
                </SecondaryButton>
                {showEditButton && (
                  <div className="relative">
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
                  role="button"
                  tabIndex={0}
                  aria-label={`View event ${evt.eventTitle}`}
                  onClick={() => navigate(`/executive/${universityId}/events/${evt.eventId}`, {
                    state: { from: `/executive/${universityId}/members/${member.id}`, fromLabel: 'Back to Member' },
                  })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/executive/${universityId}/events/${evt.eventId}`, {
                        state: { from: `/executive/${universityId}/members/${member.id}`, fromLabel: 'Back to Member' },
                      });
                    }
                  }}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 transition-colors rounded-md px-2"
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
    </>
  );
}
