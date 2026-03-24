/**
 * ResumeParsingBanner
 *
 * Displays a persistent banner on the profile page while resume
 * parsing is in progress. Shows a loading spinner and status text.
 * Automatically disappears when parsing completes or errors out.
 */

import { Card } from '../ui';

export default function ResumeParsingBanner({ status, error, onDismiss }) {
  if (!status || status === 'complete') return null;

  const isParsing = status === 'parsing';
  const isError = status === 'error';

  return (
    <Card padding="md" hover={false} className={isError ? 'border-destructive/30' : 'border-primary/30'}>
      <div className="flex items-center gap-3">
        {isParsing && (
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {isError && (
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-destructive">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {isParsing && 'Resume Parsing in Progress'}
            {isError && 'Resume Parsing Failed'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isParsing && 'Extracting your profile information from your resume...'}
            {isError && (error || 'Something went wrong while parsing your resume.')}
          </p>
        </div>
        {isError && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </Card>
  );
}
