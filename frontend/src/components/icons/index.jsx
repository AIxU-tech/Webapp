/**
 * Centralized Icon Library
 *
 * All SVG icons used throughout the application.
 * Import icons from this file to ensure consistency and reduce duplication.
 *
 * @example
 * import { SearchIcon, XIcon, HeartIcon, ICON_SIZES } from '../components/icons';
 *
 * // Use with default size (md)
 * <SearchIcon />
 *
 * // Use with named size
 * <SearchIcon size="lg" />
 *
 * // Override with className (takes precedence over size)
 * <SearchIcon className="h-12 w-12" />
 *
 * // Icons with variants
 * <HeartIcon filled={true} />
 */

// =============================================================================
// ICON SIZE CONSTANTS
// =============================================================================
export { ICON_SIZES } from './sizes';

// =============================================================================
// GENERAL UI ICONS
// =============================================================================
export {
  XIcon,
  SearchIcon,
  PlusIcon,
  CheckIcon,
  CopyIcon,
  EditIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  ResetIcon,
  RefreshIcon,
  ExternalLinkIcon,
  ArrowLeftIcon,
  UsersIcon,
  GlobeIcon,
  BuildingIcon,
  MapPinIcon,
  CalendarIcon,
  CalendarPlusIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SpinnerIcon,
  CodeIcon,
  BriefcaseIcon,
  SparklesIcon,
  QRCodeIcon,
  DownloadIcon,
  PhoneIcon,
} from './ui';

// =============================================================================
// SOCIAL / INTERACTION ICONS
// =============================================================================
export {
  HeartIcon,
  BookmarkIcon,
  ShareIcon,
  MessageCircleIcon,
  SendIcon,
} from './social';

// =============================================================================
// ALERT / STATUS ICONS
// =============================================================================
export {
  AlertCircleIcon,
  InfoIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from './alert';

// =============================================================================
// USER / PROFILE ICONS
// =============================================================================
export {
  LogOutIcon,
  CameraIcon,
  UploadIcon,
  ProfileIcon,
  CommunityIcon,
  MailIcon,
} from './user';

// =============================================================================
// DOCUMENT / CONTENT ICONS
// =============================================================================
export {
  FileTextIcon,
  NewspaperIcon,
  AcademicCapIcon,
  ActivityIcon,
} from './document';

// =============================================================================
// NAVIGATION ICONS
// =============================================================================
export {
  UniversitiesIcon,
  MessagesIcon,
  NotificationsIcon,
  NewsIcon,
  OpportunitiesIcon,
  SpeakersIcon,
  AdminIcon,
} from './navigation';

// =============================================================================
// BRAND ICONS
// =============================================================================
export { BrainCircuitIcon } from './brand';

// =============================================================================
// SOCIAL MEDIA ICONS
// =============================================================================
export {
  LinkedInIcon,
  XSocialIcon,
  InstagramIcon,
  GitHubIcon,
  DiscordIcon,
  YouTubeIcon,
  SocialIconMap,
  SocialLinkIcon,
} from './socialMedia';

// =============================================================================
// ROLE BADGE ICONS
// =============================================================================
export { CrownIcon, StarIcon } from './badge';

// =============================================================================
// ANIMATED ICONS
// =============================================================================
export { LoadingDotsIcon } from './animated';
