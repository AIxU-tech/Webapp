/**
 * UniversityAboutTab
 *
 * Displays university description and detailed information in card format.
 * Presidents and site admins can edit the description inline.
 */

import { Card } from '../ui';
import UniversityAboutSection from './UniversityAboutSection';

export default function UniversityAboutTab({
  university,
  canEdit = false,
  onSaveDescription,
}) {
  const { description, location, memberCount = 0 } = university;

  return (
    <div className="space-y-6">
      {/* About Section - with inline editing for presidents/admins */}
      <UniversityAboutSection
        description={description}
        canEdit={canEdit}
        onSave={onSaveDescription}
      />

      {/* Details */}
      <Card padding="md">
        <h3 className="text-lg font-semibold text-foreground mb-4">Details</h3>
        <dl className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <dt className="text-muted-foreground font-medium min-w-[140px]">Location:</dt>
            <dd className="text-foreground">{location || 'Not specified'}</dd>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <dt className="text-muted-foreground font-medium min-w-[140px]">Total Members:</dt>
            <dd className="text-foreground">{memberCount}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
