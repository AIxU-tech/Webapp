/**
 * ProjectsSection
 *
 * Displays featured projects on the profile page.
 * Currently shows an empty state placeholder as the backend
 * doesn't yet support project data.
 */

import ProfileSection from './ProfileSection';
import EmptyState from '../../ui/EmptyState';
import { SecondaryButton } from '../../ui';
import { PlusIcon } from '../../icons';

export default function ProjectsSection({ projects = [], isOwnProfile, onAdd }) {
  const hasProjects = projects && projects.length > 0;

  // Add button shown for own profile
  const addAction = isOwnProfile && (
    <SecondaryButton
      variant="outline"
      onClick={onAdd}
      icon={<PlusIcon className="h-4 w-4" />}
      size="sm"
      className="rounded-full"
    >
      Add
    </SecondaryButton>
  );

  return (
    <ProfileSection
      title="Featured Projects"
      subtitle="Showcase your best work"
      action={addAction}
    >
      {hasProjects ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((project) => (
            <div key={project.id}>{/* ProjectCard component */}</div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-secondary/30 rounded-xl">
          <p className="text-sm text-muted-foreground mb-3">
            {isOwnProfile ? 'Showcase your AI projects here' : 'No projects yet'}
          </p>
          {isOwnProfile && (
            <SecondaryButton
              variant="outline"
              onClick={onAdd}
              icon={<PlusIcon className="h-4 w-4" />}
              size="sm"
              className="rounded-full"
            >
              Add your first project
            </SecondaryButton>
          )}
        </div>
      )}
    </ProfileSection>
  );
}
