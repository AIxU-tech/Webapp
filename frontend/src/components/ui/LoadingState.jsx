/**
 * LoadingState Component
 *
 * Displays a loading spinner with optional text.
 * Used while fetching data or processing actions.
 *
 * @component
 *
 * @example
 * <LoadingState />
 *
 * @example
 * <LoadingState text="Loading universities..." />
 *
 * @example
 * // Full page loading
 * <LoadingState fullPage text="Please wait..." />
 */

export default function LoadingState({
  text = 'Loading...',
  fullPage = false,
  size = 'md',
  className = '',
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const spinnerSize = sizeClasses[size] || sizeClasses.md;

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Spinner */}
      <svg
        className={`animate-spin ${spinnerSize} text-primary`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>

      {/* Text */}
      {text && (
        <p className="mt-3 text-muted-foreground text-sm">
          {text}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="py-12">
      {content}
    </div>
  );
}
