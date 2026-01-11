/**
 * UniversityAboutTab
 *
 * Displays university description and detailed information in card format.
 */

import { Card } from '../ui';

export default function UniversityAboutTab({ university }) {
  const { description, location, memberCount = 0 } = university;

  return (
    <div className="space-y-6">
      {/* About Section */}
      <Card padding="md">
        <h3 className="text-lg font-semibold text-foreground mb-4">About</h3>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {description || 'No description available.'}
        </p>
      </Card>

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
