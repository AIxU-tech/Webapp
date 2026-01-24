/**
 * RegisterFormContent Component
 *
 * The form fields for user registration. This component contains only
 * the form inputs and submit button - no layout wrapper or footer links.
 *
 * Used by both RegisterPage and RegisterModal with different wrappers
 * but identical form functionality.
 *
 * @component
 */

import FormInput from './FormInput';
import FormButton from './FormButton';
import NameInputPair from './NameInputPair';
import UniversityDetectionStatus from './UniversityDetectionStatus';

/**
 * RegisterFormContent Component
 *
 * @param {Object} props
 * @param {Object} props.formData - Form field values
 * @param {boolean} props.loading - Whether form is submitting
 * @param {boolean} props.loadingUniversities - Whether universities are loading
 * @param {Function} props.handleChange - Input change handler
 * @param {Function} props.handleSubmit - Form submit handler
 * @param {Object|null} props.detectedUniversity - Detected university from email
 * @param {boolean} props.isWhitelistedDomain - Whether email is whitelisted
 * @param {boolean} props.showUniversityStatus - Whether to show university status
 * @param {Function} props.handleRequestUniversity - Handler for requesting new university
 */
export default function RegisterFormContent({
  formData,
  loading,
  loadingUniversities,
  handleChange,
  handleSubmit,
  detectedUniversity,
  isWhitelistedDomain,
  showUniversityStatus,
  handleRequestUniversity,
}) {
  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Name inputs (side by side) */}
      <NameInputPair
        firstName={formData.firstName}
        lastName={formData.lastName}
        onChange={handleChange}
        disabled={loading}
      />

      {/* Email input */}
      <FormInput
        type="email"
        name="email"
        placeholder="Enter your .edu email *"
        value={formData.email}
        onChange={handleChange}
        disabled={loading}
        required
      />

      {/* University detection status */}
      {showUniversityStatus && (
        <UniversityDetectionStatus
          detectedUniversity={detectedUniversity}
          isWhitelisted={isWhitelistedDomain}
          onRequestUniversity={handleRequestUniversity}
        />
      )}

      {/* Password input */}
      <FormInput
        type="password"
        name="password"
        placeholder="Create a password (min 6 characters) *"
        value={formData.password}
        onChange={handleChange}
        disabled={loading}
        required
        minLength={6}
      />

      {/* Submit button */}
      <FormButton
        type="submit"
        disabled={loading || loadingUniversities}
        loading={loading}
        loadingText="Creating account..."
        className="w-full mt-6"
      >
        Create account
      </FormButton>
    </form>
  );
}

