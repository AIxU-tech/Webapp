/**
 * ResetPasswordPage Component
 *
 * Allows users to reset their password using a token from the reset email link.
 * The user arrives here via a secure link sent in the password reset email.
 *
 * Features:
 * - Validates the reset token from URL query parameter
 * - Password and confirm password inputs
 * - Password validation (minimum 6 characters)
 * - Redirects to login page on success
 *
 * Security:
 * - Token is cryptographically secure (32-byte URL-safe token)
 * - Token expires after 1 hour
 * - Token is single-use (marked as used after reset)
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { usePageTitle } from '../hooks';
import { validateResetToken, resetPassword } from '../api/auth';
import { AlertTriangleIcon } from '../components/icons';
import AuthFormLayout from '../components/AuthFormLayout';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';
import LoadingState from '../components/ui/LoadingState';
import Alert from '../components/ui/Alert';
import GradientButton from '../components/ui/GradientButton';

/**
 * InvalidTokenMessage Component
 *
 * Displayed when the password reset token is invalid, expired, or already used.
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
        Password reset links expire after 1 hour. Please request a new one.
      </p>

      <GradientButton as={Link} to="/forgot-password">
        Request New Reset Link
      </GradientButton>

      <p className="text-sm text-muted-foreground mt-4">
        Remember your password?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  </div>
);

export default function ResetPasswordPage() {
  /**
   * URL Parameters
   * Token is passed via query string from the reset email link
   */
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  /**
   * Component State
   */
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  /**
   * Hooks
   */
  const navigate = useNavigate();

  // Set page title
  usePageTitle('Reset Password');

  /**
   * Validate Token on Mount
   * Checks if the token is valid and not expired
   */
  useEffect(() => {
    async function validateToken() {
      // If no token provided, show error immediately
      if (!token) {
        setTokenError('No token provided. Please use the link from your password reset email.');
        setLoading(false);
        return;
      }

      try {
        // Validate token
        await validateResetToken(token);
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
   * Resets the password using the validated token
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
      // Reset password
      await resetPassword(token, password);
      setSuccess(true);

      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading state while validating token
  if (loading) {
    return (
      <AuthFormLayout
        title="Reset Password"
        subtitle="Validating your reset link..."
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
        title="Reset Password"
        showLogo={true}
      >
        <InvalidTokenMessage error={tokenError} />
      </AuthFormLayout>
    );
  }

  // Show success message after password reset
  if (success) {
    return (
      <AuthFormLayout
        title="Password Reset Successful"
        subtitle="Redirecting to login..."
        showLogo={true}
      >
        <Alert variant="success" className="mb-4">
          Your password has been successfully reset. You will be redirected to the login page shortly.
        </Alert>
      </AuthFormLayout>
    );
  }

  // Footer content with login link
  const footer = (
    <div className="text-center">
      <p className="text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link to="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );

  return (
    <AuthFormLayout
      title="Reset Your Password"
      subtitle="Enter your new password below"
      error={error}
      footer={footer}
      maxWidth="max-w-md"
    >
      {/* Password Form */}
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Password Input */}
        <FormInput
          type="password"
          name="password"
          placeholder="Enter new password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          required
          minLength={6}
          autoComplete="new-password"
        />

        {/* Confirm Password Input */}
        <FormInput
          type="password"
          name="confirmPassword"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={submitting}
          required
          minLength={6}
          autoComplete="new-password"
        />

        {/* Submit Button */}
        <FormButton
          type="submit"
          loading={submitting}
          loadingText="Resetting password..."
        >
          Reset Password
        </FormButton>
      </form>
    </AuthFormLayout>
  );
}

