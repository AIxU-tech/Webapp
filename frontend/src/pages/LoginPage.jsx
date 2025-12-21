/**
 * LoginPage Component
 *
 * User login page with animated plasma background.
 * Allows users to log in with email and password.
 *
 * Features:
 * - Animated plasma background using Three.js
 * - Form validation
 * - Integration with Flask backend authentication
 * - Redirects to home page on successful login
 * - Error handling and display
 *
 * @component
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { login } from '../api/auth';
import { usePageTitle } from '../hooks';
import AuthFormLayout from '../components/AuthFormLayout';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';
import TermsLink from '../components/TermsLink';

export default function LoginPage() {
  /**
   * Component State
   *
   * - email: Input field value for email
   * - password: Input field value for password
   * - error: Error message to display (if any)
   * - loading: Whether form is currently submitting
   */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Hooks
   */
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  // Set browser tab title
  usePageTitle('Login');

  /**
   * Form Submission Handler
   *
   * Validates input, calls login API, updates auth context,
   * and redirects on success.
   *
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const response = await login(email.trim(), password.trim());
      loginUser(response.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Footer content with navigation links and legal text
  const footer = (
    <>
      {/* Register Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>

      {/* Legal Text */}
      <p className="text-xs text-muted-foreground mt-6 text-center leading-relaxed">
        By continuing, you agree to AIxU's{' '}
        <TermsLink />.
      </p>
    </>
  );

  return (
    <AuthFormLayout
      title="Your ideas, amplified"
      subtitle="Privacy-first AI community that helps you create in confidence."
      error={error}
      footer={footer}
      cardRadius={0.35}
    >
      {/* Login Form */}
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Email Input */}
        <FormInput
          type="email"
          name="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />

        {/* Password Input */}
        <FormInput
          type="password"
          name="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />

        {/* Submit Button */}
        <FormButton
          type="submit"
          loading={loading}
          loadingText="Logging in..."
        >
          Log in
        </FormButton>
      </form>
    </AuthFormLayout>
  );
}
