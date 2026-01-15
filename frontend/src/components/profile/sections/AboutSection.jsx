/**
 * AboutSection
 *
 * Displays the user's bio/about section with an empty state
 * for users who haven't added their bio yet.
 */

import ProfileSection from './ProfileSection';
import EmptyState from '../../ui/EmptyState';
import { IconButton } from '../../ui';
import { EditIcon } from '../../icons';

export default function AboutSection({ aboutText, isOwnProfile, onEdit }) {
  const hasContent = aboutText && aboutText.trim().length > 0;

  // Edit button shown for own profile
  const editAction = isOwnProfile && (
    <IconButton
      icon={EditIcon}
      onClick={onEdit}
      variant="ghost"
      size="sm"
      label="Edit about"
    />
  );

  return (
    <ProfileSection title="About" action={editAction}>
      {hasContent ? (
        <p className="text-sm text-foreground/70 whitespace-pre-wrap leading-relaxed">
          {aboutText}
        </p>
      ) : (
        <EmptyState
          title={isOwnProfile ? 'Share your story' : 'No bio yet'}
          description={
            isOwnProfile
              ? 'Tell others about yourself and your AI journey.'
              : 'This user hasn\'t added a bio yet.'
          }
          className="py-8"
        />
      )}
    </ProfileSection>
  );
}
