/**
 * UI Components Index
 *
 * Barrel export for reusable UI components.
 * Import from this file for cleaner imports.
 *
 * @example
 * import { BaseModal, EmptyState, Badge, TagSelector, GradientButton } from '../components/ui';
 */

// Modal & State Components
export { default as BaseModal } from './BaseModal';
export { default as EmptyState } from './EmptyState';
export { default as LoadingState } from './LoadingState';
export { default as ErrorState } from './ErrorState';
export { default as Alert } from './Alert';

// Button Components
export { default as GradientButton } from './GradientButton';
export { default as SecondaryButton } from './SecondaryButton';

// Layout Components
export { default as SectionHeader } from './SectionHeader';
export { default as CardSkeleton } from './CardSkeleton';

// Card Components
export { default as Card } from './Card';
export { default as StatCard } from './StatCard';
export { default as StatItem } from './StatItem';
export { default as UniversityCardSkeleton } from './UniversityCardSkeleton';

// Generic UI Components
export { default as Badge } from './Badge';
export { default as Divider } from './Divider';
export { default as Tag, ToggleTag, TagGroup, getTagVariant } from './Tag';
export { default as TagSelector } from './TagSelector';
export { default as Tooltip } from './Tooltip';
export { default as UserListItem } from './UserListItem';

// Feed Components
export { default as FeedCard } from './FeedCard';
export { default as FeedItemList } from './FeedItemList';
