/**
 * FormTextarea Component
 *
 * Reusable textarea with consistent styling, matching FormInput appearance.
 */
export default function FormTextarea({
  name,
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  rows = 4,
  className = '',
}) {
  const baseClasses = `
    w-full px-4 py-3
    bg-muted border border-border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
    text-foreground placeholder-muted-foreground
    disabled:opacity-50 disabled:cursor-not-allowed
    resize-none
  `.trim();

  return (
    <textarea
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      rows={rows}
      className={`${baseClasses} ${className}`}
    />
  );
}
