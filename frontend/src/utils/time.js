/**
 * Time Formatting Utilities
 *
 * Provides consistent time formatting across the application.
 * Handles relative time (e.g., "5 minutes ago") and absolute dates.
 *
 * @module utils/time
 */

/**
 * Parse an API date string as UTC so it displays correctly in the user's local time.
 * ISO strings without 'Z' or offset are interpreted as local time by JS; we treat them as UTC.
 *
 * @param {string} dateString - ISO date string from API (may be naive, e.g. "2025-02-02T21:00:00")
 * @returns {Date} Date object (displays in user's local time via toLocaleTimeString etc.)
 */
export function parseUtcDate(dateString) {
  if (!dateString) return null;
  const s = String(dateString).trim();
  const hasOffset = s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s);
  return new Date(hasOffset ? s : s + 'Z');
}

/**
 * Format a date as relative time (e.g., "5 minutes ago", "Yesterday")
 *
 * Returns human-readable relative time for recent dates,
 * and formatted absolute dates for older ones.
 *
 * @param {string|Date} dateInput - ISO date string or Date object
 * @param {Object} [options] - Formatting options
 * @param {boolean} [options.includeYear=false] - Always include year in absolute dates
 * @returns {string} Formatted time string
 *
 * @example
 * getTimeAgo('2025-12-20T10:30:00Z') // "5 minutes ago"
 * getTimeAgo('2025-12-19T10:30:00Z') // "Yesterday"
 * getTimeAgo('2025-12-15T10:30:00Z') // "5 days ago"
 * getTimeAgo('2025-11-01T10:30:00Z') // "Nov 1"
 * getTimeAgo('2024-06-15T10:30:00Z') // "Jun 15, 2024"
 */
export function getTimeAgo(dateInput, options = {}) {
  if (!dateInput) return 'Unknown';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now - date;

  // Handle invalid dates
  if (isNaN(date.getTime())) return 'Unknown';

  // Calculate time differences
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Just now (less than 1 minute)
  if (diffMinutes < 1) {
    return 'Just now';
  }

  // Minutes ago (1-59 minutes)
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }

  // Hours ago (1-23 hours)
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  // Yesterday
  if (diffDays === 1) {
    return 'Yesterday';
  }

  // Days ago (2-6 days)
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Absolute date for older entries
  const isDifferentYear = date.getFullYear() !== now.getFullYear();
  const formatOptions = {
    month: 'short',
    day: 'numeric',
    ...(isDifferentYear || options.includeYear ? { year: 'numeric' } : {}),
  };

  return date.toLocaleDateString('en-US', formatOptions);
}

/**
 * Format a date as a full readable string
 *
 * @param {string|Date} dateInput - ISO date string or Date object
 * @returns {string} Formatted date string (e.g., "December 20, 2025")
 *
 * @example
 * formatFullDate('2025-12-20T10:30:00Z') // "December 20, 2025"
 */
/**
 * Format a date range for profile sections (education, experience, projects).
 *
 * @param {string|null} startDate - ISO date string (YYYY-MM-DD) or null
 * @param {string|null} endDate - ISO date string (YYYY-MM-DD) or null
 * @returns {string|null} Formatted range like "Jan 2023 — Present", or null if no startDate
 */
export function formatDateRange(startDate, endDate) {
  if (!startDate) return null;
  const fmt = (d) => {
    if (!d) return null;
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };
  const start = fmt(startDate);
  const end = endDate ? fmt(endDate) : 'Present';
  return start ? `${start} — ${end}` : null;
}

export function formatFullDate(dateInput) {
  if (!dateInput) return 'Unknown';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  if (isNaN(date.getTime())) return 'Unknown';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
