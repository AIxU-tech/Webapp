/**
 * RegisterPage Component
 *
 * User registration page with animated plasma background.
 * All fields (email, password, first name, last name, university) are required.
 *
 * Features:
 * - Animated plasma background using Three.js
 * - All fields required for registration
 * - University selection dropdown with API data
 * - Auto-detection of university from .edu email domain
 * - Terms and conditions modal
 * - Form validation
 * - Integration with Flask backend for registration
 *
 * @component
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, getUniversities } from '../api';
import PlasmaBackground from '../components/PlasmaBackground';

/**
 * Lucide Icon Components
 *
 * Inline SVG icons for UI elements.
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

const ChevronDownIcon = () => (
  <svg className="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const XIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function RegisterPage() {
  /**
   * Form State
   *
   * Stores all form field values.
   * All fields are required: email, password, firstName, lastName, universityId
   */
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    universityId: '',
  });

  /**
   * UI State
   *
   * - universities: List of universities loaded from API
   * - loadingUniversities: Whether universities are being fetched
   * - error: Error message to display
   * - loading: Whether form is currently submitting
   * - showTermsModal: Whether terms modal is visible
   * - termsAccepted: Whether user has checked the terms checkbox
   * - universityAutoDetected: Whether university was auto-selected from email domain
   */
  const [universities, setUniversities] = useState([]);
  const [loadingUniversities, setLoadingUniversities] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [universityAutoDetected, setUniversityAutoDetected] = useState(false);

  /**
   * Hooks
   */
  const navigate = useNavigate();

  /**
   * Set Page Title and Load Universities
   *
   * Runs once when component mounts.
   */
  useEffect(() => {
    document.title = 'Sign Up - AIxU';

    /**
     * Fetch Universities
     *
     * Loads list of universities for the dropdown.
     * Users can optionally select their university during registration.
     */
    async function fetchUniversities() {
      try {
        const data = await getUniversities();
        setUniversities(data);
      } catch (err) {
        console.error('Error loading universities:', err);
        // Don't show error to user - universities are optional
      } finally {
        setLoadingUniversities(false);
      }
    }

    fetchUniversities();
  }, []);

  /**
   * Extract Domain from .edu Email
   *
   * Extracts the institution identifier from a .edu email address.
   * For example: "user@stanford.edu" returns "stanford"
   *              "user@cs.mit.edu" returns "cs.mit"
   *
   * @param {string} email - The .edu email address to parse
   * @returns {string|null} The domain before .edu, or null if invalid
   */
  const extractEduDomain = useCallback((email) => {
    if (!email || !email.includes('@')) return null;

    const parts = email.split('@');
    if (parts.length !== 2) return null;

    const domain = parts[1].toLowerCase();
    if (!domain.endsWith('.edu')) return null;

    // Remove ".edu" suffix to get institution identifier
    return domain.slice(0, -4);
  }, []);

  /**
   * University Domain Lookup Map
   *
   * Maps email domains (lowercase) to university IDs for O(1) lookup.
   * Only includes universities with configured emailDomain field.
   */
  const universityDomainMap = useMemo(() => {
    const map = new Map();
    universities.forEach((uni) => {
      if (uni.emailDomain) {
        map.set(uni.emailDomain.toLowerCase(), uni.id);
      }
    });
    return map;
  }, [universities]);

  /**
   * Form Input Change Handler
   *
   * Updates form state when user types in any field.
   * For email changes, attempts to auto-detect and select matching university.
   *
   * @param {Event} e - Input change event
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Auto-detect university when email changes
    if (name === 'email') {
      const domain = extractEduDomain(value);
      if (domain) {
        const matchedId = universityDomainMap.get(domain);
        if (matchedId) {
          setFormData((prev) => ({
            ...prev,
            universityId: String(matchedId),
          }));
          setUniversityAutoDetected(true);
        }
      }
    }

    // Clear auto-detection flag if user manually changes university
    if (name === 'universityId') {
      setUniversityAutoDetected(false);
    }
  };

  /**
   * Create Account Button Click Handler
   *
   * Validates all required fields and shows terms modal.
   * Actual registration happens after user accepts terms.
   *
   * @param {Event} e - Click event
   */
  const handleCreateAccount = (e) => {
    e.preventDefault();

    // Clear any previous errors
    setError('');

    /**
     * Validate All Required Fields
     *
     * All fields are now required: email, password, first name, last name, university
     */
    if (!formData.email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!formData.firstName.trim()) {
      setError('Please enter your first name');
      return;
    }

    if (!formData.lastName.trim()) {
      setError('Please enter your last name');
      return;
    }

    if (!formData.universityId) {
      setError('Please select your university');
      return;
    }

    /**
     * Show Terms Modal
     *
     * User must accept terms before we submit registration.
     */
    setShowTermsModal(true);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  };

  /**
   * Close Terms Modal
   *
   * Hides the modal and resets acceptance checkbox.
   */
  const closeTermsModal = () => {
    setShowTermsModal(false);
    setTermsAccepted(false);
    // Restore body scroll
    document.body.style.overflow = '';
  };

  /**
   * Terms Accepted Handler
   *
   * Called when user clicks "Accept and Continue" in terms modal.
   * Submits registration to backend.
   */
  const handleTermsAccepted = async () => {
    if (!termsAccepted) return;

    // Close modal
    closeTermsModal();

    // Set loading state
    setLoading(true);

    try {
      /**
       * Prepare Registration Data
       *
       * Build request payload with all required fields.
       * All fields are required: email, password, firstName, lastName, universityId
       */
      const registrationData = {
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        universityId: parseInt(formData.universityId),
      };

      /**
       * Call Registration API
       *
       * Creates new user account on backend.
       * Backend stores registration data in session and sends verification email.
       */
      const response = await register(registrationData);

      /**
       * Redirect to Email Verification
       *
       * After successful registration, user needs to verify their email.
       * Backend has sent a verification code to their email.
       * Pass the email address to the verification page via state.
       */
      navigate('/verify-email', {
        replace: true,
        state: { email: response.email || formData.email }
      });

    } catch (err) {
      /**
       * Handle Registration Errors
       *
       * Common errors:
       * - Email already registered
       * - Invalid email format
       * - Network errors
       */
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Escape Key Handler
   *
   * Allow users to close modal by pressing Escape key.
   */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showTermsModal) {
        closeTermsModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showTermsModal]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12 no-scrollbar">
      {/*
        Plasma Background Component

        Animated gradient background with whitecast effect.
        Slightly larger cardRadius (0.4) to accommodate taller registration form.
      */}
      <PlasmaBackground
        variant="fullscreen"
        radialWhitecast={true}
        cardRadius={0.4}
      />

      {/*
        Registration Form Container
      */}
      <div className="relative z-10 w-full max-w-lg px-6">

        {/*
          Registration Card
        */}
        <div className="bg-card border border-border rounded-xl shadow-card p-8">

          {/*
            Logo and Header
          */}
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
              Create your account and start amplifying your ideas with privacy-first AI.
            </p>
          </div>

          {/*
            Error Message Display
          */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/*
            Registration Form

            All fields are required: email, password, name, university.
            University is auto-detected from .edu email domain when possible.
          */}
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>

            {/* All Fields Section - All Required */}
            <div className="space-y-4">

              {/* Name Inputs (Side by Side) */}
              <div className="grid grid-cols-2 gap-4">
                {/* First Name - Required */}
                <input
                  type="text"
                  name="firstName"
                  placeholder="First name *"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                />

                {/* Last Name - Required */}
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last name *"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Email Input - Required */}
              <input
                type="email"
                name="email"
                placeholder="Enter your .edu email *"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                required
                className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {/* Password Input - Required */}
              <input
                type="password"
                name="password"
                placeholder="Create a password (min 6 characters) *"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {/*
                University Dropdown - Required

                Populated with universities from API.
                Auto-selects when user enters a matching .edu email.
                Shows visual indicator when auto-detected.
              */}
              <div className="relative">
                <select
                  name="universityId"
                  value={formData.universityId}
                  onChange={handleChange}
                  disabled={loading || loadingUniversities}
                  required
                  className={`w-full px-4 py-3 bg-muted border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground disabled:opacity-50 disabled:cursor-not-allowed ${
                    universityAutoDetected
                      ? 'border-green-500 ring-1 ring-green-500'
                      : 'border-border'
                  }`}
                >
                  <option value="">
                    {loadingUniversities
                      ? 'Loading universities...'
                      : 'Select your university *'}
                  </option>
                  {universities.map((uni) => (
                    <option key={uni.id} value={uni.id}>
                      {uni.name}
                      {uni.location ? ` - ${uni.location}` : ''}
                    </option>
                  ))}
                </select>

                {/* Auto-detection indicator */}
                {universityAutoDetected && (
                  <p className="mt-1 text-xs text-green-600">
                    ✓ University detected from your email
                  </p>
                )}
              </div>
            </div>

            {/*
              Create Account Button

              Opens terms modal when clicked.
              Disabled during submission.
            */}
            <button
              type="button"
              onClick={handleCreateAccount}
              disabled={loading}
              className="w-full bg-gradient-primary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-hover transition-all duration-200 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          {/*
            Profile Completion Note

            Informs users they can add more details after registration.
          */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 text-center">
              <InfoIcon />
              After registration, you can add skills, interests, and a profile picture.
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-3 text-sm text-muted-foreground">or</span>
            <div className="flex-1 border-t border-border"></div>
          </div>

          {/*
            Login Link

            For users who already have an account.
          */}
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
            By creating an account, you agree to AIxU's Terms of Service and Privacy Policy.
          </p>

          {/* Learn More Button */}
          <div className="text-center mt-6">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center justify-center mx-auto"
              onClick={() => alert('Learn more functionality coming soon!')}
            >
              Learn more
              <ChevronDownIcon />
            </button>
          </div>
        </div>
      </div>

      {/*
        Terms and Conditions Modal

        Full-screen overlay with scrollable terms content.
        User must check acceptance box and click "Accept and Continue".
      */}
      {showTermsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            // Close modal if user clicks the backdrop (not the modal content)
            if (e.target === e.currentTarget) {
              closeTermsModal();
            }
          }}
        >
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-card border border-border rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">

              {/* Modal Header */}
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">
                  Terms and Conditions
                </h2>
                <button
                  onClick={closeTermsModal}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <XIcon />
                </button>
              </div>

              {/*
                Modal Content (Scrollable)

                Contains the full terms and conditions text.
                Scrollable independently of the header and footer.
              */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-4 text-sm text-foreground">
                  {/* Last Updated Date */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground">
                      Last updated: October 12, 2025
                    </p>
                    <p className="text-muted-foreground mt-2">
                      Welcome to AIxU Community ("we," "our," "us," or "AIxU"). By accessing
                      or using the Community site at https://aixu.tech/community (the "Site"),
                      you acknowledge that you have read, understood, and agree to be bound by
                      these Terms. If you do not agree to these Terms, you may not access or use
                      the Site or its services.
                    </p>
                  </div>

                  {/* Section 1: Eligibility & Registration */}
                  <h3 className="text-lg font-semibold">1. Eligibility & Registration</h3>
                  <p className="text-muted-foreground">
                    <strong>1.1 Eligibility.</strong>
                  </p>
                  <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                    <li>
                      You must be at least 18 years old (or of legal age in your jurisdiction)
                      and capable of entering into a binding agreement.
                    </li>
                    <li>
                      You must represent a recognized AI club or organization (e.g. at a
                      university) to register as an organizational member (if applicable).
                      Individual users may also participate under the rules described herein.
                    </li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    <strong>1.2 Account Creation.</strong>
                  </p>
                  <p className="text-muted-foreground">
                    To access certain features (sharing, posting, messaging), you must create an
                    account. You agree to provide accurate, current, and complete information. You
                    are responsible for maintaining confidentiality of your credentials and all
                    activity under your account.
                    </p>

                  {/* Additional sections abbreviated for brevity */}
                  <h3 className="text-lg font-semibold mt-4">2. Content & Posting</h3>
                  <p className="text-muted-foreground">
                    You may submit, post, upload, or otherwise make available content (notes,
                    tutorials, code, resources, messages). You grant AIxU a nonexclusive,
                    royalty-free, perpetual, worldwide license to use, copy, display, distribute,
                    adapt, and sublicense that content as needed to operate and promote the Site
                    and community.
                  </p>

                  <h3 className="text-lg font-semibold mt-4">3. Acceptable Use</h3>
                  <p className="text-muted-foreground">
                    You agree not to use the Site to violate any laws, reverse engineer the
                    software, submit harmful content, or engage in unauthorized commercial
                    activity.
                  </p>

                  <h3 className="text-lg font-semibold mt-4">4. Intellectual Property</h3>
                  <p className="text-muted-foreground">
                    All rights, title, and interest in the Site are the exclusive property of
                    AIxU or its licensors. "AIxU" and any logos are trademarks of AIxU.
                  </p>

                  <h3 className="text-lg font-semibold mt-4">5. Privacy & Data</h3>
                  <p className="text-muted-foreground">
                    Your use of the Site is governed by our Privacy Policy. We may collect
                    personal information (name, email, institution) as necessary for registration
                    and operation.
                  </p>

                  <h3 className="text-lg font-semibold mt-4">
                    6. Disclaimers & Limitations of Liability
                  </h3>
                  <p className="text-muted-foreground">
                    The Site is provided "as is" and "as available," without warranties of any
                    kind. AIxU and its affiliates will not be liable for indirect, incidental,
                    special, punitive, or consequential damages.
                  </p>

                  <h3 className="text-lg font-semibold mt-4">7. Termination</h3>
                  <p className="text-muted-foreground">
                    We may suspend or terminate your access at any time for violation of these
                    Terms or for any other reason in our discretion.
                  </p>
                </div>
              </div>

              {/*
                Modal Footer

                Contains acceptance checkbox and action buttons.
              */}
              <div className="p-6 border-t border-border">
                {/* Acceptance Checkbox */}
                <div className="flex items-start gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="accept-terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                  />
                  <label
                    htmlFor="accept-terms"
                    className="text-sm text-foreground cursor-pointer"
                  >
                    I have read and agree to the Terms and Conditions and Privacy Policy
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {/* Cancel Button */}
                  <button
                    type="button"
                    onClick={closeTermsModal}
                    className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>

                  {/*
                    Accept Button

                    Disabled until user checks the acceptance checkbox.
                    Triggers registration when clicked.
                  */}
                  <button
                    type="button"
                    onClick={handleTermsAccepted}
                    disabled={!termsAccepted}
                    className="flex-1 px-4 py-2 bg-gradient-primary text-white rounded-lg font-semibold hover:shadow-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Accept and Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
