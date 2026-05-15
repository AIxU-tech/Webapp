/**
 * MapMissingCoordsBanner
 *
 * Small collapsible banner shown above the map when universities can't be
 * placed. Distinguishes between transient failures (will retry on next poll)
 * and not_found / pending lookups.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon, AlertCircleIcon } from '../icons';

export default function MapMissingCoordsBanner({ universities = [] }) {
  const missing = useMemo(
    () =>
      universities.filter(
        (u) =>
          typeof u?.latitude !== 'number' ||
          typeof u?.longitude !== 'number' ||
          !Number.isFinite(u.latitude) ||
          !Number.isFinite(u.longitude),
      ),
    [universities],
  );

  const [expanded, setExpanded] = useState(false);

  if (missing.length === 0) return null;

  const retrying = missing.filter(
    (u) => u.geocodeStatus == null || u.geocodeStatus === 'failed',
  ).length;

  const count = missing.length;
  const label = `${count} ${count === 1 ? 'club is' : 'clubs are'} not shown on the map`;

  return (
    <div className="mb-4 border border-border bg-card rounded-xl text-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-muted/40 rounded-xl transition-colors"
        aria-expanded={expanded}
      >
        <AlertCircleIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-foreground">{label}</span>
        {retrying > 0 && (
          <span className="text-xs text-muted-foreground italic">
            (retrying…)
          </span>
        )}
        <span className="ml-auto text-muted-foreground">
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {expanded && (
        <ul className="border-t border-border px-4 py-2 space-y-1">
          {missing.map((u) => (
            <li key={u.id} className="text-muted-foreground">
              <Link
                to={`/universities/${u.id}`}
                className="hover:text-primary transition-colors"
              >
                {u.clubName || u.name}
              </Link>
              {u.location && (
                <span className="text-muted-foreground/70"> — {u.location}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
