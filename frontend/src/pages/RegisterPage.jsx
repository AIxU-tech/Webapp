/**
 * RegisterPage Component
 *
 * User registration page with animated plasma background and automatic
 * university enrollment based on .edu email domain.
 *
 * Auto-Enrollment:
 * Users are automatically enrolled in a university based on their .edu email
 * domain. For example, a user with "student@uoregon.edu" will be automatically
 * enrolled in the University of Oregon.
 *
 * @component
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api';
import { useUniversities, usePageTitle, useForm } from '../hooks';
import AuthFormLayout from '../components/AuthFormLayout';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';
import NameInputPair from '../components/NameInputPair';
import TermsLink from '../components/TermsLink';
import { Alert, Divider } from '../components/ui';
import {
  extractEduSubdomain,
  isValidRegistrationEmail,
  isWhitelistedEmail,
} from '../utils/email';

/**
 * UniversityDetectionStatus Component
 *
 * Displays the university detection result based on the user's email.
 * Shows different states: detected, whitelisted, or not found.
 *
 * @param {Object} props
 * @param {Object|null} props.detectedUniversity - The detected university object
 * @param {boolean} props.isWhitelisted - Whether the email domain is whitelisted
 * @param {Function} props.onRequestUniversity - Handler for requesting to add a university
 */
function UniversityDetectionStatus({ detectedUniversity, isWhitelisted, onRequestUniversity }) {
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
        className="text-yellow-800 dark:text-yellow-200 font-medium underline hover:text-yellow-900 dark:hover:text-yellow-100"
      >
        Request to add your university
      </button>
    </Alert>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function RegisterPage() {
  // -------------------------------------------------------------------------
  // Hooks
  // -------------------------------------------------------------------------
  const navigate = useNavigate();
  usePageTitle('Sign Up');

  // Fetch universities with React Query (cached, auto-refetching)
  const { data: universities = [], isLoading: loadingUniversities } = useUniversities();

  // University detection state (updated when email changes)
  const [detectedUniversity, setDetectedUniversity] = useState(null);

  // Map of email domains to university objects for O(1) lookup
  const universityDomainMap = useMemo(() => {
    const map = new Map();
    universities.forEach((uni) => {
      if (uni.emailDomain) {
        map.set(uni.emailDomain.toLowerCase(), uni);
      }
    });
    return map;
  }, [universities]);

  // Find university by email (handles subdomains like cs.mit.edu -> mit)
  const findUniversityByEmail = useCallback((email) => {
    const subdomain = extractEduSubdomain(email);
    if (!subdomain) return null;

    let uni = universityDomainMap.get(subdomain);
    if (uni) return uni;

    // Try base domain for subdomains
    if (subdomain.includes('.')) {
      const baseDomain = subdomain.split('.').pop();
      uni = universityDomainMap.get(baseDomain);
      if (uni) return uni;
    }

    return null;
  }, [universityDomainMap]);

  // Form state management with useForm hook
  const {
    formData,
    error,
    setError,
    loading,
    handleChange,
    handleSubmit,
  } = useForm({
    initialValues: { email: '', password: '', firstName: '', lastName: '' },

    // Update university detection when email changes
    onFieldChange: (name, value) => {
      if (name === 'email' && universityDomainMap.size > 0) {
        setDetectedUniversity(findUniversityByEmail(value));
      }
    },

    // Validation before submission
    validate: (data) => {
      if (!isValidRegistrationEmail(data.email)) {
        return 'Please use your university .edu email address';
      }
      const isWhitelisted = isWhitelistedEmail(data.email);
      if (!detectedUniversity && !isWhitelisted) {
        return 'No university found for your email domain. Please contact support if you believe this is an error.';
      }
      if (data.password.length < 6) {
        return 'Password must be at least 6 characters';
      }
      return null;
    },

    // Submit registration
    onSubmit: async (data) => {
      const response = await register({
        email: data.email.trim(),
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      });

      navigate('/verify-email', {
        replace: true,
        state: {
          email: response.email || data.email,
          university: response.university || detectedUniversity,
        },
      });
    },
  });

  // Navigate to university request flow
  const handleRequestUniversity = () => {
    if (!formData.firstName.trim()) {
      setError('Please enter your first name');
      return;
    }
    if (!formData.lastName.trim()) {
      setError('Please enter your last name');
      return;
    }

    navigate('/request-university', {
      state: {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
      },
    });
  };

  // Derived State
  const isWhitelistedDomain = isWhitelistedEmail(formData.email);
  const showUniversityStatus = formData.email && isValidRegistrationEmail(formData.email);

  // -------------------------------------------------------------------------
  // Footer Content
  // -------------------------------------------------------------------------
  const footer = (
    <>
      {/* Auto-enrollment info note */}
      <Alert variant="info">
        Your university is automatically determined by your .edu email domain
      </Alert>

      {/* Divider */}
      <Divider className="my-6">or</Divider>

      {/* Login link */}
      <div className="text-center">
        <p className="text-muted-foreground text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>

      {/* Legal text */}
      <p className="text-xs text-muted-foreground mt-6 text-center leading-relaxed">
        By creating an account, you agree to AIxU's <TermsLink />.
      </p>
    </>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <AuthFormLayout
      title="Join our community"
      subtitle="Create your account and start connecting with AI enthusiasts from across the country"
      error={error}
      footer={footer}
      maxWidth="max-w-lg"
      cardRadius={0.4}
    >
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
          className="mt-6"
        >
          Create account
        </FormButton>
      </form>
    </AuthFormLayout>
  );
}
