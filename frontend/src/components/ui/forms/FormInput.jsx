/**
 * FormInput Component
 *
 * A reusable form input component with consistent styling for
 * authentication-style forms.
 *
 * Features:
 * - Supports text, email, password input types
 * - Consistent styling with muted background and focus ring
 * - Disabled state handling
 * - Required field support
 *
 * @component
 */

/**
 * FormInput Component
 *
 * @param {Object} props - Component props
 * @param {string} [props.type='text'] - Input type (text, email, password)
 * @param {string} props.name - Input name attribute
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.value - Input value
 * @param {function} props.onChange - Change handler
 * @param {boolean} [props.disabled=false] - Whether input is disabled
 * @param {boolean} [props.required=false] - Whether input is required
 * @param {number} [props.minLength] - Minimum length for input
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.autoComplete] - Autocomplete attribute
 * @returns {JSX.Element}
 */
export default function FormInput({
  type = 'text',
  id,
  name,
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  minLength,
  className = '',
  autoComplete,
}) {
  const baseClasses = `
    w-full px-4 py-3
    bg-background border border-border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
    text-foreground placeholder-muted-foreground
    disabled:opacity-50
  `.trim();

  return (
    <input
      type={type}
      id={id}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      minLength={minLength}
      autoComplete={autoComplete}
      className={`${baseClasses} ${className}`}
    />
  );
}
