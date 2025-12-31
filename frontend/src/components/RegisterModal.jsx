/**
 * RegisterModal Component
 *
 * Modal dialog for user registration.
 * Displays registration form with name, email, and password fields.
 *
 * Features:
 * - First name, last name, email, and password inputs
 * - University detection based on .edu email domain
 * - Form validation and error handling
 * - Link to login modal
 * - Closes modal on successful registration
 * - Uses BaseModal for backdrop blur and standard modal behaviors
 *
 * @component
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../api/auth';
import { useForm, useUniversities } from '../hooks';
import { BaseModal } from './ui';
import FormInput from './FormInput';
import FormButton from './FormButton';
import NameInputPair from './NameInputPair';
import TermsLink from './TermsLink';
import { Alert, Divider } from './ui';
import { BrainCircuitIcon } from './icons';
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
 */
function UniversityDetectionStatus({ detectedUniversity, isWhitelisted, onRequestUniversity }) {
  if (detectedUniversity) {
    return (
      <Alert variant="success" title="University detected">
        You will be enrolled in <strong>{detectedUniversity.name}</strong>
      </Alert>
    );
  }

  if (isWhitelisted) {
    return (
      <Alert variant="info" title="Whitelisted email detected">
        You can create an account without a university affiliation
      </Alert>
    );
  }

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

/**
 * RegisterModal Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onSwitchToLogin - Function to switch to login modal
 */
export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }) {
  const navigate = useNavigate();
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

      // After registration, user needs to verify email
      // Close modal - user can log in after verification
      onClose();
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

    // Close modal and navigate to request university page
    onClose();
    navigate('/request-university', {
      state: {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
      },
    });
  };

  // Derived state
  const isWhitelistedDomain = isWhitelistedEmail(formData.email);
  const showUniversityStatus = formData.email && isValidRegistrationEmail(formData.email);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      showCloseButton={true}
    >
      <div className="p-8">
        {/* Logo and header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[hsl(220,85%,60%)] to-[hsl(185,85%,55%)] rounded-xl flex items-center justify-center mr-3">
              <BrainCircuitIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">AIxU</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">
            Join our community
          </h2>
          <p className="text-muted-foreground text-sm">
            Create your account and start connecting
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <NameInputPair
            firstName={formData.firstName}
            lastName={formData.lastName}
            onChange={handleChange}
            disabled={loading}
          />

          <FormInput
            type="email"
            name="email"
            placeholder="Enter your .edu email *"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            required
          />

          {showUniversityStatus && (
            <UniversityDetectionStatus
              detectedUniversity={detectedUniversity}
              isWhitelisted={isWhitelistedDomain}
              onRequestUniversity={handleRequestUniversity}
            />
          )}

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

        {/* Footer links */}
        <div className="mt-6 space-y-4">
          <Alert variant="info">
            Your university is automatically determined by your .edu email domain
          </Alert>

          <Divider>or</Divider>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            By creating an account, you agree to AIxU's <TermsLink />.
          </p>
        </div>
      </div>
    </BaseModal>
  );
}

