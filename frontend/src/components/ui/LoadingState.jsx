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

import { SpinnerIcon } from '../icons';

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
      <SpinnerIcon className={`${spinnerSize} text-primary`} />

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
