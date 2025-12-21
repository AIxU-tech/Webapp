/**
 * AddUniversityEntryPage Component
 *
 * Entry point for requesting to add a new university to AIxU.
 * Collects user's basic information (name, email) before starting
 * the verification process.
 *
 * Flow:
 * 1. User enters first name, last name, and .edu email
 * 2. On submit, navigates to /request-university with state
 * 3. Verification flow continues from there
 *
 * @component
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePageTitle } from '../hooks';
import { Alert, Divider } from '../components/ui';
import AuthFormLayout from '../components/AuthFormLayout';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';

/**
 * Validate that an email address is a .edu email
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid .edu email
 */
const isValidEduEmail = (email) => {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain?.endsWith('.edu');
};

export default function AddUniversityEntryPage() {
  const navigate = useNavigate();

  // Set page title
  usePageTitle('Add Your University');

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Handle form input changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handle form submission
   * Validates input and navigates to verification page
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.firstName.trim()) {
      setError('Please enter your first name');
      return;
    }

    if (!formData.lastName.trim()) {
      setError('Please enter your last name');
      return;
    }

    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Validate .edu email
    if (!isValidEduEmail(formData.email)) {
      setError('Please use your university .edu email address');
      return;
    }

    // Set loading briefly for UI feedback
    setLoading(true);

    // Navigate to verification page with form data
    navigate('/request-university', {
      state: {
        email: formData.email.trim().toLowerCase(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      },
    });
  };

  // Footer with navigation links
  const footer = (
    <>
      <Divider>or</Divider>

      {/* Registration link */}
      <div className="text-center">
        <p className="text-muted-foreground text-sm">
          Your university is already on AIxU?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>

      {/* Login link */}
      <div className="text-center mt-4">
        <p className="text-muted-foreground text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </>
  );

  return (
    <AuthFormLayout
      title="Add Your University"
      subtitle="Help us grow the AIxU community by requesting your school"
      error={error}
      footer={footer}
      cardRadius={0.38}
      maxWidth="max-w-lg"
    >
      {/* President requirement notice */}
      <Alert variant="warning" className="mb-6 text-center">
        You must be the president of your AI club to create a university page
      </Alert>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Name inputs (side by side) */}
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            type="text"
            name="firstName"
            placeholder="First name *"
            value={formData.firstName}
            onChange={handleChange}
            disabled={loading}
            required
          />
          <FormInput
            type="text"
            name="lastName"
            placeholder="Last name *"
            value={formData.lastName}
            onChange={handleChange}
            disabled={loading}
            required
          />
        </div>

        {/* Email input */}
        <FormInput
          type="email"
          name="email"
          placeholder="Your university .edu email *"
          value={formData.email}
          onChange={handleChange}
          disabled={loading}
          required
        />

        {/* Email verification info */}
        <Alert variant="info" className="text-center">
          We'll verify your email to confirm your university affiliation
        </Alert>

        {/* Submit button */}
        <FormButton
          type="submit"
          loading={loading}
          loadingText="Continuing..."
          className="mt-6"
        >
          Continue
        </FormButton>
      </form>
    </AuthFormLayout>
  );
}
