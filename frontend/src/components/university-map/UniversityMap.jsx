/**
 * UniversityMap Component
 *
 * Interactive US map showing university AI clubs as pins, using react-simple-maps
 * with an Albers USA projection. Supports pan/zoom (mouse, touch, wheel) and
 * keyboard-accessible markers.
 *
 * Pins are inverse-scaled against the current zoom so they keep a constant
 * screen size regardless of how far the user has zoomed in. Universities
 * without valid coordinates are filtered out (the page surfaces them via
 * MapMissingCoordsBanner instead).
 *
 * Visual design:
 * - The base map uses a soft gradient fill with hairline borders.
 * - Pins are gradient-filled discs with a white ring + drop shadow.
 * - Active (hovered / selected) pins get a pulsing halo and a small lift.
 *
 * Geometry source: /maps/us-states-10m.json (us-atlas TopoJSON, shipped as
 * a static asset to avoid a CDN round-trip at runtime).
 *
 * Attribution: Nominatim's terms of service require crediting OpenStreetMap
 * when displaying their geocoding results. The credit is rendered at the
 * bottom-right of the map.
 */

import { useMemo, useState, useCallback } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';

// Resolve against Vite's configured base URL so this works in dev
// (served at the dev server) and in prod (served by Flask at /app/).
// vite.config.js sets base='/app/', so this becomes '/app/maps/us-states-10m.json'.
const GEO_URL = `${import.meta.env.BASE_URL}maps/us-states-10m.json`;

// Default zoom view state for the Albers USA projection. The projection
// already centers and scales for the contiguous US, so the initial zoom
// is 1 and the center is the projection's natural center.
const INITIAL_POSITION = { coordinates: [-96, 38], zoom: 1 };

// Base pin radius in screen pixels at zoom=1. Inverse-scaled with zoom so
// pins don't grow proportionally when the user zooms in.
const PIN_BASE_RADIUS = 6;
const PIN_HOVER_BOOST = 1.35;

// Sanity bounds — the AlbersUSA projection has a natural fit, so we keep
// the zoom range modest.
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

// SVG <defs> ids. Kept module-level so they're stable across renders and
// can be referenced from the Marker children.
const PIN_GRADIENT_ID = 'uniMapPinGradient';
const PIN_GRADIENT_ACTIVE_ID = 'uniMapPinGradientActive';
const PIN_SHADOW_ID = 'uniMapPinShadow';

export default function UniversityMap({
  universities = [],
  onPinClick,
  onPinHover,
  selectedId = null,
  hoveredId = null,
}) {
  // Only render markers for universities with valid coordinates.
  const visiblePins = useMemo(
    () =>
      universities.filter(
        (u) =>
          typeof u?.latitude === 'number' &&
          typeof u?.longitude === 'number' &&
          Number.isFinite(u.latitude) &&
          Number.isFinite(u.longitude),
      ),
    [universities],
  );

  // Track current zoom so we can inverse-scale markers.
  const [position, setPosition] = useState(INITIAL_POSITION);
  const handleMoveEnd = useCallback((pos) => setPosition(pos), []);

  // Inverse scale: a pin should look ~PIN_BASE_RADIUS pixels at any zoom.
  // react-simple-maps applies a uniform CSS transform with scale === zoom,
  // so dividing keeps screen size constant.
  const pinRadius = PIN_BASE_RADIUS / position.zoom;
  const pinStroke = 1.75 / position.zoom;

  // Build a payload helper used by both click and hover handlers. The point
  // is the page (viewport) coordinates of the marker — the parent translates
  // it into pin-card placement relative to the map container.
  const eventPoint = (event) => {
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    return rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : null;
  };

  const handleMarkerActivate = useCallback(
    (uni, event) => {
      if (!onPinClick) return;
      onPinClick(uni, eventPoint(event));
    },
    [onPinClick],
  );

  const handleMarkerEnter = useCallback(
    (uni, event) => {
      if (!onPinHover) return;
      onPinHover(uni, eventPoint(event));
    },
    [onPinHover],
  );

  const handleMarkerLeave = useCallback(() => {
    if (onPinHover) onPinHover(null, null);
  }, [onPinHover]);

  // Layered canvas background. Built from the brand palette so it picks up
  // the surrounding theme (light/dark) automatically:
  //   - Four radial gradients in the corners (primary / accent / tech-blue
  //     at low opacity) give the empty "ocean" some warmth and depth.
  //   - A repeating radial-gradient dot pattern adds a subtle techy texture
  //     that hints at the AI / data theme without competing for attention.
  // Defined as inline style rather than a Tailwind class so the multiple
  // background layers and per-layer sizes stay readable.
  const canvasBackground = {
    backgroundColor: 'hsl(var(--background))',
    backgroundImage: [
      'radial-gradient(at 12% 15%, hsl(var(--primary) / 0.18) 0px, transparent 45%)',
      'radial-gradient(at 88% 10%, hsl(var(--accent) / 0.14) 0px, transparent 50%)',
      'radial-gradient(at 80% 95%, hsl(var(--tech-blue) / 0.16) 0px, transparent 50%)',
      'radial-gradient(at 5% 88%, hsl(var(--primary) / 0.10) 0px, transparent 45%)',
      'radial-gradient(circle at center, hsl(var(--foreground) / 0.08) 1px, transparent 1.3px)',
    ].join(', '),
    backgroundSize: 'auto, auto, auto, auto, 22px 22px',
  };

  return (
    <div
      className="relative w-full h-full rounded-2xl border border-border overflow-hidden shadow-card"
      style={canvasBackground}
    >
      {/* Soft inner top highlight — makes the canvas feel like a surface
          rather than a flat fill. Sits above the background, below the SVG. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-background/60 to-transparent"
      />

      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1000 }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* SVG defs — gradients + drop shadow for the pins. Defined once
            and referenced from every Marker via url(#id). */}
        <defs>
          <radialGradient id={PIN_GRADIENT_ID} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="hsl(var(--tech-blue))" />
            <stop offset="60%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </radialGradient>
          <radialGradient id={PIN_GRADIENT_ACTIVE_ID} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="hsl(var(--tech-blue))" />
            <stop offset="55%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </radialGradient>
          <filter id={PIN_SHADOW_ID} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="0.6"
              stdDeviation="0.8"
              floodColor="hsl(220 60% 20%)"
              floodOpacity="0.35"
            />
          </filter>
        </defs>

        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onMoveEnd={handleMoveEnd}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    // States get a soft primary tint instead of plain grey,
                    // so they read as "land" against the colored canvas
                    // background while still staying in-brand. Borders use
                    // a stronger primary tint so each state is clearly
                    // delineated even on a busy background.
                    default: {
                      fill: 'hsl(var(--card) / 0.88)',
                      stroke: 'hsl(var(--primary) / 0.35)',
                      strokeWidth: 0.5,
                      outline: 'none',
                      transition: 'fill 200ms ease',
                    },
                    hover: {
                      fill: 'hsl(var(--primary) / 0.12)',
                      stroke: 'hsl(var(--primary) / 0.6)',
                      strokeWidth: 0.6,
                      outline: 'none',
                    },
                    pressed: {
                      fill: 'hsl(var(--primary) / 0.18)',
                      outline: 'none',
                    },
                  }}
                />
              ))
            }
          </Geographies>

          {visiblePins.map((uni) => {
            const isActive = uni.id === selectedId || uni.id === hoveredId;
            const radius = isActive ? pinRadius * PIN_HOVER_BOOST : pinRadius;
            return (
              <Marker
                key={uni.id}
                coordinates={[uni.longitude, uni.latitude]}
                onClick={(e) => handleMarkerActivate(uni, e)}
                onMouseEnter={(e) => handleMarkerEnter(uni, e)}
                onMouseLeave={handleMarkerLeave}
                onFocus={(e) => handleMarkerEnter(uni, e)}
                onBlur={handleMarkerLeave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleMarkerActivate(uni, e);
                  }
                }}
                tabIndex={0}
                aria-label={`View ${uni.clubName || uni.name}`}
                style={{
                  default: { outline: 'none', cursor: 'pointer' },
                  hover: { outline: 'none', cursor: 'pointer' },
                  pressed: { outline: 'none' },
                }}
              >
                {/* Active state: a soft, pulsing halo behind the pin. */}
                {isActive && (
                  <>
                    <circle
                      r={radius * 1.9}
                      fill="hsl(var(--primary))"
                      fillOpacity={0.18}
                      className="animate-pin-pulse"
                    />
                    <circle
                      r={radius * 1.4}
                      fill="hsl(var(--primary))"
                      fillOpacity={0.22}
                    />
                  </>
                )}

                {/* The pin itself — gradient disc + white ring + drop shadow. */}
                <circle
                  r={radius}
                  fill={`url(#${
                    isActive ? PIN_GRADIENT_ACTIVE_ID : PIN_GRADIENT_ID
                  })`}
                  stroke="hsl(var(--background))"
                  strokeWidth={pinStroke}
                  filter={`url(#${PIN_SHADOW_ID})`}
                  style={{ transition: 'r 150ms ease' }}
                />

                {/* Tiny highlight dot for a subtle "glossy" feel. Inverse
                    scaled so it stays crisp at any zoom level. */}
                <circle
                  cx={-radius * 0.3}
                  cy={-radius * 0.35}
                  r={radius * 0.22}
                  fill="hsl(var(--background))"
                  fillOpacity={0.65}
                  pointerEvents="none"
                />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Attribution — required by Nominatim TOS. */}
      <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/80 pointer-events-none select-none">
        Geocoding by{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="underline pointer-events-auto"
        >
          OpenStreetMap
        </a>{' '}
        / Nominatim
      </div>
    </div>
  );
}
