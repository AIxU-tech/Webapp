/**
 * EventCard Component
 *
 * Displays an event card with date badge, event details, and RSVP functionality.
 * Used in university detail pages to show upcoming events.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui';
import { ClockIcon, MapPinIcon, UsersIcon, TrashIcon, CheckIcon } from '../icons';
import { parseUtcDate } from '../../utils/time';

/**
 * DateBadge - Compact date display with month and day
 */
function DateBadge({ date }) {
  const eventDate = parseUtcDate(date) ?? new Date(NaN);
  const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = eventDate.getDate();

  return (
    <div className="flex flex-col items-center justify-center w-14 h-14 bg-primary/10 rounded-lg flex-shrink-0">
      <span className="text-xs font-semibold text-primary">{month}</span>
      <span className="text-xl font-bold text-primary leading-none">{day}</span>
    </div>
  );
}

/**
 * Format time range for display
 */
function formatTimeRange(startTime, endTime) {
  const start = parseUtcDate(startTime) ?? new Date(NaN);
  const options = { hour: 'numeric', minute: '2-digit', hour12: true };
  let timeStr = start.toLocaleTimeString('en-US', options);

  if (endTime) {
    const end = parseUtcDate(endTime) ?? new Date(NaN);
    timeStr += ` - ${end.toLocaleTimeString('en-US', options)}`;
  }

  return timeStr;
}

/**
 * Get time ago string for event creation
 */
function getTimeAgo(dateString) {
  const date = parseUtcDate(dateString) ?? new Date(NaN);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function EventCard({
  event,
  onRsvp,
  onDelete,
  currentUserId,
  isAuthenticated = false,
}) {
  // State for expanding/collapsing description
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine if current user can delete this event
  const isCreator = isAuthenticated && currentUserId && event.createdById === currentUserId;

  // Handle RSVP click
  const handleRsvp = () => {
    if (!isAuthenticated) {
      alert('Please log in to RSVP');
      return;
    }
    onRsvp?.(event.id);
  };

  return (
    <Card padding="md" className="group">
      <div className="flex gap-4">
        {/* Date Badge */}
        <DateBadge date={event.startTime} />

        {/* Event Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {event.title}
              </h3>
              {event.createdBy && (
                <p className="text-sm text-muted-foreground">
                  by{' '}
                  <Link
                    to={`/users/${event.createdBy.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    {event.createdBy.name}
                  </Link>
                  {event.createdAt && ` • ${getTimeAgo(event.createdAt)}`}
                </p>
              )}
            </div>

            {/* Delete Button */}
            {isCreator && (
              <button
                onClick={() => onDelete?.(event.id)}
                className="text-muted-foreground hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                title="Delete event"
                aria-label="Delete event"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="mb-3">
              <p
                className={`text-muted-foreground text-sm ${!isExpanded ? 'line-clamp-2' : ''
                  }`}
              >
                {event.description}
              </p>
              {event.description.length > 100 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-primary text-sm font-medium hover:text-primary/80 transition-colors mt-1 cursor-pointer"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-3">
            {/* Time */}
            <span className="flex items-center gap-1.5">
              <ClockIcon className="h-4 w-4" />
              {formatTimeRange(event.startTime, event.endTime)}
            </span>

            {/* Location */}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="h-4 w-4" />
                <span className="truncate max-w-[200px]">{event.location}</span>
              </span>
            )}

            {/* Attendee Count */}
            <span className="flex items-center gap-1.5">
              <UsersIcon className="h-4 w-4" />
              {event.attendeeCount || 0} attending
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRsvp}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${event.isAttending
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-foreground hover:bg-accent'
                }`}
              aria-label={event.isAttending ? 'Cancel RSVP' : 'RSVP to event'}
            >
              {event.isAttending && <CheckIcon className="h-4 w-4" />}
              {event.isAttending ? 'Attending' : 'RSVP'}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
