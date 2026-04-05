/**
 * ResumeParsingBanner
 *
 * Shows a status banner while AI is parsing a resume to auto-fill profile data.
 * Displays different states: parsing (with spinner), error, or dismissible.
 */

import { SpinnerIcon, XIcon } from '../icons';

export default function ResumeParsingBanner({ status, error, onDismiss }) {
  if (!status || status === 'complete') return null;

  const isError = status === 'error';

  return (
    <div
      className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${
        isError
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-blue-50 border-blue-200 text-blue-800'
      }`}
    >
      {!isError && <SpinnerIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />}

      <p className="text-sm flex-1">
        {isError
          ? error || 'Something went wrong while parsing your resume.'
          : 'Parsing your resume to auto-fill your profile...'}
      </p>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded hover:bg-black/5 transition-colors cursor-pointer flex-shrink-0"
          aria-label="Dismiss"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
