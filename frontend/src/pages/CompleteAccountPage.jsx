/**
 * CompleteAccountPage Component
 *
 * Allows users to complete their account setup after their university
 * request has been approved. The user arrives here via a secure link
 * sent in the approval email.
 *
 * Features:
 * - Validates the account creation token from URL
 * - Displays pre-filled user info (name, email, university)
 * - Only requires password input (email already verified)
 * - Creates account and logs user in on success
 *
 * Security:
 * - Token is cryptographically secure (256-bit)
 * - Token expires after 7 days
 * - Token is single-use (cleared after account creation)
 * - No email verification needed (was verified during request)
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { validateAccountToken, completeAccount } from '../api/auth';
import AuthFormLayout from '../components/AuthFormLayout';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';
import TermsLink from '../components/TermsLink';

/**
 * CheckCircleIcon - Success indicator
 */
const CheckCircleIcon = () => (
  <svg
    className="h-5 w-5 text-green-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

/**
 * AlertCircleIcon - Error/warning indicator
 */
const AlertCircleIcon = () => (
  <svg
    className="h-12 w-12 text-red-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

/**
 * LoadingSpinner - Shows while validating token
 */
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
    <p className="text-muted-foreground">Validating your link...</p>
  </div>
);

/**
 * InvalidTokenMessage - Displayed when token validation fails
 */
const InvalidTokenMessage = ({ error }) => (
  <div className="text-center py-8">
    <div className="flex justify-center mb-4">
      <AlertCircleIcon />
    </div>
    <h2 className="text-xl font-semibold text-foreground mb-2">
      Link Invalid or Expired
    </h2>
    <p className="text-muted-foreground mb-6">
      {error || 'This link is invalid, has expired, or has already been used.'}
    </p>
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        If you already created your account, you can log in below.
      </p>
      <Link
        to="/login"
        className="inline-block bg-gradient-primary text-white px-6 py-3 rounded-lg font-semibold hover:shadow-hover transition-all duration-200"
      >
        Go to Login
      </Link>
      <p className="text-sm text-muted-foreground mt-4">
        Need to submit a new university request?{' '}
        <Link to="/register" className="text-primary hover:underline">
          Register here
        </Link>
      </p>
    </div>
  </div>
);

export default function CompleteAccountPage() {
  /**
   * URL Parameters
   * Token is passed via query string from the approval email link
   */
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  /**
   * Component State
   */
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [userData, setUserData] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /**
   * Hooks
   */
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  /**
   * Set Page Title
   */
  useEffect(() => {
    document.title = 'Complete Your Account - AIxU';
  }, []);

  /**
   * Validate Token on Mount
   * Checks if the token is valid and retrieves associated user data
   */
  useEffect(() => {
    async function validateToken() {
      // If no token provided, show error immediately
      if (!token) {
        setTokenError('No token provided. Please use the link from your approval email.');
        setLoading(false);
        return;
      }

      try {
        // Validate token and get user data
        const data = await validateAccountToken(token);
        setUserData(data);
        setTokenValid(true);
      } catch (err) {
        setTokenError(err.message || 'This link is invalid, has expired, or has already been used.');
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [token]);

  /**
   * Form Submission Handler
   * Creates the account with the validated token and password
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);

    try {
      // Complete account creation
      const response = await completeAccount(token, password);

      // Update auth context with the new user
      loginUser(response.user);

      // Redirect to profile page
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading state while validating token
  if (loading) {
    return (
      <AuthFormLayout
        title="Complete Your Account"
        subtitle="Setting things up..."
        showLogo={true}
      >
        <LoadingSpinner />
      </AuthFormLayout>
    );
  }

  // Show error if token is invalid
  if (!tokenValid) {
    return (
      <AuthFormLayout
        title="Complete Your Account"
        showLogo={true}
      >
        <InvalidTokenMessage error={tokenError} />
      </AuthFormLayout>
    );
  }

  // Footer content with login link
  const footer = (
    <div className="text-center">
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );

  return (
    <AuthFormLayout
      title="Complete Your Account"
      subtitle={`Welcome to AIxU, ${userData.firstName}!`}
      error={error}
      footer={footer}
      maxWidth="max-w-md"
    >
      {/* User Info Display (Read-only) */}
      <div className="mb-6 space-y-3">
        {/* Email (verified) */}
        <div className="p-3 rounded-lg border bg-green-50 border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircleIcon />
            <div>
              <p className="text-sm font-medium text-green-800">
                Email verified
              </p>
              <p className="text-sm text-green-700">{userData.email}</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="p-3 rounded-lg border bg-muted border-border">
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="text-foreground font-medium">
            {userData.firstName} {userData.lastName}
          </p>
        </div>

        {/* University */}
        <div className="p-3 rounded-lg border bg-muted border-border">
          <p className="text-sm text-muted-foreground">University</p>
          <p className="text-foreground font-medium">{userData.universityName}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center my-6">
        <div className="flex-1 border-t border-border"></div>
        <span className="px-3 text-sm text-muted-foreground">
          Create your password
        </span>
        <div className="flex-1 border-t border-border"></div>
      </div>

      {/* Password Form */}
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Password Input */}
        <FormInput
          type="password"
          name="password"
          placeholder="Create a password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          required
          minLength={6}
        />

        {/* Confirm Password Input */}
        <FormInput
          type="password"
          name="confirmPassword"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={submitting}
          required
          minLength={6}
        />

        {/* Submit Button */}
        <FormButton
          type="submit"
          loading={submitting}
          loadingText="Creating account..."
        >
          Complete Account Setup
        </FormButton>
      </form>

      {/* Security Note */}
      <p className="text-xs text-muted-foreground mt-6 text-center leading-relaxed">
        By completing your account, you agree to AIxU's{' '}
        <TermsLink />.
      </p>
    </AuthFormLayout>
  );
}
