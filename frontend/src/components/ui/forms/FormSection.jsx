/**
 * FormSection Component
 *
 * Groups related form fields under a titled section with a bottom border.
 */
export default function FormSection({ title, children, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}
