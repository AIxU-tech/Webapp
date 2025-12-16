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

// Role constants matching backend
const ROLES = {
  MEMBER: 0,
  EXECUTIVE: 1,
  PRESIDENT: 2,
};

/**
 * Crown icon for President badge
 */
const CrownIcon = () => (
  <svg
    className="w-3 h-3 mr-1"
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M2 6l3 2 5-4 5 4 3-2-1 10H3L2 6z" />
  </svg>
);

/**
 * Star icon for Executive badge
 */
const StarIcon = () => (
  <svg
    className="w-3 h-3 mr-1"
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

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
      icon: <StarIcon />,
      className: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
    },
    [ROLES.PRESIDENT]: {
      label: 'President',
      icon: <CrownIcon />,
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
