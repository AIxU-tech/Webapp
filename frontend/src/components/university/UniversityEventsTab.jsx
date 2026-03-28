/**
 * UniversityEventsTab
 *
 * Displays upcoming events for the university using the events API.
 * Includes create event functionality for executives and above.
 */

import { useState } from 'react';
import { useUniversityEvents, useToggleRsvp, useDeleteEvent } from '../../hooks';
import { EventCard, CreateEventModal, AttendanceQRModal } from '../events';
import { LoadingState, EmptyState, GradientButton, ConfirmationModal } from '../ui';
import { CalendarIcon, PlusIcon } from '../icons';

export default function UniversityEventsTab({
  universityId,
  canCreateEvent = false,
  canManageEvents = false,
  currentUserId,
  isAuthenticated,
}) {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Fetch events for this university
  const { data: events, isLoading, error } = useUniversityEvents(universityId);

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

  // Loading state
  if (isLoading) {
    return <LoadingState text="Loading events..." />;
  }

  // Error state
  if (error) {
    return (
      <EmptyState
        icon={<CalendarIcon className="h-12 w-12" />}
        title="Failed to load events"
        description="There was an error loading events. Please try again."
      />
    );
  }

  // Render content
  return (
    <>
      {/* Create Event Button (executives+ only) */}
      {canCreateEvent && (
        <div className="mb-6">
          <GradientButton
            icon={<PlusIcon size="sm" />}
            onClick={() => setIsModalOpen(true)}
          >
            Create Event
          </GradientButton>
        </div>
      )}

      {/* Events List */}
      {events && events.length > 0 ? (
        <div className="space-y-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onRsvp={handleRsvp}
              onEdit={handleEdit}
              onDelete={handleDelete}
                  onShowQR={(event) =>
                    setQrEvent(event ? { id: event.id, title: event.title, attendanceToken: event.attendanceToken } : null)
                  }
              currentUserId={currentUserId}
              isAuthenticated={isAuthenticated}
              canManageEvent={canManageEvents}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarIcon className="h-12 w-12" />}
          title="No upcoming events"
          description={
            canCreateEvent
              ? "No events scheduled yet. Create one to get started!"
              : "No events scheduled yet. Check back later!"
          }
        />
      )}

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
