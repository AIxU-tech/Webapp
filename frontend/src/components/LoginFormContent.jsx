/**
 * LoginFormContent Component
 *
 * The form fields for user login. This component contains only
 * the form inputs and submit button - no layout wrapper or footer links.
 *
 * Used by both LoginPage and LoginModal with different wrappers
 * but identical form functionality.
 *
 * @component
 */

import FormInput from './FormInput';
import FormButton from './FormButton';

/**
 * LoginFormContent Component
 *
 * @param {Object} props
 * @param {Object} props.formData - Form field values
 * @param {boolean} props.loading - Whether form is submitting
 * @param {Function} props.handleChange - Input change handler
 * @param {Function} props.handleSubmit - Form submit handler
 */
export default function LoginFormContent({
  formData,
  loading,
  handleChange,
  handleSubmit,
}) {
  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Email Input */}
      <FormInput
        type="email"
        name="email"
        placeholder="Enter your email"
        value={formData.email}
        onChange={handleChange}
        disabled={loading}
        required
      />

      {/* Password Input */}
      <FormInput
        type="password"
        name="password"
        placeholder="Enter your password"
        value={formData.password}
        onChange={handleChange}
        disabled={loading}
        required
      />

      {/* Submit Button */}
      <FormButton
        type="submit"
        loading={loading}
        loadingText="Logging in..."
        className="w-full"
      >
        Log in
      </FormButton>
    </form>
  );
}

