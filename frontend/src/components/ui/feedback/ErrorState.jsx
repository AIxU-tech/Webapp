/**
 * ErrorState Component
 *
 * Displays an error message with optional retry functionality.
 * Used when data fetching or operations fail.
 *
 * @component
 *
 * @example
 * <ErrorState message="Failed to load data" />
 *
 * @example
 * <ErrorState
 *   message="Network error occurred"
 *   onRetry={() => refetch()}
 * />
 *
 * @example
 * // Full page error
 * <ErrorState
 *   fullPage
 *   message="Something went wrong"
 *   onRetry={handleRetry}
 *   backLink={{ to: "/home", label: "Return home" }}
 * />
 */

import { Link } from 'react-router-dom';
import { AlertCircleIcon } from '../../icons';

export default function ErrorState({
  message = 'An error occurred',
  onRetry,
  backLink,
  fullPage = false,
  className = '',
}) {
  const content = (
    <div className={`text-center py-12 ${className}`}>
      {/* Icon */}
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
          <span className="text-red-600 dark:text-red-400"><AlertCircleIcon size="lg" /></span>
        </div>
      </div>

      {/* Message */}
      <p className="text-red-600 dark:text-red-400 mb-4">
        {message}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Try Again
          </button>
        )}

        {backLink && (
          <Link
            to={backLink.to}
            className="text-primary hover:underline"
          >
            {backLink.label}
          </Link>
        )}
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
