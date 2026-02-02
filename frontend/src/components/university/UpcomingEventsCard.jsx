/**
 * UpcomingEventsCard
 *
 * Sidebar card showing upcoming events preview.
 * Fetches real events from the API and displays up to 3.
 */

import { useUniversityEvents } from '../../hooks';
import { Card, SecondaryButton } from '../ui';
import { SpinnerIcon } from '../icons';
import { parseUtcDate } from '../../utils/time';

/**
 * Format date to month/day display
 */
function formatEventDate(dateString) {
  const date = parseUtcDate(dateString) ?? new Date(NaN);
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate().toString(),
  };
}

export default function UpcomingEventsCard({ universityId, onViewAll }) {
  // Fetch up to 3 upcoming events
  const { data: events, isLoading, error } = useUniversityEvents(universityId, {
    limit: 3,
    upcoming: 'true',
  });

  // Loading state - show subtle spinner
  if (isLoading) {
    return (
      <Card padding="md">
        <h3 className="font-semibold text-foreground mb-4">Upcoming Events</h3>
        <div className="flex items-center justify-center py-6">
          <SpinnerIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      </Card>
    );
  }

  // Error or empty state
  if (error || !events || events.length === 0) {
    return (
      <Card padding="md">
        <h3 className="font-semibold text-foreground mb-4">Upcoming Events</h3>
        <p className="text-sm text-muted-foreground py-4 text-center">
          {error ? 'Failed to load events' : 'No upcoming events'}
        </p>
        <SecondaryButton
          variant="outline"
          className="w-full"
          onClick={onViewAll}
        >
          View All Events
        </SecondaryButton>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <h3 className="font-semibold text-foreground mb-4">Upcoming Events</h3>

      <div className="space-y-3">
        {events.map((event) => {
          const { month, day } = formatEventDate(event.startTime);
          return (
            <div key={event.id} className="flex items-center gap-3">
              {/* Date badge */}
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary flex-shrink-0">
                <span className="text-[10px] font-medium uppercase leading-none">
                  {month}
                </span>
                <span className="text-sm font-bold leading-tight">{day}</span>
              </div>

              {/* Event title */}
              <p className="text-sm font-medium text-foreground truncate flex-1">
                {event.title}
              </p>
            </div>
          );
        })}
      </div>

      <SecondaryButton
        variant="outline"
        className="w-full mt-4"
        onClick={onViewAll}
      >
        View All Events
      </SecondaryButton>
    </Card>
  );
}
