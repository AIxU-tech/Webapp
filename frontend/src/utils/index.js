/**
 * Utilities Index
 *
 * Barrel export for utility functions.
 *
 * @example
 * import { getTimeAgo, formatFullDate } from '../utils';
 * import { LOCATION_TAGS, orderOpportunityTags } from '../utils';
 * import { getUserBannerUrl, getUniversityLogoUrl } from '../utils';
 */

export { getTimeAgo, formatFullDate, formatDateRange } from './time';

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

// URL construction utilities
export {
  getUserProfilePictureUrl,
  getUserBannerUrl,
  getUniversityLogoUrl,
  getUniversityBannerUrl,
  getApiUrl,
} from './url';

// Tag constants and utilities
export {
  LOCATION_TAGS,
  COMPENSATION_TAGS,
  OPPORTUNITY_CATEGORY_TAGS,
  isLocationTag,
  isCompensationTag,
  orderOpportunityTags,
} from './tags';
