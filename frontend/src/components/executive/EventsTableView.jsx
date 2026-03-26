/**
 * EventsTableView
 *
 * Lists all university events for the executive portal.
 * Executives can create, edit, delete events and show QR codes.
 * Reuses CreateEventModal and AttendanceQRModal from the events components.
 */

import { useState } from 'react';
import { CalendarIcon, PlusIcon } from '../icons';
import { GradientButton, ConfirmationModal } from '../ui';
import { CreateEventModal, AttendanceQRModal } from '../events';
import { useDeleteEvent } from '../../hooks';
import ExecutivePortalLayout from './ExecutivePortalLayout';
import ExecutiveSectionCard from './ExecutiveSectionCard';
import EventRow from './EventRow';

function EventsTableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between py-3 px-3 border-b border-border last:border-0 animate-pulse"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="h-5 w-5 bg-muted rounded" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-48" />
              <div className="h-3 bg-muted rounded w-32" />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="h-3 bg-muted rounded w-12" />
            <div className="h-3 bg-muted rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EventsTableView({
  university,
  universityId,
  events,
  isLoading,
  canManageEvents = false,
}) {
  const isEmpty = !events?.length;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [qrEvent, setQrEvent] = useState(null);

  const deleteMutation = useDeleteEvent();

  const handleEdit = (event) => {
    setEditingEvent(event);
    setIsCreateModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (eventToDelete) {
      deleteMutation.mutate(eventToDelete);
      setEventToDelete(null);
    }
  };

  const headerAction = canManageEvents ? (
    <GradientButton
      icon={<PlusIcon size="sm" />}
      size="sm"
      onClick={() => setIsCreateModalOpen(true)}
    >
      Create Event
    </GradientButton>
  ) : null;

  return (
    <ExecutivePortalLayout university={university} universityId={universityId}>
      <ExecutiveSectionCard
        title="All Events"
        subtitle="View RSVPs and attendance for each event"
        count={!isLoading && events?.length != null ? `${events.length} event${events.length !== 1 ? 's' : ''}` : undefined}
        isEmpty={isEmpty}
        emptyIcon={CalendarIcon}
        emptyTitle="No events yet"
        emptyDescription={canManageEvents ? 'Create your first event to get started.' : 'No events have been created yet.'}
        isLoading={isLoading}
        skeleton={<EventsTableSkeleton />}
        action={headerAction}
      >
        <div className="space-y-0">
          {events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              universityId={universityId}
              canManageEvents={canManageEvents}
              onEdit={handleEdit}
              onDelete={setEventToDelete}
              onShowQR={(evt) =>
                setQrEvent({ id: evt.id, title: evt.title, attendanceToken: evt.attendanceToken })
              }
            />
          ))}
        </div>
      </ExecutiveSectionCard>

      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingEvent(null);
        }}
        universityId={universityId}
        event={editingEvent}
      />

      <ConfirmationModal
        isOpen={eventToDelete !== null}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <AttendanceQRModal
        isOpen={qrEvent !== null}
        onClose={() => setQrEvent(null)}
        eventId={qrEvent?.id}
        eventTitle={qrEvent?.title}
        attendanceToken={qrEvent?.attendanceToken}
      />
    </ExecutivePortalLayout>
  );
}
