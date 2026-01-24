/**
 * URL Construction Utilities
 *
 * Centralized URL building helpers to avoid hardcoding paths in components.
 */

/**
 * Build a user profile picture URL
 * @param {number|string} userId - The user ID
 * @returns {string} The profile picture URL
 */
export function getUserProfilePictureUrl(userId) {
  return `/user/${userId}/profile_picture`;
}

/**
 * Build a user banner image URL
 * @param {number|string} userId - The user ID
 * @returns {string} The banner image URL
 */
export function getUserBannerUrl(userId) {
  return `/user/${userId}/banner`;
}

/**
 * Build a university logo URL
 * @param {number|string} universityId - The university ID
 * @returns {string} The logo URL
 */
export function getUniversityLogoUrl(universityId) {
  return `/university/${universityId}/logo`;
}

/**
 * Build a university banner URL
 * @param {number|string} universityId - The university ID
 * @returns {string} The banner URL
 */
export function getUniversityBannerUrl(universityId) {
  return `/university/${universityId}/banner`;
}

/**
 * Build an API endpoint URL
 * @param {string} path - The API path (without /api prefix)
 * @returns {string} The full API URL
 */
export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/api${cleanPath}`;
}
