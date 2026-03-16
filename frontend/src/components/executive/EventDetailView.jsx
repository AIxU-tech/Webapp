/**
 * EventDetailView
 *
 * Detail view for a single event in the executive portal.
 * Shows event info, RSVPs, and physical check-in attendance.
 */

import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../utils';
import { Card, SecondaryButton } from '../ui';
import { ArrowLeftIcon, CalendarIcon, UsersIcon } from '../icons';
import UserActionListCard from './UserActionListCard';

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
          <UserActionListCard
            title="RSVPs"
            icon={UsersIcon}
            items={attendees}
            getItemKey={(a) => a.id}
            renderUser={(a) => a}
            renderSubtitle={(a) => (a.rsvpAt ? `RSVP'd ${formatDateTime(a.rsvpAt)}` : null)}
            emptyIcon={UsersIcon}
            emptyTitle="No RSVPs"
            emptyDescription="No one has RSVP'd to this event yet."
          />

          <UserActionListCard
            title="Checked In"
            icon={UsersIcon}
            items={attendanceRecords}
            getItemKey={(r) => r.id}
            renderUser={(r) => ({ id: r.userId, name: r.name })}
            renderSubtitle={(r) => (r.checkedInAt ? formatDateTime(r.checkedInAt) : null)}
            emptyIcon={UsersIcon}
            emptyTitle="No one checked in"
            emptyDescription="Attendance will appear here after members check in via QR code."
            isLoading={isLoadingAttendance}
          />
        </div>
      </div>
    </div>
  );
}
