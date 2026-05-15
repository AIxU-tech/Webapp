/**
 * UniversityEventsTab
 *
 * Displays a university's events with a pill toggle to switch between
 * upcoming and past events. Hovering the inactive pill prefetches that
 * view so flipping feels instant. Includes create event functionality
 * for executives and above.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useUniversityEvents,
  useToggleRsvp,
  useDeleteEvent,
  prefetchUniversityEvents,
} from '../../hooks';
import { EventCard, CreateEventModal, AttendanceQRModal } from '../events';
import {
  LoadingState,
  EmptyState,
  GradientButton,
  ConfirmationModal,
  ToggleTag,
  TagGroup,
} from '../ui';
import { CalendarIcon, PlusIcon } from '../icons';

// Empty options object matches the cache key used by global prefetches in
// services/prefetch.js (which prefetches with {}). Keeping this stable
// avoids missing the warm cache on first render.
const UPCOMING_OPTIONS = {};
const PAST_OPTIONS = { upcoming: false };

export default function UniversityEventsTab({
  universityId,
  canCreateEvent = false,
  canManageEvents = false,
  currentUserId,
  isAuthenticated,
}) {
  const queryClient = useQueryClient();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Which slice of events the user is viewing: 'upcoming' (default) or 'past'.
  const [view, setView] = useState('upcoming');
  const isUpcoming = view === 'upcoming';
  const eventOptions = isUpcoming ? UPCOMING_OPTIONS : PAST_OPTIONS;

  const { data: events, isLoading, error } = useUniversityEvents(universityId, eventOptions);

  // Warm the cache for the other view on hover so the toggle feels instant.
  const handleHoverView = (target) => {
    if (target === view) return;
    prefetchUniversityEvents(
      queryClient,
      universityId,
      target === 'upcoming' ? UPCOMING_OPTIONS : PAST_OPTIONS,
    );
  };

  // Mutation hooks
  const rsvpMutation = useToggleRsvp();
  const deleteMutation = useDeleteEvent();

  // Handle RSVP action
  const handleRsvp = (eventId) => {
    if (!isAuthenticated) {
      alert('Please log in to RSVP');
      return;
    }
    rsvpMutation.mutate({ eventId });
  };

  // Handle edit action - open modal in edit mode
  const handleEdit = (event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  // QR modal state: { id, title } when open, null when closed
  const [qrEvent, setQrEvent] = useState(null);

  // Handle delete action - opens confirmation modal
  const [eventToDelete, setEventToDelete] = useState(null);

  const handleDelete = (eventId) => {
    setEventToDelete(eventId);
  };

  const handleConfirmDelete = () => {
    if (eventToDelete) {
      deleteMutation.mutate(eventToDelete);
      setEventToDelete(null);
    }
  };

  // Empty-state copy depends on which view the user is in.
  const emptyTitle = isUpcoming ? 'No upcoming events' : 'No past events';
  const emptyDescription = isUpcoming
    ? canCreateEvent
      ? 'No events scheduled yet. Create one to get started!'
      : 'No events scheduled yet. Check back later!'
    : "This university hasn't held any past events yet.";

  // The events list region renders one of: loading, error, empty, or the list.
  // Pulled into a variable so the header (create button + pill toggle) stays
  // visible across all states — switching views shouldn't make the pills
  // disappear while the new slice loads.
  let listContent;
  if (isLoading) {
    listContent = <LoadingState text="Loading events..." />;
  } else if (error) {
    listContent = (
      <EmptyState
        icon={<CalendarIcon className="h-12 w-12" />}
        title="Failed to load events"
        description="There was an error loading events. Please try again."
      />
    );
  } else if (events && events.length > 0) {
    listContent = (
      <div className="space-y-4">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onRsvp={handleRsvp}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onShowQR={(e) =>
              setQrEvent(e ? { id: e.id, title: e.title, attendanceToken: e.attendanceToken } : null)
            }
            currentUserId={currentUserId}
            isAuthenticated={isAuthenticated}
            canManageEvent={canManageEvents}
          />
        ))}
      </div>
    );
  } else {
    listContent = (
      <EmptyState
        icon={<CalendarIcon className="h-12 w-12" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <>
      {/* Header row: Create button + Upcoming/Past pill toggle */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {canCreateEvent ? (
          <GradientButton
            icon={<PlusIcon size="sm" />}
            onClick={() => setIsModalOpen(true)}
          >
            Create Event
          </GradientButton>
        ) : (
          <span />
        )}

        <TagGroup>
          <ToggleTag
            selected={isUpcoming}
            onClick={() => setView('upcoming')}
            onMouseEnter={() => handleHoverView('upcoming')}
          >
            Upcoming
          </ToggleTag>
          <ToggleTag
            selected={!isUpcoming}
            onClick={() => setView('past')}
            onMouseEnter={() => handleHoverView('past')}
          >
            Past
          </ToggleTag>
        </TagGroup>
      </div>

      {listContent}

      {/* Create / Edit Event Modal */}
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        universityId={universityId}
        event={editingEvent}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={eventToDelete !== null}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* Attendance QR Modal */}
      <AttendanceQRModal
        isOpen={qrEvent !== null}
        onClose={() => setQrEvent(null)}
        eventId={qrEvent?.id}
        eventTitle={qrEvent?.title}
        attendanceToken={qrEvent?.attendanceToken}
      />
    </>
  );
}
