/**
 * LeadershipCard
 *
 * Sidebar card displaying club leadership (President and Executives).
 * Shows avatar, name, and role badge for each leader with View All option.
 */

import { Link } from 'react-router-dom';
import { Card, SecondaryButton, Avatar } from '../ui';
import RoleBadge, { ROLES } from '../RoleBadge';

export default function LeadershipCard({ members = [], onViewAll }) {
  // Filter to executives and presidents only, sorted by role (president first)
  const leaders = members
    .filter((m) => m.role >= ROLES.EXECUTIVE)
    .sort((a, b) => b.role - a.role);

  if (leaders.length === 0) {
    return (
      <Card padding="md">
        <h3 className="font-semibold text-foreground mb-3">Leadership</h3>
        <p className="text-sm text-muted-foreground">
          No leadership assigned yet.
        </p>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Leadership</h3>
        <SecondaryButton variant="ghost" size="sm" onClick={onViewAll}>
          View All
        </SecondaryButton>
      </div>

      <div className="space-y-3">
        {leaders.map((member) => (
          <Link
            key={member.id}
            to={`/users/${member.id}`}
            className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted transition-colors"
          >
            {/* Avatar */}
            <Avatar user={member} size="md" />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {member.name}
                </span>
                <RoleBadge role={member.role} size="xs" />
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {member.location || 'Location not set'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
