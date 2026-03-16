/**
 * EventRow
 *
 * Clickable row for an event in the executive portal events table.
 * Shows event title, date, and RSVP/attendance counts.
 */

import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../utils';
import { CalendarIcon } from '../icons';

export default function EventRow({ event, universityId }) {
  const navigate = useNavigate();
  const isPast = event.endTime
    ? new Date(event.endTime) < new Date()
    : new Date(event.startTime) < new Date();

  const handleClick = () => {
    navigate(`/executive/${universityId}/events/${event.id}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
      className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted transition-colors cursor-pointer border-b border-border last:border-0"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex-shrink-0 text-muted-foreground">
          <CalendarIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{event.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(event.startTime)}
            {event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0 text-sm text-muted-foreground">
        <span title="RSVPs">{event.attendeeCount ?? 0} RSVP{(event.attendeeCount ?? 0) !== 1 ? 's' : ''}</span>
        <span title="Checked in">{event.attendanceCount ?? 0} checked in</span>
        {isPast && (
          <span className="text-xs px-2 py-0.5 rounded bg-muted">Past</span>
        )}
      </div>
    </div>
  );
}
