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
 * Features:
 * - Live university detection based on email domain
 * - Shows warning if university already exists
 *
 * @component
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePageTitle, useForm, useUniversities } from '../hooks';
import { Alert, Divider } from '../components/ui';
import AuthFormLayout from '../components/AuthFormLayout';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';
import NameInputPair from '../components/NameInputPair';
import { isEduEmail, extractEduSubdomain } from '../utils/email';

/**
 * UniversityExistsStatus Component
 *
 * Displays a warning if the user's email domain matches an existing university.
 * Encourages them to register instead if their university is already on the platform.
 */
function UniversityExistsStatus({ detectedUniversity }) {
  if (!detectedUniversity) {
    return null;
  }

  return (
    <Alert variant="error" title="University already exists">
      <strong>{detectedUniversity.name}</strong> has already been added to AIxU.{' '}
      <Link to="/register" className="font-medium underline text-red-600 hover:text-red-700">
        Sign up instead
      </Link>
    </Alert>
  );
}

export default function AddUniversityEntryPage() {
  const navigate = useNavigate();
  usePageTitle('Add Your University');

  // Fetch existing universities for detection
  const { data: universities = [], isLoading: loadingUniversities } = useUniversities();
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
  const findUniversityByEmail = useCallback(
    (email) => {
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
    },
    [universityDomainMap]
  );

  const { formData, error, loading, handleChange, handleSubmit } = useForm({
    initialValues: { firstName: '', lastName: '', email: '' },

    // Update university detection when email changes
    onFieldChange: (name, value) => {
      if (name === 'email' && universityDomainMap.size > 0) {
        setDetectedUniversity(findUniversityByEmail(value));
      }
    },

    validate: (data) => {
      if (!isEduEmail(data.email)) {
        return 'Please use your university .edu email address';
      }
      return null;
    },

    onSubmit: async (data) => {
      navigate('/request-university', {
        state: {
          email: data.email.trim().toLowerCase(),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
        },
      });
    },
  });

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
    </>
  );

  return (
    <AuthFormLayout
      title="Add Your University"
      subtitle="Help us grow the AIxU community by adding your school"
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
          placeholder="Your university .edu email *"
          value={formData.email}
          onChange={handleChange}
          disabled={loading || loadingUniversities}
          required
        />

        {/* Show university detection status */}
        {formData.email && isEduEmail(formData.email) && (
          <UniversityExistsStatus detectedUniversity={detectedUniversity} />
        )}

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
