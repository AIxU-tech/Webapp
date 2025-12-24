/**
 * SectionHeader Component
 *
 * A reusable header for content sections with an icon badge, title, and subtitle.
 * Supports primary and secondary gradient themes for visual variety.
 *
 * @component
 *
 * @example
 * // Primary gradient (blue) - default
 * <SectionHeader
 *   icon={<NewspaperIcon />}
 *   title="Top Stories"
 *   subtitle="AI news from the past 24-48 hours"
 * />
 *
 * @example
 * // Secondary gradient (purple)
 * <SectionHeader
 *   icon={<AcademicCapIcon />}
 *   title="Research Papers"
 *   subtitle="Notable papers from the past week"
 *   variant="secondary"
 * />
 */

import { GRADIENT_PRIMARY, GRADIENT_SECONDARY } from '../../config/styles';

/**
 * Gradient configurations for each variant
 */
const VARIANT_GRADIENTS = {
  primary: GRADIENT_PRIMARY,
  secondary: GRADIENT_SECONDARY,
};

export default function SectionHeader({
  icon,
  title,
  subtitle,
  variant = 'primary',
  className = '',
}) {
  const gradientClass = VARIANT_GRADIENTS[variant] || VARIANT_GRADIENTS.primary;

  return (
    <div className={`flex items-center gap-3 mb-4 ${className}`}>
      {/* Icon badge with gradient background */}
      <div
        className={`w-10 h-10 ${gradientClass} rounded-xl flex items-center justify-center text-white`}
      >
        {icon}
      </div>

      {/* Title and subtitle */}
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
