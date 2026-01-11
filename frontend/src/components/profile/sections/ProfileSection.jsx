/**
 * ProfileSection
 *
 * Reusable wrapper component for profile page sections.
 * Provides consistent card styling with title, optional subtitle, and action button.
 */

import Card from '../../ui/Card';

export default function ProfileSection({
  title,
  subtitle,
  action,
  children,
  className = '',
}) {
  return (
    <Card padding="md" hover={false} className={className}>
      {/* Section header with title, subtitle, and action */}
      {title && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </Card>
  );
}
