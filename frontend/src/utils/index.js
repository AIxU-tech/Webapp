/**
 * Utilities Index
 *
 * Barrel export for utility functions.
 *
 * @example
 * import { getTimeAgo, formatFullDate } from '../utils';
 * import { LOCATION_TAGS, orderOpportunityTags } from '../utils';
 */

export { getTimeAgo, formatFullDate, formatDateTime, formatDateRange } from './time';

export {
  IMAGE_CONFIG,
  cropImageToSquare,
  validateImageFile,
} from './image';

export {
  detectPlatform,
  isValidUrl,
  parseSocialLink,
  getPlatformDisplayName,
  getPlatformColorClasses,
  linkExists,
  PLATFORM_COLORS,
  MAX_SOCIAL_LINKS,
} from './socialLinks';

export { validateEmailFormat, validatePhoneFormat, formatUSPhone } from './validation';

// URL construction utilities
export { getApiUrl } from './url';

// Tag constants and utilities
export {
  LOCATION_TAGS,
  COMPENSATION_TAGS,
  OPPORTUNITY_CATEGORY_TAGS,
  isLocationTag,
  isCompensationTag,
  orderOpportunityTags,
} from './tags';
