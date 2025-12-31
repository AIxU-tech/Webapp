/**
 * UniversityEventsTab
 *
 * Displays upcoming events for the university using the events API.
 * Includes create event functionality for executives and above.
 */

import { useState } from 'react';
import { useUniversityEvents, useToggleRsvp, useDeleteEvent } from '../../hooks';
import EventCard from '../EventCard';
import CreateEventModal from '../CreateEventModal';
import { LoadingState, EmptyState, GradientButton } from '../ui';
import { CalendarIcon, PlusIcon } from '../icons';

export default function UniversityEventsTab({
  universityId,
  canCreateEvent = false,
  currentUserId,
  isAuthenticated,
}) {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Handle delete action
  const handleDelete = (eventId) => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteMutation.mutate(eventId);
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
            icon={<PlusIcon className="h-4 w-4" />}
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
              onDelete={handleDelete}
              currentUserId={currentUserId}
              isAuthenticated={isAuthenticated}
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

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        universityId={universityId}
      />
    </>
  );
}
