/**
 * ResearchSection
 *
 * Displays research publications on the profile page.
 * Currently shows an empty state placeholder as the backend
 * doesn't yet support publication data.
 */

import ProfileSection from './ProfileSection';
import EmptyState from '../../ui/EmptyState';
import Badge from '../../ui/Badge';
import { SecondaryButton } from '../../ui';
import { PlusIcon } from '../../icons';

export default function ResearchSection({ publications = [], isOwnProfile, onAdd }) {
  const hasPublications = publications && publications.length > 0;
  const count = publications.length;

  // Add button shown for own profile
  const addAction = isOwnProfile && (
    <SecondaryButton
      variant="outline"
      onClick={onAdd}
      icon={<PlusIcon className="h-4 w-4" />}
      size="sm"
    >
      Add
    </SecondaryButton>
  );

  // Title with count badge
  const titleWithBadge = (
    <span className="flex items-center gap-2">
      Research & Publications
      {count > 0 && (
        <Badge variant="secondary" size="sm">
          {count}
        </Badge>
      )}
    </span>
  );

  return (
    <ProfileSection title={titleWithBadge} action={addAction}>
      {hasPublications ? (
        <div className="space-y-4">
          {publications.map((pub) => (
            <div key={pub.id}>{/* PublicationItem component */}</div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-secondary/30 rounded-xl">
          <p className="text-sm text-muted-foreground mb-3">
            {isOwnProfile ? 'Share your research papers and publications' : 'No publications yet'}
          </p>
          {isOwnProfile && (
            <SecondaryButton
              variant="outline"
              onClick={onAdd}
              icon={<PlusIcon className="h-4 w-4" />}
              size="sm"
            >
              Add publication
            </SecondaryButton>
          )}
        </div>
      )}
    </ProfileSection>
  );
}
