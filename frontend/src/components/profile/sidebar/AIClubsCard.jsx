/**
 * AIClubsCard
 *
 * Displays the user's AI club membership with university icon.
 * Links to the university/club page when an ID is available.
 */

import { Link } from 'react-router-dom';
import { Card, EmptyState } from '../../ui';
import RoleBadge from '../../RoleBadge';
import { UniversitiesIcon, ExternalLinkIcon } from '../../icons';

// Club icon with gradient background
function ClubIcon() {
  return (
    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
      <UniversitiesIcon className="w-5 h-5 text-primary" />
    </div>
  );
}

export default function AIClubsCard({ universityName, universityId, role }) {
  const hasClub = universityName && universityName.trim().length > 0;

  // Content to display for the club
  const clubContent = (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
      <ClubIcon />

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">{universityName}</p>
        {role > 0 && (
          <div className="mt-1">
            <RoleBadge role={role} size="xs" />
          </div>
        )}
      </div>

      {universityId && (
        <ExternalLinkIcon className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </div>
  );

  return (
    <Card padding="md" hover={false}>
      <h3 className="font-semibold text-foreground mb-3">AI Clubs</h3>

      {hasClub ? (
        universityId ? (
          <Link to={`/universities/${universityId}`} className="block">
            {clubContent}
          </Link>
        ) : (
          clubContent
        )
      ) : (
        <EmptyState
          icon={<UniversitiesIcon className="h-8 w-8" />}
          title="No club membership"
          className="py-6"
        />
      )}
    </Card>
  );
}
