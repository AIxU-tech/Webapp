/**
 * URL Construction Utilities
 *
 * Centralized URL building helpers to avoid hardcoding paths in components.
 *
 * NOTE: Image URL helpers (getUserProfilePictureUrl, getUserBannerUrl,
 * getUniversityLogoUrl, getUniversityBannerUrl) have been removed.
 * Image URLs are now returned directly by the API as full GCS URLs.
 */

/**
 * Build an API endpoint URL
 * @param {string} path - The API path (without /api prefix)
 * @returns {string} The full API URL
 */
export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/api${cleanPath}`;
}
