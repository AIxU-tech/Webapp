/**
 * RegisterPage Component
 *
 * User registration page with animated plasma background and automatic
 * university enrollment based on .edu email domain.
 *
 * Features:
 * - Animated plasma background using Three.js
 * - All fields required for registration (email, password, name)
 * - Automatic university detection from .edu email domain
 * - Terms and conditions modal
 * - Form validation
 * - Integration with Flask backend for registration
 *
 * Auto-Enrollment:
 * Users are automatically enrolled in a university based on their .edu email
 * domain. For example, a user with "student@uoregon.edu" will be automatically
 * enrolled in the University of Oregon. No manual university selection is
 * needed or allowed.
 *
 * @component
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, getUniversities } from '../api';
import PlasmaBackground from '../components/PlasmaBackground';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';
import TermsLink from '../components/TermsLink';

// =============================================================================
// TEMPORARY: Whitelisted non-.edu domains for testing
// Remove this list when no longer needed (must match backend/utils/validation.py)
// =============================================================================
const WHITELISTED_DOMAINS = ['peekz.com'];
// =============================================================================

/**
 * Icon Components
 */
const BrainIcon = () => (
  <svg
    className="h-6 w-6 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

const InfoIcon = () => (
  <svg className="h-4 w-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export default function RegisterPage() {
  /**
   * Form State
   */
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });

  /**
   * UI State
   */
  const [universities, setUniversities] = useState([]);
  const [loadingUniversities, setLoadingUniversities] = useState(true);
  const [detectedUniversity, setDetectedUniversity] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  /**
   * Set Page Title and Load Universities
   */
  useEffect(() => {
    document.title = 'Sign Up - AIxU';

    async function fetchUniversities() {
      try {
        const data = await getUniversities();
        setUniversities(data);
      } catch (err) {
        console.error('Error loading universities:', err);
      } finally {
        setLoadingUniversities(false);
      }
    }

    fetchUniversities();
  }, []);

  /**
   * Extract Domain from .edu Email
   */
  const extractEduDomain = useCallback((email) => {
    if (!email || !email.includes('@')) return null;

    const parts = email.split('@');
    if (parts.length !== 2) return null;

    const domain = parts[1].toLowerCase();
    if (!domain.endsWith('.edu')) return null;

    return domain.slice(0, -4);
  }, []);

  /**
   * University Domain Lookup Map
   */
  const universityDomainMap = useMemo(() => {
    const map = new Map();
    universities.forEach((uni) => {
      if (uni.emailDomain) {
        map.set(uni.emailDomain.toLowerCase(), uni);
      }
    });
    return map;
  }, [universities]);

  /**
   * Find University by Email
   */
  const findUniversityByEmail = useCallback((email) => {
    const subdomain = extractEduDomain(email);
    if (!subdomain) return null;

    let uni = universityDomainMap.get(subdomain);
    if (uni) return uni;

    if (subdomain.includes('.')) {
      const baseDomain = subdomain.split('.').pop();
      uni = universityDomainMap.get(baseDomain);
      if (uni) return uni;
    }

    return null;
  }, [extractEduDomain, universityDomainMap]);

  /**
   * Re-detect University When Data Changes
   */
  useEffect(() => {
    if (formData.email && universityDomainMap.size > 0) {
      const university = findUniversityByEmail(formData.email);
      setDetectedUniversity(university);
    }
  }, [formData.email, universityDomainMap, findUniversityByEmail]);

  /**
   * Form Input Change Handler
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Check if Email is Valid .edu Email
   */
  const isValidEduEmail = useCallback((email) => {
    if (!email || !email.includes('@')) return false;
    const domain = email.split('@')[1]?.toLowerCase();
    return domain?.endsWith('.edu') || WHITELISTED_DOMAINS.includes(domain);
  }, []);

  /**
   * Form Submit Handler
   *
   * Uses native browser validation for required fields.
   * Only shows custom errors for business logic validation.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Business logic validation (not handled by native validation)
    if (!isValidEduEmail(formData.email)) {
      setError('Please use your university .edu email address');
      return;
    }

    const domain = formData.email.split('@')[1]?.toLowerCase();
    const isWhitelisted = WHITELISTED_DOMAINS.includes(domain);
    if (!detectedUniversity && !isWhitelisted) {
      setError('No university found for your email domain. Please contact support if you believe this is an error.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // All validation passed, proceed with registration
    setLoading(true);

    try {
      const registrationData = {
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      };

      const response = await register(registrationData);

      navigate('/verify-email', {
        replace: true,
        state: {
          email: response.email || formData.email,
          university: response.university || detectedUniversity
        }
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12 no-scrollbar">
      {/* Plasma Background */}
      <PlasmaBackground
        variant="fullscreen"
        radialWhitecast={true}
        cardRadius={0.4}
      />

      {/* Registration Form Container */}
      <div className="relative z-10 w-full max-w-lg px-6">
        {/* Registration Card */}
        <div className="bg-card border border-border rounded-xl shadow-card p-8">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mr-3">
                <BrainIcon />
              </div>
              <span className="text-2xl font-bold text-foreground">AIxU</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Join our community
            </h1>
            <p className="text-muted-foreground text-lg">
              Create your account and start connecting with AI enthusiasts from across the country
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Registration Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Name Inputs (Side by Side) */}
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

            {/* Email Input */}
            <FormInput
              type="email"
              name="email"
              placeholder="Enter your .edu email *"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              required
            />

            {/* University Detection Display */}
            {formData.email && isValidEduEmail(formData.email) && (() => {
              const emailDomain = formData.email.split('@')[1]?.toLowerCase();
              const isWhitelistedDomain = WHITELISTED_DOMAINS.includes(emailDomain);

              if (detectedUniversity) {
                return (
                  <div className="p-3 rounded-lg border bg-green-50 border-green-200">
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon />
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          University detected
                        </p>
                        <p className="text-sm text-green-700">
                          You will be enrolled in <strong>{detectedUniversity.name}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              } else if (isWhitelistedDomain) {
                return (
                  <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Whitelisted email detected
                        </p>
                        <p className="text-sm text-blue-700">
                          You can create an account without a university affiliation
                        </p>
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="p-3 rounded-lg border bg-amber-50 border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertCircleIcon />
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          University not found
                        </p>
                        <p className="text-sm text-amber-700">
                          No university matches your email domain.{' '}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
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
                                  lastName: formData.lastName
                                }
                              });
                            }}
                            className="text-amber-800 font-medium underline hover:text-amber-900"
                          >
                            Request to add your university
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
            })()}

            {/* Password Input */}
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

            {/* Create Account Button */}
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

          {/* Auto-Enrollment Note */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 text-center">
              <InfoIcon />
              Your university is automatically determined by your .edu email domain
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-3 text-sm text-muted-foreground">or</span>
            <div className="flex-1 border-t border-border"></div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {/* Legal Text */}
          <p className="text-xs text-muted-foreground mt-6 text-center leading-relaxed">
            By creating an account, you agree to AIxU's{' '}
            <TermsLink />.
          </p>
        </div>
      </div>
    </div>
  );
}
