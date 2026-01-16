/**
 * FormButton Component
 *
 * A reusable button component with gradient styling and loading state
 * for authentication-style forms.
 *
 * Features:
 * - Gradient background matching AIxU brand
 * - Loading state with custom text
 * - Disabled state handling
 * - Hover shadow effect
 *
 * @component
 */

/**
 * FormButton Component
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {boolean} [props.loading=false] - Whether button is in loading state
 * @param {string} [props.loadingText] - Text to show when loading
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {string} [props.type='submit'] - Button type (submit, button)
 * @param {function} [props.onClick] - Click handler
 * @param {boolean} [props.fullWidth=true] - Whether button takes full width
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element}
 */
export default function FormButton({
  children,
  loading = false,
  loadingText,
  disabled = false,
  type = 'submit',
  onClick,
  fullWidth = true,
  className = '',
}) {
  const baseClasses = `
    bg-gradient-primary text-white
    px-6 py-3 rounded-lg font-semibold
    hover:shadow-hover transition-all duration-200
    disabled:opacity-50
  `.trim();

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${widthClass} ${className}`}
    >
      {loading ? (loadingText || 'Loading...') : children}
    </button>
  );
}
