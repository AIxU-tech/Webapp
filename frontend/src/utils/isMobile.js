/**
 * Heuristic for phone/tablet-style UX (e.g. messages: show list first, not auto-open thread).
 */
export function isMobile() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const hasTouchScreen = navigator.maxTouchPoints > 0;
  const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
  const mobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  return hasTouchScreen && (isSmallScreen || mobileUA);
}
