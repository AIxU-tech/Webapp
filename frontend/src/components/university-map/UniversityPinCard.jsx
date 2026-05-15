/**
 * UniversityPinCard
 *
 * Floating popover anchored near a map pin. Positioned in container-relative
 * pixel space using a coordinate handed in by the parent (already translated
 * from the pin's screen position into the map wrapper's local frame).
 *
 * Simple flip logic: if the card would overflow the right edge of the wrapper,
 * anchor its right edge to the pin instead of the left edge; same for vertical.
 * Auto-flip relies on a measured ref so we don't need to hardcode a width.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SecondaryButton,
  UniversityLogo,
  CloseButton,
} from '../ui';
import { UsersIcon, CalendarIcon, MapPinIcon } from '../icons';

const PIN_OFFSET = 12; // gap between pin and card edge

export default function UniversityPinCard({
  university,
  containerRef,
  anchor, // { x, y } in container-relative pixels (pin center)
  onClose,
  // When `sticky` is false the card is a transient hover preview — we hide
  // the close button (the parent clears state on mouseleave) and route
  // pointer events through so hovering the card doesn't intercept the pin.
  sticky = true,
}) {
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const [placement, setPlacement] = useState({ left: 0, top: 0, ready: false });

  // Recompute placement whenever the anchor or container size changes.
  useLayoutEffect(() => {
    if (!anchor || !containerRef?.current || !cardRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const card = cardRef.current.getBoundingClientRect();

    // Default: place to the right of the pin, vertically centered.
    let left = anchor.x + PIN_OFFSET;
    let top = anchor.y - card.height / 2;

    // Flip horizontally if it overflows.
    if (left + card.width > container.width - 8) {
      left = anchor.x - card.width - PIN_OFFSET;
    }
    // Clamp horizontally so it doesn't go off-screen on a far-left pin.
    if (left < 8) left = 8;

    // Clamp vertically.
    if (top < 8) top = 8;
    if (top + card.height > container.height - 8) {
      top = container.height - card.height - 8;
    }

    // DOM measurement → state is the canonical pattern for tooltip-style
    // positioning; the rule's heuristic doesn't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlacement({ left, top, ready: true });
  }, [anchor, containerRef, university?.id]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!university || !anchor) return null;

  const clubLabel = university.clubName || `${university.name} AI Club`;
  const goToDetail = () => navigate(`/universities/${university.id}`);

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`${clubLabel} preview`}
      className="absolute z-20 w-72 overflow-hidden rounded-xl border border-border/70 glass shadow-hover animate-pop-in"
      style={{
        left: placement.left,
        top: placement.top,
        visibility: placement.ready ? 'visible' : 'hidden',
        // Non-sticky (hover preview) cards stay out of the way of the pin
        // hit area underneath. Sticky cards (post-click) keep normal events
        // so users can scroll, click "View club", or hit the close button.
        pointerEvents: sticky ? 'auto' : 'none',
      }}
    >
      {/* Gradient accent strip — gives the card a clear brand identity
          without overpowering the content. */}
      <div className="h-1 w-full bg-gradient-primary" />

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <UniversityLogo university={university} size="sm" shape="rounded" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{clubLabel}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {university.name}
            </p>
          </div>
          {sticky && (
            <CloseButton
              size="sm"
              variant="subtle"
              onClick={onClose}
              ariaLabel="Close preview"
            />
          )}
        </div>

        {university.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{university.location}</span>
          </div>
        )}

        {university.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {university.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span className="inline-flex items-center gap-1">
            <UsersIcon className="h-3.5 w-3.5" />
            {university.memberCount || 0} members
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="h-3.5 w-3.5" />
            {university.upcomingEvents || 0} upcoming
          </span>
        </div>

        <SecondaryButton
          onClick={goToDetail}
          variant="primary"
          size="sm"
          className="w-full"
        >
          View club →
        </SecondaryButton>
      </div>
    </div>
  );
}
