/**
 * EventsTableView
 *
 * Lists all university events for the executive portal.
 * Executives can view upcoming and past events.
 */

import { CalendarIcon } from '../icons';
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
}) {
  const isEmpty = !events?.length;

  return (
    <ExecutivePortalLayout university={university} universityId={universityId}>
      <ExecutiveSectionCard
        title="All Events"
        subtitle="View RSVPs and attendance for each event"
        count={!isLoading && events?.length != null ? `${events.length} event${events.length !== 1 ? 's' : ''}` : undefined}
        isEmpty={isEmpty}
        emptyIcon={CalendarIcon}
        emptyTitle="No events yet"
        emptyDescription="Create your first event from the university page."
        isLoading={isLoading}
        skeleton={<EventsTableSkeleton />}
      >
        <div className="space-y-0">
          {events.map((event) => (
            <EventRow key={event.id} event={event} universityId={universityId} />
          ))}
        </div>
      </ExecutiveSectionCard>
    </ExecutivePortalLayout>
  );
}
