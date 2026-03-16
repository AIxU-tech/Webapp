/**
 * EventDetailView
 *
 * Detail view for a single event in the executive portal.
 * Shows event info, RSVPs, and physical check-in attendance.
 */

import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../utils';
import {
  Card,
  EmptyState,
  Avatar,
  SecondaryButton,
} from '../ui';
import { ArrowLeftIcon, CalendarIcon, UsersIcon } from '../icons';

function AttendanceListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-3 bg-muted rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EventDetailView({
  event,
  universityId,
  attendees,
  attendanceRecords,
  isLoadingEvent,
  isLoadingAttendance,
}) {
  const navigate = useNavigate();

  if (isLoadingEvent || !event) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <SecondaryButton
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/executive/${universityId}/events`)}
            className="mb-6 -ml-2"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Events
          </SecondaryButton>
          <Card padding="lg">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-1/3" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const isPast = event.endTime
    ? new Date(event.endTime) < new Date()
    : new Date(event.startTime) < new Date();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <SecondaryButton
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/executive/${universityId}/events`)}
          className="mb-6 -ml-2"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Events
        </SecondaryButton>

        <Card padding="lg" className="mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-muted-foreground">
              <CalendarIcon className="h-12 w-12" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-foreground">{event.title}</h1>
                {isPast && (
                  <span className="text-xs px-2 py-0.5 rounded bg-muted">Past</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDateTime(event.startTime)}
                {event.endTime ? ` – ${formatDateTime(event.endTime)}` : ''}
              </p>
              {event.location && (
                <p className="text-sm text-muted-foreground mt-1">{event.location}</p>
              )}
              {event.description && (
                <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {event.attendeeCount ?? 0} RSVP{(event.attendeeCount ?? 0) !== 1 ? 's' : ''} ·{' '}
                {attendanceRecords?.length ?? 0} checked in
              </p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card padding="lg">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              RSVPs ({attendees?.length ?? 0})
            </h2>
            {!attendees?.length ? (
              <EmptyState
                icon={<UsersIcon className="h-10 w-10" />}
                title="No RSVPs"
                description="No one has RSVP'd to this event yet."
              />
            ) : (
              <ul className="space-y-3">
                {attendees.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                  >
                    <Avatar user={a} name={a.name} size="sm" />
                    <div>
                      <p className="font-medium text-foreground text-sm">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        RSVP'd {formatDateTime(a.rsvpAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padding="lg">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Checked In ({attendanceRecords?.length ?? 0})
            </h2>
            {isLoadingAttendance ? (
              <AttendanceListSkeleton />
            ) : !attendanceRecords?.length ? (
              <EmptyState
                icon={<UsersIcon className="h-10 w-10" />}
                title="No one checked in"
                description="Attendance will appear here after members check in via QR code."
              />
            ) : (
              <ul className="space-y-3">
                {attendanceRecords.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                  >
                    <Avatar user={{ id: r.userId, name: r.name }} name={r.name} size="sm" />
                    <div>
                      <p className="font-medium text-foreground text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(r.checkedInAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
