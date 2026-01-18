/**
 * Social Links Utility
 *
 * Provides URL parsing and platform detection for social media links.
 * Supports LinkedIn, X, Instagram, GitHub, Discord, YouTube,
 * and generic websites.
 */

/**
 * Known social platform types that allow only one entry.
 * Unknown types (including 'website') are treated as plain websites and allow multiple.
 */
export const KNOWN_SOCIAL_TYPES = new Set([
  'linkedin',
  'x',
  'instagram',
  'github',
  'discord',
  'youtube',
]);

/**
 * Platform detection patterns.
 * Order matters - more specific patterns should come first.
 */
const PLATFORM_PATTERNS = {
  linkedin: /linkedin\.com/i,
  x: /(twitter\.com|x\.com)/i,
  instagram: /instagram\.com/i,
  github: /github\.com/i,
  discord: /(discord\.gg|discord\.com)/i,
  youtube: /(youtube\.com|youtu\.be)/i,
};

/**
 * Platform display names for UI.
 */
const PLATFORM_NAMES = {
  linkedin: 'LinkedIn',
  x: 'X',
  instagram: 'Instagram',
  github: 'GitHub',
  discord: 'Discord',
  youtube: 'YouTube',
  website: 'Website',
};

/**
 * Platform colors for chip styling.
 */
export const PLATFORM_COLORS = {
  linkedin: 'bg-[#0077b5]/10 text-[#0077b5] border-[#0077b5]/20',
  x: 'bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700',
  instagram: 'bg-gradient-to-r from-[#833ab4]/10 via-[#fd1d1d]/10 to-[#fcb045]/10 text-[#c13584] border-[#c13584]/20',
  github: 'bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700',
  discord: 'bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/20',
  youtube: 'bg-[#FF0000]/10 text-[#FF0000] border-[#FF0000]/20',
  website: 'bg-primary/10 text-primary border-primary/20',
};

/**
 * Platform icon colors (text color only) for standalone icon display.
 */
export const PLATFORM_ICON_COLORS = {
  linkedin: 'text-[#0077b5]',
  x: 'text-neutral-800 dark:text-neutral-200',
  instagram: 'text-[#c13584]',
  github: 'text-neutral-800 dark:text-neutral-200',
  discord: 'text-[#5865F2]',
  youtube: 'text-[#FF0000]',
  website: 'text-primary',
};

/**
 * Truncate a URL for display in error messages.
 *
 * @param {string} url - The URL to truncate
 * @param {number} maxLength - Maximum length before truncating (default 30)
 * @returns {string} Truncated URL with "..." if needed
 */
function truncateForDisplay(url, maxLength = 30) {
  if (!url || url.length <= maxLength) return url;
  return url.slice(0, maxLength) + '...';
}

/**
 * Detect platform from URL.
 *
 * @param {string} url - The URL to analyze
 * @returns {string} Platform type (linkedin, x, etc., or 'website' as fallback)
 */
export function detectPlatform(url) {
  if (!url) return 'website';

  for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(url)) {
      return platform;
    }
  }

  return 'website';
}

/**
 * Check if a string is a valid URL with a proper domain format.
 *
 * @param {string} url - The URL to validate
 * @returns {{valid: boolean, error?: string}} Validation result with optional error message
 */
export function isValidUrl(url) {
  const displayUrl = truncateForDisplay(url);

  try {
    const parsed = new URL(url);

    // Must be http or https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: `"${displayUrl}" must use http or https` };
    }

    const hostname = parsed.hostname;

    // Hostname must contain at least one dot (e.g., example.com)
    if (!hostname.includes('.')) {
      return { valid: false, error: `"${displayUrl}" is not a valid URL - must include a domain (e.g., example.com)` };
    }

    // Hostname cannot start or end with a dot or hyphen
    if (/^[.-]|[.-]$/.test(hostname)) {
      return { valid: false, error: `"${displayUrl}" has an invalid domain format` };
    }

    // Each part of the hostname must be valid
    const parts = hostname.split('.');
    for (const part of parts) {
      if (part.length === 0) {
        return { valid: false, error: `"${displayUrl}" has an invalid domain format` };
      }
      if (!/^[a-zA-Z0-9-]+$/.test(part)) {
        return { valid: false, error: `"${displayUrl}" contains invalid characters in the domain` };
      }
      if (part.startsWith('-') || part.endsWith('-')) {
        return { valid: false, error: `"${displayUrl}" has an invalid domain format` };
      }
    }

    // TLD (last part) must be at least 2 characters and only letters
    const tld = parts[parts.length - 1];
    if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
      return { valid: false, error: `"${displayUrl}" must have a valid domain extension (e.g., .com, .org)` };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: `"${displayUrl}" is not a valid URL` };
  }
}

/**
 * Parse a URL string into a social link object.
 * Auto-prepends https:// if missing.
 *
 * @param {string} url - The URL string to parse
 * @returns {object} Result object with either {type, url} on success or {error} on failure
 */
export function parseSocialLink(url) {
  if (!url) return { error: 'Please enter a URL' };

  let processedUrl = url.trim();
  const originalInput = processedUrl;

  // Auto-prepend https:// if no protocol
  if (!processedUrl.match(/^https?:\/\//i)) {
    processedUrl = 'https://' + processedUrl;
  }

  // Validate the URL
  const validation = isValidUrl(processedUrl);
  if (!validation.valid) {
    // Use original input (truncated) in error message if we added the protocol
    if (originalInput !== processedUrl) {
      const truncatedOriginal = truncateForDisplay(originalInput);
      const truncatedProcessed = truncateForDisplay(processedUrl);
      return { error: validation.error.replace(truncatedProcessed, truncatedOriginal) };
    }
    return { error: validation.error };
  }

  return {
    type: detectPlatform(processedUrl),
    url: processedUrl,
  };
}

/**
 * Get display name for a platform type.
 *
 * @param {string} type - Platform type (linkedin, x, etc.)
 * @returns {string} Human-readable platform name
 */
export function getPlatformDisplayName(type) {
  return PLATFORM_NAMES[type] || 'Website';
}

/**
 * Get color classes for a platform type.
 *
 * @param {string} type - Platform type
 * @returns {string} Tailwind CSS classes for styling
 */
export function getPlatformColorClasses(type) {
  return PLATFORM_COLORS[type] || PLATFORM_COLORS.website;
}

/**
 * Check if a link already exists in the array (by URL).
 *
 * @param {array} links - Array of social link objects
 * @param {string} url - URL to check
 * @returns {boolean} True if URL already exists
 */
export function linkExists(links, url) {
  if (!links || !url) return false;

  const normalizedUrl = url.toLowerCase().trim();
  return links.some((link) => link.url.toLowerCase().trim() === normalizedUrl);
}

/**
 * Check if a known social type already exists in the links array.
 * Unknown types (including 'website') can appear multiple times.
 *
 * @param {array} links - Array of social link objects
 * @param {string} type - Type to check (should be normalized to lowercase)
 * @returns {boolean} True if the type already exists and it's a known social type
 */
export function knownSocialTypeExists(links, type) {
  if (!links || !type) return false;

  const normalizedType = type.toLowerCase().trim();
  
  // Only check for duplicates if it's a known social type
  if (!KNOWN_SOCIAL_TYPES.has(normalizedType)) {
    return false;
  }

  // Check if this type already exists in the links
  return links.some((link) => link.type && link.type.toLowerCase().trim() === normalizedType);
}

/**
 * Maximum number of social links allowed.
 */
export const MAX_SOCIAL_LINKS = 7;
