/**
 * StatCard Component
 *
 * A card displaying a single statistic with value and label.
 */

import Card from './Card';

export default function StatCard({ value, label }) {
  return (
    <Card padding="sm" hover={false} className="text-center">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}
