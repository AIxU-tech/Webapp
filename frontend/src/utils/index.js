/**
 * Utilities Index
 *
 * Barrel export for utility functions.
 *
 * @example
 * import { getTimeAgo, formatFullDate } from '../utils';
 */

export { getTimeAgo, formatFullDate } from './time';

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
