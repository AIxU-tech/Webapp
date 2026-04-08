/**
 * ExecutivePortalEventsPage
 *
 * Events view for the executive portal.
 * Lists all university events with create/edit/delete and QR code actions.
 * Clicking a row shows event detail with RSVPs and attendance side by side.
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
import { EventsTableView, EventDetailView, ExecutivePortalSkeleton, ExecutivePortalLayout } from '../components/executive';
import { SecondaryButton } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export default function ExecutivePortalEventsPage() {
  const { universityId, eventId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuth();

  const { data: university, isLoading: universityLoading, error: universityError } =
    useUniversity(universityId);
  const { data: events, isLoading: eventsLoading } = useUniversityEvents(universityId, {
    upcoming: false,
    limit: 100,
  });
  const { data: event, isLoading: eventLoading, isError: eventError } = useEvent(eventId);
  const { data: attendanceData, isLoading: attendanceLoading } = useEventAttendance(eventId);

  const permissions = university?.permissions ?? {};
  const { canManageMembers, isSiteAdmin } = permissions;
  const canManageEvents = isAuthenticated && (canManageMembers || isSiteAdmin);

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
        <SecondaryButton className="mt-4" variant="primary" onClick={() => navigate(-1)}>
          Go Back
        </SecondaryButton>
      </div>
    );
  }

  if (eventId) {
    if (eventError && !eventLoading) {
      return (
        <ExecutivePortalLayout university={university} universityId={universityId}>
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
        </ExecutivePortalLayout>
      );
    }
    return (
      <ExecutivePortalLayout university={university} universityId={universityId}>
        <EventDetailView
          event={event}
          universityId={universityId}
          attendees={event?.attendees ?? []}
          attendanceRecords={attendanceData?.attendance ?? []}
          isLoadingEvent={eventLoading}
          isLoadingAttendance={attendanceLoading && !!eventId}
          canManageEvents={canManageEvents}
        />
      </ExecutivePortalLayout>
    );
  }

  return (
    <ExecutivePortalLayout university={university} universityId={universityId}>
      <EventsTableView
        universityId={universityId}
        events={events ?? []}
        isLoading={eventsLoading}
        canManageEvents={canManageEvents}
      />
    </ExecutivePortalLayout>
  );
}
