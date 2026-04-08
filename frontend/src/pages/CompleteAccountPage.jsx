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
import { usePageTitle } from '../hooks';
import { validateAccountToken, completeAccount } from '../api/auth';
import { AlertTriangleIcon } from '../components/icons';
import { AuthFormLayout, TermsLink } from '../components/auth';
import { LoadingState, Divider, Alert, GradientButton, FormInput, FormButton } from '../components/ui';


/**
 * InvalidTokenMessage Component
 *
 * Displayed when the account creation token is invalid, expired, or already used.
 * Provides clear messaging and navigation options for the user.
 */
const InvalidTokenMessage = ({ error }) => (
  <div className="text-center py-8">
    {/* Warning icon */}
    <div className="flex justify-center mb-4">
      <AlertTriangleIcon className="h-12 w-12 text-red-500" />
    </div>

    {/* Error heading */}
    <h2 className="text-xl font-semibold text-foreground mb-2">
      Link Invalid or Expired
    </h2>

    {/* Error description */}
    <p className="text-muted-foreground mb-6">
      {error || 'This link is invalid, has expired, or has already been used.'}
    </p>

    {/* Action buttons and links */}
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        If you already created your account, you can log in below.
      </p>

      <GradientButton as={Link} to="/login">
        Go to Login
      </GradientButton>

      <p className="text-sm text-muted-foreground mt-4">
        Need a new account?{' '}
        <Link to="/register" className="text-primary hover:underline">
          Register here
        </Link>
      </p>
    </div>
  </div>
);

/**
 * InfoField Component
 *
 * Displays a read-only field with label and value.
 * Used to show pre-filled user information.
 */
const InfoField = ({ label, value }) => (
  <div className="p-3 rounded-lg border bg-muted border-border">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-foreground font-medium">{value}</p>
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

  // Set page title
  usePageTitle('Complete Your Account');

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
        <LoadingState size="lg" text="Validating your link..." />
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
        {/* Email verification status */}
        <Alert variant="success" title="Email verified">
          {userData.email}
        </Alert>

        {/* Pre-filled user information */}
        <InfoField label="Name" value={`${userData.firstName} ${userData.lastName}`} />
        <InfoField label="University" value={userData.universityName} />
      </div>

      {/* Section divider */}
      <Divider>Create your password</Divider>

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
