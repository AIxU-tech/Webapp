/**
 * ResetButton Component
 *
 * Small button for resetting images (profile picture, banners, logos) to their
 * default state. Shows a circular-arrow reset icon with a label.
 *
 * @param {function} onClick - Click handler
 * @param {string} children - Button label (e.g. "Reset Photo")
 * @param {boolean} disabled - Whether the button is disabled
 * @param {boolean} loading - Whether a reset is in progress
 * @param {string} title - Tooltip text
 * @param {string} className - Additional wrapper class names
 */

import { ResetIcon } from '../../icons';

export default function ResetButton({
  onClick,
  children,
  disabled = false,
  loading = false,
  title,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-foreground/80 hover:text-destructive border border-border hover:border-destructive/30 rounded-md transition-colors disabled:opacity-50 ${className}`}
    >
      <ResetIcon className="w-4 h-4" />
      {loading ? 'Resetting...' : children}
    </button>
  );
}
