/**
 * UniversityDetectionStatus Component
 *
 * Displays the university detection result based on the user's email.
 * Shows different states: detected, whitelisted, or not found.
 *
 * Used by both RegisterPage and RegisterModal to show university
 * auto-enrollment status based on .edu email domain.
 *
 * @component
 */

import { Alert } from './ui';

/**
 * UniversityDetectionStatus Component
 *
 * @param {Object} props
 * @param {Object|null} props.detectedUniversity - The detected university object
 * @param {boolean} props.isWhitelisted - Whether the email domain is whitelisted
 * @param {Function} props.onRequestUniversity - Handler for requesting to add a university
 */
export default function UniversityDetectionStatus({
  detectedUniversity,
  isWhitelisted,
  onRequestUniversity,
}) {
  // University successfully detected
  if (detectedUniversity) {
    return (
      <Alert variant="success" title="University detected">
        You will be enrolled in <strong>{detectedUniversity.name}</strong>
      </Alert>
    );
  }

  // Whitelisted domain (testing/special access)
  if (isWhitelisted) {
    return (
      <Alert variant="info" title="Whitelisted email detected">
        You can create an account without a university affiliation
      </Alert>
    );
  }

  // No matching university found
  return (
    <Alert variant="warning" title="University not found">
      No university matches your email domain.{' '}
      <button
        type="button"
        onClick={onRequestUniversity}
        className="font-medium underline text-amber-600 hover:text-amber-700"
      >
        Request to add your university
      </button>
    </Alert>
  );
}

