/**
 * RoleBadge Component
 *
 * Displays a color-coded badge for university roles.
 * Only shows for Executive and President roles (Members have no badge).
 *
 * @component
 *
 * @example
 * // Show executive badge
 * <RoleBadge role={1} />
 *
 * @example
 * // Show president badge
 * <RoleBadge role={2} />
 *
 * @example
 * // No badge for members (returns null)
 * <RoleBadge role={0} />
 */

import { CrownIcon, StarIcon } from '../icons';

// Role constants matching backend
const ROLES = {
  MEMBER: 0,
  EXECUTIVE: 1,
  PRESIDENT: 2,
};

export default function RoleBadge({ role, size = 'sm' }) {
  // Don't show badge for regular members
  if (role === ROLES.MEMBER || role === undefined || role === null) {
    return null;
  }

  // Size classes
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  // Role-specific styling
  const roleConfig = {
    [ROLES.EXECUTIVE]: {
      label: 'Executive',
      icon: <StarIcon className="w-3 h-3 mr-1" />,
      className: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
    },
    [ROLES.PRESIDENT]: {
      label: 'President',
      icon: <CrownIcon className="w-3 h-3 mr-1" />,
      className: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900',
    },
  };

  const config = roleConfig[role];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses[size] || sizeClasses.sm} ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

// Export role constants for use in other components
export { ROLES };
