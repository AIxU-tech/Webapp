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
import { usePageTitle, useLoginForm } from '../hooks';
import { AuthFormLayout, LoginFormContent, TermsLink } from '../components/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  usePageTitle('Login');

  // Use shared login form hook
  const loginForm = useLoginForm({
    onSuccess: () => {
      navigate('/', { replace: true });
    },
  });

  // Footer content with navigation links and legal text
  const footer = (
    <>
      {/* Register Link - navigates to register PAGE */}
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
      error={loginForm.error}
      footer={footer}
      cardRadius={0.35}
    >
      <LoginFormContent {...loginForm} />
    </AuthFormLayout>
  );
}
