/**
 * FormLabel Component
 *
 * Reusable label for form fields with optional required indicator.
 */
export default function FormLabel({
  children,
  required = false,
  htmlFor,
  className = '',
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-foreground mb-1 ${className}`}
    >
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}
