/**
 * UniversityMembersTab
 *
 * Displays all members of the university with their role badges.
 * Members are sorted by role (President > Executive > Member).
 */

import { Link } from 'react-router-dom';
import { Card, EmptyState } from '../ui';
import { UsersIcon } from '../icons';
import RoleBadge from '../RoleBadge';

// Default avatar for fallback
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face';

export default function UniversityMembersTab({ members = [] }) {
  if (members.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon className="h-12 w-12" />}
        title="No members yet"
        description="Be the first to join by registering with your university email!"
      />
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">
          All Members ({members.length})
        </h3>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <Link
            key={member.id}
            to={`/users/${member.id}`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
          >
            {/* Avatar */}
            <img
              src={member.avatar || DEFAULT_AVATAR}
              alt={member.name}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                e.target.src = DEFAULT_AVATAR;
              }}
            />

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
