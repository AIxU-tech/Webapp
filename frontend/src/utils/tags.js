/**
 * Tag Constants and Utilities
 *
 * Centralized tag definitions for opportunities and other features.
 * Prevents duplication across components.
 */

/**
 * Location type tags (mutually exclusive)
 */
export const LOCATION_TAGS = ['Remote', 'Hybrid', 'On-site'];

/**
 * Compensation tags (mutually exclusive)
 */
export const COMPENSATION_TAGS = ['Paid', 'Unpaid'];

/**
 * Optional category tags for opportunities
 */
export const OPPORTUNITY_CATEGORY_TAGS = [
  'Research',
  'Internship',
  'Full-time',
  'Part-time',
  'Contract',
  'Volunteer',
];

/**
 * Check if a tag is a location tag
 * @param {string} tag - The tag to check
 * @returns {boolean}
 */
export function isLocationTag(tag) {
  return LOCATION_TAGS.includes(tag);
}

/**
 * Check if a tag is a compensation tag
 * @param {string} tag - The tag to check
 * @returns {boolean}
 */
export function isCompensationTag(tag) {
  return COMPENSATION_TAGS.includes(tag);
}

/**
 * Order tags with location first, then compensation, then others
 * @param {string[]} tags - Array of tags to order
 * @returns {string[]} Ordered array of tags
 */
export function orderOpportunityTags(tags) {
  if (!tags || !Array.isArray(tags)) return [];

  const locationTag = tags.find(tag => LOCATION_TAGS.includes(tag));
  const compensationTag = tags.find(tag => COMPENSATION_TAGS.includes(tag));
  const otherTags = tags.filter(
    tag => !LOCATION_TAGS.includes(tag) && !COMPENSATION_TAGS.includes(tag)
  );

  return [locationTag, compensationTag, ...otherTags].filter(Boolean);
}
