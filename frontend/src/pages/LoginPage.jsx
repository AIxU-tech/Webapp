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

import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { login } from '../api/auth';
import { usePageTitle, useForm } from '../hooks';
import AuthFormLayout from '../components/AuthFormLayout';
import FormInput from '../components/FormInput';
import FormButton from '../components/FormButton';
import TermsLink from '../components/TermsLink';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  usePageTitle('Login');

  const { formData, error, loading, handleChange, handleSubmit } = useForm({
    initialValues: { email: '', password: '' },

    onSubmit: async (data) => {
      const response = await login(data.email.trim(), data.password.trim());
      loginUser(response.user);
      navigate('/', { replace: true });
    },
  });

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
      {/* Forgot Password Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          <Link
            to="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
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
          value={formData.email}
          onChange={handleChange}
          disabled={loading}
          required
        />

        {/* Password Input */}
        <div className="space-y-2">
          <FormInput
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            required
          />
        </div>

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
