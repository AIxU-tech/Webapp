/**
 * UI Components Index
 *
 * Barrel export for reusable UI components.
 * Import from this file for cleaner imports.
 *
 * @example
 * import { BaseModal, EmptyState, Badge, TagSelector, GradientButton } from '../components/ui';
 *
 * Or import from subdirectories:
 * import { GradientButton, SecondaryButton } from '../components/ui/buttons';
 * import { Avatar, Badge, Tag } from '../components/ui/display';
 */

// =============================================================================
// Subdirectory Re-exports
// =============================================================================

// Buttons
export * from './buttons';

// Feedback (Alert, EmptyState, LoadingState, ErrorState)
export * from './feedback';

// Modals
export * from './modals';

// Forms
export * from './forms';

// Display (Avatar, Badge, Tag, Tooltip, Divider, StatItem)
export * from './display';

// Cards
export * from './cards';

// Images (BannerImage, BannerUploadModal, UniversityLogo)
export * from './images';

// Lists
export * from './lists';

// =============================================================================
// Additional Direct Exports (not yet in subdirectories)
// =============================================================================

// CreateNoteModal - will move to community/ feature
export { default as CreateNoteModal } from './CreateNoteModal';

// LikeButton - specialized button, may stay or move to community/
export { default as LikeButton } from './LikeButton';

// Layout helpers
export { default as SectionHeader } from './SectionHeader';
