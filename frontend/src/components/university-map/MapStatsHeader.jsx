/**
 * MapStatsHeader
 *
 * Small context strip rendered above the university map that summarises
 * the AIxU footprint at a glance: total clubs, distinct US states covered,
 * total members, and total upcoming events.
 *
 * All numbers are derived client-side from the universities the parent
 * already has loaded — no extra request, no separate cache key. This means
 * the stats reflect whatever filtering the parent has applied, so e.g.
 * searching narrows the numbers in lockstep with the map pins. If you want
 * "global" stats that ignore the search, pass the unfiltered list in via
 * the `universities` prop instead.
 *
 * The "states" count is parsed best-effort from each university's free-form
 * `location` string (trailing token after the last comma). Universities
 * with locations that don't follow the "City, State" convention won't
 * contribute to the count — which is fine for a hero-style summary where
 * exactness matters less than scale.
 */

import { useMemo } from 'react';

// Two-letter US state postal codes. We use this to normalise "CA" and
// "California" into the same bucket so cities written either way both
// count toward the same state.
const STATE_NAME_BY_CODE = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};
const STATE_CODE_BY_NAME = Object.fromEntries(
  Object.entries(STATE_NAME_BY_CODE).map(([code, name]) => [name.toLowerCase(), code]),
);

/**
 * Best-effort canonicalisation of a free-form location string into a US
 * state postal code. Returns null when the trailing token doesn't look
 * like a state (e.g. international locations, locations missing a state).
 */
function extractStateCode(location) {
  if (!location || typeof location !== 'string') return null;
  const parts = location
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  // Walk from the tail so trailing "USA" / "United States" doesn't shadow
  // the state token.
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const token = parts[i];
    const upper = token.toUpperCase();
    if (upper === 'USA' || upper === 'US' || upper === 'UNITED STATES') continue;
    if (/^[A-Z]{2}$/.test(upper) && STATE_NAME_BY_CODE[upper]) return upper;
    const byName = STATE_CODE_BY_NAME[token.toLowerCase()];
    if (byName) return byName;
    // First non-country token that didn't match a state — stop walking
    // so we don't accidentally pick up a city name from further left.
    return null;
  }
  return null;
}

export default function MapStatsHeader({ universities = [] }) {
  const stats = useMemo(() => {
    const states = new Set();
    let members = 0;
    for (const u of universities) {
      const code = extractStateCode(u?.location);
      if (code) states.add(code);
      if (typeof u?.memberCount === 'number') members += u.memberCount;
    }
    return {
      clubs: universities.length,
      states: states.size,
      members,
    };
  }, [universities]);

  // Don't render the strip until we actually have data — avoids a flash of
  // zeroes on first paint and keeps the empty state clean.
  if (stats.clubs === 0) return null;

  return (
    <section
      aria-label="University map summary"
      className="mb-4 grid grid-cols-3 gap-3"
    >
      <StatTile
        emoji="🎓"
        value={stats.clubs}
        label={stats.clubs === 1 ? 'AI club' : 'AI clubs'}
      />
      <StatTile
        emoji="📍"
        value={stats.states}
        label={
          stats.states === 1
            ? 'state across the US'
            : 'states across the US'
        }
      />
      <StatTile
        emoji="👥"
        value={formatCompact(stats.members)}
        label={stats.members === 1 ? 'member' : 'members'}
      />
    </section>
  );
}

/**
 * Single stat tile. Uses the same glass + gradient accent language as the
 * map's pin card so the strip reads as part of the map module rather than
 * a separate widget.
 *
 * The emoji is wrapped in role="img" so screen readers announce the
 * accompanying `label` rather than the raw glyph.
 */
function StatTile({ emoji, value, label }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 glass shadow-card px-4 py-3 flex items-center gap-3">
      {/* Subtle gradient blob to add visual interest without competing
          with the actual numbers. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-gradient-primary opacity-10 blur-2xl"
      />
      <div
        role="img"
        aria-label={label}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-subtle text-xl leading-none select-none"
      >
        {emoji}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-semibold leading-none text-foreground">
          {value}
        </div>
        <div className="mt-1 text-xs text-muted-foreground truncate">
          {label}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact number formatter — 1234 → "1.2k", 12500 → "12.5k", 1500000 → "1.5M".
 * Keeps the hero numbers visually consistent across very different scales.
 */
function formatCompact(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
  if (Math.abs(n) < 1000) return String(n);
  try {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return String(n);
  }
}
