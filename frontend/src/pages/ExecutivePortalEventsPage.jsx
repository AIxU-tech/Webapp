/**
 * ExecutivePortalEventsPage
 *
 * Events view for the executive portal.
 * Lists all university events; clicking a row shows event detail with RSVPs and attendance.
 *
 * Routes:
 * - /executive/:universityId/events - Events list
 * - /executive/:universityId/events/:eventId - Event detail
 */

import { useParams, useNavigate } from 'react-router-dom';
import {
  useUniversity,
  useUniversityEvents,
  useEvent,
  useEventAttendance,
  usePageTitle,
} from '../hooks';
import { EventsTableView, EventDetailView, ExecutivePortalSkeleton } from '../components/executive';
import { SecondaryButton } from '../components/ui';

export default function ExecutivePortalEventsPage() {
  const { universityId, eventId } = useParams();
  const navigate = useNavigate();

  const { data: university, isLoading: universityLoading, error: universityError } =
    useUniversity(universityId);
  const { data: events, isLoading: eventsLoading } = useUniversityEvents(universityId, {
    upcoming: false,
    limit: 100,
  });
  const { data: event, isLoading: eventLoading, isError: eventError } = useEvent(eventId);
  const { data: attendanceData, isLoading: attendanceLoading } = useEventAttendance(eventId);

  usePageTitle(
    event?.title
      ? `Event: ${event.title} – ${university?.name ?? ''}`
      : university?.name
        ? `Events – ${university.name}`
        : 'Events'
  );

  if (universityLoading || !university) {
    return <ExecutivePortalSkeleton />;
  }

  if (universityError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">
          {universityError.message || 'Failed to load university.'}
        </p>
        <SecondaryButton className="mt-4" variant="primary" onClick={() => window.history.back()}>
          Go Back
        </SecondaryButton>
      </div>
    );
  }

  if (eventId) {
    if (eventError && !eventLoading) {
      return (
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <SecondaryButton
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/executive/${universityId}/events`)}
              className="mb-6 -ml-2"
            >
              ← Back to Events
            </SecondaryButton>
            <p className="text-muted-foreground">Event not found.</p>
            <SecondaryButton
              className="mt-4"
              variant="primary"
              onClick={() => navigate(`/executive/${universityId}/events`)}
            >
              View All Events
            </SecondaryButton>
          </div>
        </div>
      );
    }
    return (
      <EventDetailView
        event={event}
        universityId={universityId}
        attendees={event?.attendees ?? []}
        attendanceRecords={attendanceData?.attendance ?? []}
        isLoadingEvent={eventLoading}
        isLoadingAttendance={attendanceLoading && !!eventId}
      />
    );
  }

  return (
    <EventsTableView
      university={university}
      universityId={universityId}
      events={events ?? []}
      isLoading={eventsLoading}
    />
  );
}
