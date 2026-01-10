/**
 * ActivityStatsCard
 *
 * Displays user activity statistics (posts, connections) in bordered boxes.
 * Each stat shows an icon above the value for clear visual hierarchy.
 */

import Card from '../../ui/Card';
import { FileTextIcon, UsersIcon } from '../../icons';

// Individual stat in styled box
function StatItem({ icon: Icon, value, label, iconColor }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-xl bg-secondary/50">
      <Icon className={`h-5 w-5 mb-1 ${iconColor}`} />
      <span className="text-lg font-bold text-foreground">{value ?? 0}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default function ActivityStatsCard({ postCount, followerCount }) {
  return (
    <Card padding="md" hover={false}>
      <h3 className="font-semibold text-foreground mb-4">Activity</h3>
      <div className="grid grid-cols-2 gap-3">
        <StatItem icon={FileTextIcon} value={postCount} label="Posts" iconColor="text-primary" />
        <StatItem icon={UsersIcon} value={followerCount} label="Connections" iconColor="text-accent" />
      </div>
    </Card>
  );
}
