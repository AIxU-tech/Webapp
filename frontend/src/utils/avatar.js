/**
 * Avatar utility functions for consistent avatar URL resolution and initials generation
 */

/**
 * Gradient variants for avatar fallbacks
 * Each gradient aligns with the site's blue/purple/cyan aesthetic
 */
export const AVATAR_GRADIENTS = [
  // Original blue-cyan (primary)
  'from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)]',
  // Purple-blue
  'from-[hsl(262,83%,58%)] to-[hsl(220,85%,60%)]',
  // Blue-purple
  'from-[hsl(220,85%,60%)] to-[hsl(262,83%,58%)]',
  // Cyan-teal
  'from-[hsl(185,85%,55%)] to-[hsl(168,75%,50%)]',
  // Purple-magenta
  'from-[hsl(262,83%,58%)] to-[hsl(290,75%,55%)]',
  // Indigo-blue
  'from-[hsl(240,70%,58%)] to-[hsl(220,85%,60%)]',
];

/**
 * Generate a consistent hash from a string (user ID or name)
 * @param {string|number} value - Value to hash
 * @returns {number} - Hash value
 */
function hashString(value) {
  const str = String(value);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a consistent gradient class for a user based on their ID or name
 * @param {Object} user - User object with id, first_name, last_name
 * @param {string} [name] - Fallback name if no user object
 * @returns {string} - Tailwind gradient class string
 */
export function getAvatarGradient(user, name) {
  // Use user ID if available for most consistent results
  const hashValue = user?.id || name || 'default';
  const index = hashString(hashValue) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

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
