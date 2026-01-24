/**
 * FeatureCard Component
 *
 * Displays a feature highlight with icon, title, and description.
 * Includes group hover effects.
 */

import { Card } from '../ui';

export default function FeatureCard({ icon: Icon, title, description }) {
  return (
    <Card padding="lg" className="rounded-xl group">
      {/* Icon container with hover color transition */}
      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-6 group-hover:bg-academic-blue/10 transition-all duration-300">
        <Icon className="h-6 w-6 text-foreground group-hover:text-academic-blue transition-all duration-300" />
      </div>

      <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-academic-blue transition-all duration-300">
        {title}
      </h3>

      <p className="text-muted-foreground">{description}</p>
    </Card>
  );
}
