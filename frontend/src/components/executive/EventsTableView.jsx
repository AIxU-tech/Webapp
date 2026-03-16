/**
 * EventsTableView
 *
 * Lists all university events for the executive portal.
 * Executives can view upcoming and past events.
 */

import { Card, EmptyState } from '../ui';
import { CalendarIcon } from '../icons';
import ExecutivePortalLayout from './ExecutivePortalLayout';
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
}) {
  return (
    <ExecutivePortalLayout university={university} universityId={universityId}>
      <Card padding="md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">All Events</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              View RSVPs and attendance for each event
            </p>
          </div>
          {!isLoading && events?.length != null && (
            <span className="text-sm text-muted-foreground">
              {events.length} event{events.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isLoading ? (
            <EventsTableSkeleton />
          ) : !events?.length ? (
            <EmptyState
              icon={<CalendarIcon className="h-12 w-12" />}
              title="No events yet"
              description="Create your first event from the university page."
            />
        ) : (
          <div className="space-y-0">
            {events.map((event) => (
              <EventRow key={event.id} event={event} universityId={universityId} />
            ))}
          </div>
        )}
      </Card>
    </ExecutivePortalLayout>
  );
}
