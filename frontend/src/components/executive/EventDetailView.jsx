/**
 * EventDetailView
 *
 * Detail view for a single event in the executive portal.
 * Shows event info, edit/delete/QR actions, and RSVPs vs attendance side by side
 * so executives can see who RSVPed but didn't attend.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../utils';
import { Card, SecondaryButton, GradientButton, ConfirmationModal } from '../ui';
import { ArrowLeftIcon, CalendarIcon, UsersIcon, PencilIcon, TrashIcon, QRCodeIcon, CheckIcon } from '../icons';
import { CreateEventModal, AttendanceQRModal } from '../events';
import { useDeleteEvent } from '../../hooks';
import UserActionListCard from './UserActionListCard';

export default function EventDetailView({
  event,
  universityId,
  attendees,
  attendanceRecords,
  isLoadingEvent,
  isLoadingAttendance,
  canManageEvents = false,
}) {
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [qrEvent, setQrEvent] = useState(null);
  const deleteMutation = useDeleteEvent();

  const handleDelete = () => {
    if (event) {
      deleteMutation.mutate(event.id, {
        onSuccess: () => navigate(`/executive/${universityId}/events`),
      });
    }
    setShowDeleteConfirm(false);
  };

  if (isLoadingEvent || !event) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <SecondaryButton
            variant="ghost"
            size="sm"
            icon={<ArrowLeftIcon className="h-4 w-4" />}
            onClick={() => navigate(`/executive/${universityId}/events`)}
            className="mb-6 -ml-2"
          >
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

  const checkedInUserIds = new Set(
    (attendanceRecords ?? []).map((r) => r.userId).filter(Boolean)
  );
  const noShowCount = (attendees ?? []).filter((a) => !checkedInUserIds.has(a.id)).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <SecondaryButton
          variant="ghost"
          size="sm"
          icon={<ArrowLeftIcon className="h-4 w-4" />}
          onClick={() => navigate(`/executive/${universityId}/events`)}
          className="mb-6 -ml-2"
        >
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

              {canManageEvents && (
                <div className="flex items-center gap-2 mt-4">
                  <SecondaryButton
                    variant="ghost"
                    size="sm"
                    icon={<QRCodeIcon size="sm" />}
                    onClick={() =>
                      setQrEvent({
                        id: event.id,
                        title: event.title,
                        attendanceToken: event.attendanceToken,
                      })
                    }
                    className="whitespace-nowrap"
                  >
                    QR Code
                  </SecondaryButton>
                  <SecondaryButton
                    variant="ghost"
                    size="sm"
                    icon={<PencilIcon size="sm" />}
                    onClick={() => setIsEditModalOpen(true)}
                    className="whitespace-nowrap"
                  >
                    Edit
                  </SecondaryButton>
                  <SecondaryButton
                    variant="ghost"
                    size="sm"
                    icon={<TrashIcon size="sm" />}
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-destructive hover:text-destructive whitespace-nowrap"
                  >
                    Delete
                  </SecondaryButton>
                </div>
              )}
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
            onUserClick={(a) => navigate(`/executive/${universityId}/members/${a.id}`)}
            renderSubtitle={(a) => {
              const didAttend = checkedInUserIds.has(a.id);
              const rsvpText = a.rsvpAt ? `RSVP'd ${formatDateTime(a.rsvpAt)}` : null;
              if (didAttend) {
                return (
                  <span className="flex items-center gap-1">
                    {rsvpText && <span>{rsvpText} ·</span>}
                    <span className="text-green-600 flex items-center gap-0.5">
                      <CheckIcon size="xs" /> Attended
                    </span>
                  </span>
                );
              }
              return (
                <span className="flex items-center gap-1">
                  {rsvpText && <span>{rsvpText}</span>}
                  {isPast && <span className="text-amber-500"> · Did not attend</span>}
                </span>
              );
            }}
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
            onUserClick={(r) => navigate(`/executive/${universityId}/members/${r.userId}`)}
            renderSubtitle={(r) => (r.checkedInAt ? formatDateTime(r.checkedInAt) : null)}
            emptyIcon={UsersIcon}
            emptyTitle="No one checked in"
            emptyDescription="Attendance will appear here after members check in via QR code."
            isLoading={isLoadingAttendance}
          />
        </div>
      </div>

      <CreateEventModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        universityId={universityId}
        event={event}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
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
    </div>
  );
}
