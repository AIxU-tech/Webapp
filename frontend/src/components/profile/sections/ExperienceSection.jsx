/**
 * ExperienceSection
 *
 * Displays work experience and education on the profile page.
 * Currently shows an empty state placeholder as the backend
 * doesn't yet support experience data.
 */

import ProfileSection from './ProfileSection';
import { EmptyState, SecondaryButton } from '../../ui';
import { PlusIcon } from '../../icons';

export default function ExperienceSection({ experiences = [], isOwnProfile, onAdd }) {
  const hasExperiences = experiences && experiences.length > 0;

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

  return (
    <ProfileSection title="Experience" action={addAction}>
      {hasExperiences ? (
        <div className="space-y-4">
          {experiences.map((exp) => (
            <div key={exp.id}>{/* ExperienceItem component */}</div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-secondary/30 rounded-xl">
          <p className="text-sm text-muted-foreground mb-3">
            {isOwnProfile ? 'Add your work experience and education' : 'No experience listed'}
          </p>
          {isOwnProfile && (
            <SecondaryButton
              variant="outline"
              onClick={onAdd}
              icon={<PlusIcon className="h-4 w-4" />}
              size="sm"
            >
              Add experience
            </SecondaryButton>
          )}
        </div>
      )}
    </ProfileSection>
  );
}
