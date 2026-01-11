/**
 * SkillsCard
 *
 * Displays the user's skills as gradient-styled tags.
 * Shows an empty state when no skills are added.
 * Includes edit icon for own profile.
 */

import Card from '../../ui/Card';
import EmptyState from '../../ui/EmptyState';
import { IconButton } from '../../ui';
import { CodeIcon, EditIcon } from '../../icons';

export default function SkillsCard({ skills = [], isOwnProfile, onEdit }) {
  const hasSkills = skills && skills.length > 0;

  return (
    <Card padding="md" hover={false}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Skills</h3>
        {isOwnProfile && (
          <IconButton
            icon={EditIcon}
            onClick={onEdit}
            variant="ghost"
            size="sm"
            label="Edit skills"
          />
        )}
      </div>

      {hasSkills ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="px-3 py-1.5 text-sm bg-gradient-to-r from-primary/10 to-accent/10 text-foreground rounded-full hover:from-primary/20 hover:to-accent/20 transition-colors"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CodeIcon className="h-8 w-8" />}
          title={isOwnProfile ? 'Add your skills' : 'No skills listed'}
          description={
            isOwnProfile ? 'Showcase your technical abilities.' : undefined
          }
          className="py-6"
        />
      )}
    </Card>
  );
}
