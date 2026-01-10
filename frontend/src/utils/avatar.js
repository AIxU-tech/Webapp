/**
 * Avatar utility functions for consistent avatar URL resolution and initials generation
 */

/**
 * Get the best available avatar URL from a user object
 * @param {Object} user - User object with potential avatar fields
 * @returns {string|null} - Avatar URL or null if none available
 */
export function getAvatarUrl(user) {
  if (!user) return null;
  return user.profile_picture_url || user.avatar_url || user.avatar || null;
}

/**
 * Generate initials from a user object
 * @param {Object} user - User object with first_name and last_name
 * @returns {string} - Uppercase initials (e.g., "JD") or "?" if unavailable
 */
export function getInitials(user) {
  if (!user) return '?';
  const first = user.first_name?.[0] || '';
  const last = user.last_name?.[0] || '';
  return (first + last).toUpperCase() || '?';
}

/**
 * Generate initials from a display name string
 * @param {string} name - Display name (e.g., "John Doe")
 * @returns {string} - Uppercase initials (e.g., "JD") or "?" if unavailable
 */
export function getInitialsFromName(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
